import { spawn } from 'child_process'
import { promises as fs, existsSync } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { getTournamentById, listTournamentParticipants, listRounds, listMatches, simpleSwissPairings, type Tournament, type TournamentParticipant, type Round, type Match, type User } from './db'
import { supabase } from './supabase'

/**
 * BBP Pairings integration harness.
 *
 * This module prepares TRF(bx) content, runs the BBP Pairings engine
 * AUM-style CLI (legacy JaVaFo-compatible), parses its output,
 * and inserts pairings into the database.
 *
 * Requirements:
 * - Install BBP Pairings binary and set env BBP_PAIRINGS_BIN to its path (or ensure it's on PATH).
 * - Program interface: AUM-style CLI used by BBP Pairings (legacy JaVaFo-compatible): <bin> input.trfx -p outfile.txt -l checklist.txt
 *
 * Reference: BBP Pairings implements Dutch and Burstein systems and extends TRF(x) to TRF(bx) for non-standard point systems.
 */

export interface BbpRunResult {
  pairs: Array<{ whitePos: number; blackPos: number | null }>
  rawOut?: string
  rawChecklist?: string
}

let lastBbpReason: string | undefined
export function getLastBbpReason(): string | undefined {
  return lastBbpReason
}

function resolveBbpBinary(): { ok: boolean; bin?: string; reason?: string } {
  const envBin = process.env.BBP_PAIRINGS_BIN
  const candidates: string[] = []

  // If env is provided, resolve it relative to the current working directory when not absolute
  if (envBin && envBin.trim().length > 0) {
    const candidate = path.isAbsolute(envBin) ? envBin : path.resolve(process.cwd(), envBin)
    candidates.push(candidate)
  }

  // Auto-discovery for common OS/arch inside project tree
  try {
    const platform = process.platform
    const arch = process.arch
    const projectRoot = process.cwd()
    const bbpDir = path.join(projectRoot, 'bin', 'bbp')

    if (platform === 'darwin') {
      const name = arch === 'arm64' ? 'bbpPairings-macos-arm64' : 'bbpPairings-macos-amd64'
      candidates.push(path.join(bbpDir, name))
    } else if (platform === 'linux') {
      const name = arch === 'arm64' ? 'bbpPairings-linux-arm64' : arch === 'x64' ? 'bbpPairings-linux-amd64' : 'bbpPairings'
      candidates.push(path.join(bbpDir, name))
    } else if (platform === 'win32') {
      candidates.push(path.join(bbpDir, 'bbpPairings.exe'))
    }
  } catch {}

  // Fallback to PATH name
  candidates.push('bbpPairings')

  for (const c of candidates) {
    // Don't try to existsSync for a bare PATH command name; let spawn handle it
    if (c === 'bbpPairings') continue
    try {
      if (existsSync(c)) {
        return { ok: true, bin: c }
      }
    } catch {}
  }

  // If env was provided but not found as a file, still return it (spawn will error if invalid)
  if (envBin && envBin.trim().length > 0) {
    const candidate = path.isAbsolute(envBin) ? envBin : path.resolve(process.cwd(), envBin)
    if (!existsSync(candidate)) {
      return { ok: false, reason: `BBP_PAIRINGS_BIN not found: ${candidate}` }
    }
    return { ok: true, bin: candidate }
  }

  // Last resort: rely on PATH
  return { ok: true, bin: 'bbpPairings' }
}

async function ensureFileDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true })
  } catch {}
}

function toOneDecimal(n: number | undefined | null): string {
  const v = Number(n ?? 0)
  return Number.isFinite(v) ? v.toFixed(1) : '0.0'
}

/**
 * Build TRF content tailored for BBP Pairings.
 *
 * Observed real BBP builds accept a minimal TRF like:
 *   012 <title>
 *   XXR <rounds>
 *   001 <id> <name> <rating>
 *
 * Avoid non-standard BB* lines and XXC which some builds reject (e.g., "Invalid line 'BBW 1.0'").
 */
async function buildBbpTrfx(
  tournament: Tournament,
  participants: Array<TournamentParticipant & { user: User }>,
  prevRounds: Round[],
  currentRoundNum: number,
): Promise<string> {
  const lines: string[] = []

  // Basic headers (keep minimal to maximize compatibility)
  const headerId = typeof tournament.id === 'number' ? String(tournament.id) : ''
  lines.push(`012 ${tournament.title}${headerId ? ' ' + headerId : ''}`)

  // Configure initial piece colors (required by some BBP builds)
  lines.push(`XXC white1`)

  // Expected total rounds
  const totalRounds = Number(tournament.rounds || 0)
  if (Number.isFinite(totalRounds) && totalRounds > 0) {
    lines.push(`XXR ${totalRounds}`)
  }

  // Helper for a minimal 001 line similar to bin/bbp/min.trfx
  function sanitizeName(s: string): string {
    return (s || '').replace(/\s+/g, ' ').trim()
  }
  function make001Line(id: number, name: string, rating?: number | null, score = 0): string {
    const idStr = String(id)
    const nameStr = sanitizeName(name).slice(0, 30)
    const padName = nameStr.padEnd(30, ' ')
    const ratingValRaw = (rating !== null && rating !== undefined) ? Number(rating) : 1500
    const ratingVal = Math.max(0, Math.min(9999, Math.round(ratingValRaw)))
    const ratingStr = String(ratingVal).padStart(4, ' ')
    const scoreStr = toOneDecimal(score).padStart(4, ' ')
    const gapBetweenRatingAndScore = 29 // mimic bin/bbp/min2.trfx
    // Pattern close to min2.trfx: 001 + 4 spaces + id + 6 spaces + name(30) + rating(4) + GAP(29) + score(4) + 4 spaces + starting rank(id)
    return `001    ${idStr}      ${padName}${ratingStr}${' '.repeat(gapBetweenRatingAndScore)}${scoreStr}    ${idStr}`
  }

  // Pre-compute scores from previous rounds (not printed in minimal 001 lines, but used later if we extend TRF)
  const prevIds = (prevRounds || [])
    .filter(r => (r.number || 0) < currentRoundNum)
    .map(r => r.id!)
  const pointsByParticipant = new Map<number, number>()
  for (const p of participants) pointsByParticipant.set(p.id!, 0)

  for (const rid of prevIds) {
    const matches = await listMatches(rid)
    for (const m of matches) {
      if (typeof m.white_participant_id === 'number') {
        pointsByParticipant.set(
          m.white_participant_id,
          (pointsByParticipant.get(m.white_participant_id) || 0) + (m.score_white || 0)
        )
      }
      if (typeof m.black_participant_id === 'number') {
        pointsByParticipant.set(
          m.black_participant_id,
          (pointsByParticipant.get(m.black_participant_id) || 0) + (m.score_black || 0)
        )
      }
    }
  }

  // Players: use position order as IDs, include nickname or user full name
  let pos = 1
  for (const p of participants) {
    const rating = p.user?.fide_rating ?? null
    const name = p.nickname || `${p.user?.first_name || ''} ${p.user?.last_name || ''}`.trim() || (p.user?.username || `Player${pos}`)
    const score = pointsByParticipant.get(p.id!) || 0
    lines.push(make001Line(pos, name, rating, score))
    pos += 1
  }

  return lines.join('\n') + '\n'
}

/**
 * Parse BBP pairing output using common patterns used by BBP Pairings (legacy JaVaFo-compatible).
 */
function parseBbpOutFile(outText: string): BbpRunResult {
  const pairs: Array<{ whitePos: number; blackPos: number | null }> = []

  const lines = outText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  for (const line of lines) {
    let m: RegExpMatchArray | null = null
    // Board N: X - Y
    m = line.match(/^Board\s+(\d+)\s*:\s*(\d+)\s*-\s*(\d+)$/i)
    if (m) {
      const wp = Number(m[2])
      const bp = Number(m[3])
      if (Number.isFinite(wp) && Number.isFinite(bp)) {
        pairs.push({ whitePos: wp, blackPos: bp })
        continue
      }
    }
    // Board N: X - BYE
    m = line.match(/^Board\s+(\d+)\s*:\s*(\d+)\s*-\s*BYE$/i)
    if (m) {
      const wp = Number(m[2])
      if (Number.isFinite(wp)) {
        pairs.push({ whitePos: wp, blackPos: null })
        continue
      }
    }
    // Board N: BYE - X (treat as X vs BYE)
    m = line.match(/^Board\s+(\d+)\s*:\s*BYE\s*-\s*(\d+)$/i)
    if (m) {
      const wp = Number(m[2])
      if (Number.isFinite(wp)) {
        pairs.push({ whitePos: wp, blackPos: null })
        continue
      }
    }
    // X vs Y
    m = line.match(/^(\d+)\s+vs\s+(\d+)$/i)
    if (m) {
      const wp = Number(m[1])
      const bp = Number(m[2])
      if (Number.isFinite(wp) && Number.isFinite(bp)) {
        pairs.push({ whitePos: wp, blackPos: bp })
        continue
      }
    }
    // X vs BYE
    m = line.match(/^(\d+)\s+vs\s+BYE$/i)
    if (m) {
      const wp = Number(m[1])
      if (Number.isFinite(wp)) {
        pairs.push({ whitePos: wp, blackPos: null })
        continue
      }
    }
    // BYE vs X (treat as X vs BYE)
    m = line.match(/^BYE\s+vs\s+(\d+)$/i)
    if (m) {
      const wp = Number(m[1])
      if (Number.isFinite(wp)) {
        pairs.push({ whitePos: wp, blackPos: null })
        continue
      }
    }
    // X Y
    m = line.match(/^(\d+)\s+(\d+)$/)
    if (m) {
      const wp = Number(m[1])
      const bp = Number(m[2])
      if (Number.isFinite(wp) && Number.isFinite(bp)) {
        pairs.push({ whitePos: wp, blackPos: bp })
        continue
      }
    }
    // X BYE
    m = line.match(/^(\d+)\s+BYE$/i)
    if (m) {
      const wp = Number(m[1])
      if (Number.isFinite(wp)) {
        pairs.push({ whitePos: wp, blackPos: null })
        continue
      }
    }
  }

  return { pairs, rawOut: outText }
}

async function runBbpBinary(trfPath: string, outPath: string, listPath: string, binPath: string, systemFlag: '--dutch' | '--burstein', timeoutMs: number): Promise<{ outText: string; listText?: string }> {
  return new Promise((resolve, reject) => {
    const args = [systemFlag, trfPath, '-p', outPath, '-l', listPath]
    const child = spawn(binPath, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let killed = false
    const timer = setTimeout(() => {
      killed = true
      try { child.kill('SIGKILL') } catch {}
      reject(new Error(`Timeout after ${timeoutMs}ms`))
    }, timeoutMs)

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => { stdout += String(d) })
    child.stderr.on('data', (d) => { stderr += String(d) })

    child.on('error', (err) => {
      const wd = path.dirname(trfPath)
      clearTimeout(timer)
      reject(new Error(`Failed to start bbpPairings process: ${err.message}\nworkDir=${wd}\ntrfPath=${trfPath}`))
    })

    child.on('close', async (code) => {
      clearTimeout(timer)
      try {
        const outText = await fs.readFile(outPath, 'utf-8').catch(() => '')
        const listText = await fs.readFile(listPath, 'utf-8').catch(() => undefined)
        if (killed) return
        if (code !== 0) {
          const wd = path.dirname(trfPath)
          const sTop = stdout.slice(0, 500)
          const eTop = stderr.slice(0, 500)
          const msg = `bbpPairings exited with code ${code}.\nworkDir=${wd}\ntrfPath=${trfPath}\noutPath=${outPath}\nlistPath=${listPath}\nstderr(top500):\n${eTop}\nstdout(top500):\n${sTop}`
          reject(new Error(msg + `\noutFileReadable=${outText.length > 0}`))
          return
        }
        resolve({ outText, listText })
      } catch (readErr: unknown) {
        const message = readErr instanceof Error ? readErr.message : String(readErr)
        const wd = path.dirname(trfPath)
        reject(new Error(`bbpPairings finished but reading output failed: ${message}\nworkDir=${wd}\ntrfPath=${trfPath}`))
      }
    })
  })
}

/**
 * Attempt to generate pairings with BBP Pairings and insert them into DB.
 * Returns inserted Match[] on success, or null on failure.
 */
export async function generatePairingsWithBBP(tournamentId: number, roundId: number): Promise<Match[] | null> {
  lastBbpReason = undefined
  const cfg = resolveBbpBinary()
  if (!cfg.ok || !cfg.bin) {
    lastBbpReason = cfg.reason || 'not configured'
    console.warn(`[BBP] Skipping: ${lastBbpReason}`)
    return null
  }

  const tournament = await getTournamentById(tournamentId)
  if (!tournament) {
    lastBbpReason = 'Tournament not found'
    console.error('[BBP] Tournament not found')
    return null
  }

  const participants = await listTournamentParticipants(tournamentId)
  const prevRounds = await listRounds(tournamentId)
  const currentRoundNum = (prevRounds.find(r => r.id === roundId)?.number) ?? 1

  // Idempotence guard: if matches already exist for this round, skip generation
  try {
    const existing = await listMatches(roundId)
    if (existing && existing.length > 0) {
      console.warn('[BBP] Matches already exist for round; skipping generation')
      return existing as unknown as Match[]
    }
  } catch (e) {
    console.warn('[BBP] Failed to check existing matches:', e)
  }

  // Build positional map (1-based index)
  const posToParticipantId: number[] = participants.map(p => p.id!)

  // Prepare working directory and files
  const workDir = path.join(os.tmpdir(), `bbp-${tournamentId}-${roundId}`)
  await ensureFileDir(workDir)
  const trfPath = path.join(workDir, 'trn.trfx')
  const outPath = path.join(workDir, 'outfile.txt')
  const listPath = path.join(workDir, 'checklist.txt')

  // Create TRF content
  const trfContent = await buildBbpTrfx(tournament, participants, prevRounds, currentRoundNum)
  await fs.writeFile(trfPath, trfContent, 'utf-8')

  // Determine BBP system flag from tournament.format
  let systemFlag: '--dutch' | '--burstein' = '--dutch'
  if ((tournament.format || '').toLowerCase().includes('burstein')) {
    systemFlag = '--burstein'
  }

  const timeoutMs = Number(process.env.BBP_TIMEOUT_MS || 6000)
  const retries = Math.max(0, Math.min(2, Number(process.env.BBP_RETRIES || 1)))
  let outText = ''
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await runBbpBinary(trfPath, outPath, listPath, cfg.bin, systemFlag, timeoutMs)
      outText = res.outText
      break
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      lastBbpReason = `Attempt ${attempt + 1} failed: ${message}`
      console.error('[BBP] Execution failed:', message)
      if (attempt === retries) {
        return null
      }
      await new Promise(r => setTimeout(r, 300 + attempt * 300))
    }
  }

  // Parse output
  const parsed = parseBbpOutFile(outText)
  if (!parsed.pairs || parsed.pairs.length === 0) {
    lastBbpReason = 'No pairs parsed from output'
    console.warn('[BBP] No pairs parsed from output')
    const devFallback = process.env.BBP_DEV_SWISS_FALLBACK
    const isDev = process.env.NODE_ENV !== 'production'
    if (isDev && devFallback && (devFallback === '1' || devFallback.toLowerCase() === 'true' || devFallback.toLowerCase() === 'yes')) {
      const existingAfter = await listMatches(roundId).catch(() => [])
      if (existingAfter && existingAfter.length > 0) {
        return existingAfter as unknown as Match[]
      }
      const swiss = await simpleSwissPairings(tournamentId, roundId)
      return swiss || null
    }
    return null
  }

  // Insert matches according to parsed pairs
  let board = 1
  const inserted: Match[] = []

  for (const pair of parsed.pairs) {
    const whiteId = posToParticipantId[pair.whitePos - 1]
    const blackId = pair.blackPos ? posToParticipantId[pair.blackPos - 1] : null
    if (!whiteId) continue

    const { data, error } = await supabase
      .from('matches')
      .insert({
        round_id: roundId,
        white_participant_id: whiteId,
        black_participant_id: blackId ?? null,
        board_no: board,
        result: 'not_played',
        score_white: 0,
        score_black: 0,
        source: 'bbp'
      })
      .select()
      .single()

    if (error) {
      console.error('[BBP] Error inserting match:', error)
      continue
    }

    if (data) inserted.push(data as Match)
    board += 1
  }

  return inserted
}
