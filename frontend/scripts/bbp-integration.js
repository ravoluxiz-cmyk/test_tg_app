#!/usr/bin/env node
/**
 * BBP Pairings integration test harness.
 *
 * What it does:
 * - Ensures Next.js dev server is running (can auto-start on PORT, default 3000)
 * - Creates a tournament via admin-protected API
 * - Creates a round (tour) via admin-protected API
 * - Creates N user profiles via /api/profile using Authorization header (dev mode parsing)
 * - Adds those users as tournament participants
 * - Triggers pairings generation via /api/tournaments/:id/tours/:tourId/pairings
 * - Fetches and prints the resulting matches for the round
 *
 * Use BBP_PAIRINGS_BIN to select the binary; if not set, server auto-discovers from bin/bbp.
 * Set START_SERVER=1 to auto-start `npm run dev` on PORT (default 3000).
 * Set PLAYERS=<N> to control number of players (default 8).
 * Set ROUNDS=<N> to control planned rounds when creating tournament (default 3).
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const BASE_URL = process.env.BASE_URL || 'http://localhost:' + (process.env.PORT || 3000)
const START_SERVER = String(process.env.START_SERVER || '1').toLowerCase() === '1'
const PORT = Number(process.env.PORT || 3000)
const PLAYERS = Math.max(2, Number(process.env.PLAYERS || 8))
const ROUNDS = Math.max(1, Number(process.env.ROUNDS || 3))

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function resolveDefaultBbpBin() {
  const projectRoot = process.cwd()
  const bbpDir = path.join(projectRoot, 'bin', 'bbp')
  const platform = process.platform
  const arch = process.arch
  if (platform === 'darwin') {
    return path.join(bbpDir, arch === 'arm64' ? 'bbpPairings-macos-arm64' : 'bbpPairings-macos-amd64')
  } else if (platform === 'linux') {
    if (arch === 'arm64') return path.join(bbpDir, 'bbpPairings-linux-arm64')
    if (arch === 'x64') return path.join(bbpDir, 'bbpPairings-linux-amd64')
    return path.join(bbpDir, 'bbpPairings')
  } else if (platform === 'win32') {
    return path.join(bbpDir, 'bbpPairings.exe')
  }
  return 'bbpPairings'
}

async function waitForServerReady(timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE_URL + '/api/tournaments', { method: 'GET' })
      if (res.ok) return true
    } catch {}
    await sleep(500)
  }
  return false
}

function makeAuthHeaders(userObj) {
  const initData = new URLSearchParams({ user: JSON.stringify(userObj) }).toString()
  return { 'Authorization': 'Bearer ' + initData, 'Content-Type': 'application/json' }
}

async function createTournament() {
  const adminUser = { id: 999, first_name: 'Dev', last_name: 'Admin', username: 'dev_admin' }
  const headers = makeAuthHeaders(adminUser)
  const body = {
    title: 'BBP Integration Smoke ' + new Date().toISOString().slice(0,19).replace('T',' '),
    format: 'swiss_bbp_dutch',
    rounds: ROUNDS,
    points_win: 1,
    points_draw: 0.5,
    points_loss: 0,
    bye_points: 0,
    tiebreakers: 'head_to_head, buchholz_cut1, buchholz',
    show_opponent_names: 1,
    allow_join: 0,
    creator_telegram_id: adminUser.id,
  }
  const res = await fetch(BASE_URL + '/api/tournaments', { method: 'POST', headers, body: JSON.stringify(body) })
  if (!res.ok) throw new Error('Create tournament failed: ' + res.status)
  const data = await res.json()
  return data
}

async function createRound(tournamentId, number) {
  const adminUser = { id: 999, first_name: 'Dev', last_name: 'Admin', username: 'dev_admin' }
  const headers = makeAuthHeaders(adminUser)
  const body = number ? { number } : {}
  const res = await fetch(`${BASE_URL}/api/tournaments/${tournamentId}/tours`, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!res.ok) throw new Error('Create round failed: ' + res.status)
  const data = await res.json()
  return data
}

async function createProfile(userId, username) {
  const headers = makeAuthHeaders({ id: userId, first_name: 'User'+userId, last_name: 'Test', username })
  const body = {
    first_name: 'User'+userId,
    last_name: 'Test',
    fide_rating: null,
    chesscom_rating: null,
    lichess_rating: null,
    bio: null,
  }
  const res = await fetch(BASE_URL + '/api/profile', { method: 'POST', headers, body: JSON.stringify(body) })
  // If already exists, GET to retrieve id
  if (res.status === 400) {
    const res2 = await fetch(BASE_URL + '/api/profile', { method: 'GET', headers })
    if (!res2.ok) throw new Error('Profile GET after exists failed: ' + res2.status)
    const data2 = await res2.json()
    return data2.user
  }
  if (!res.ok) throw new Error('Create profile failed: ' + res.status)
  const data = await res.json()
  return data.user
}

async function listUsers() {
  const res = await fetch(BASE_URL + '/api/users', { method: 'GET' })
  if (!res.ok) throw new Error('List users failed: ' + res.status)
  return res.json()
}

async function addParticipant(tournamentId, userId, nickname) {
  const res = await fetch(`${BASE_URL}/api/tournaments/${tournamentId}/participants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, nickname })
  })
  if (!res.ok) throw new Error('Add participant failed: ' + res.status)
  return res.json()
}

async function generatePairings(tournamentId, roundId) {
  const res = await fetch(`${BASE_URL}/api/tournaments/${tournamentId}/tours/${roundId}/pairings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  })
  if (!res.ok && res.status !== 201) throw new Error('Generate pairings failed: ' + res.status)
  return res.json()
}

async function getMatches(roundId) {
  const res = await fetch(`${BASE_URL}/api/tournaments/0/tours/${roundId}/matches`, { method: 'GET' })
  if (!res.ok) throw new Error('Get matches failed: ' + res.status)
  return res.json()
}

async function main() {
  let devServerProc = null
  try {
    if (START_SERVER) {
      // If server not responding, start it
      const ok = await waitForServerReady(2000)
      if (!ok) {
        console.log('[Harness] Starting Next dev server on PORT=' + PORT)
        const env = { ...process.env }
        env.PORT = String(PORT)
        // Make BBP binary available to server if provided; else try default
        if (!env.BBP_PAIRINGS_BIN) {
          const candidate = resolveDefaultBbpBin()
          if (fs.existsSync(candidate)) env.BBP_PAIRINGS_BIN = candidate
        }
        devServerProc = spawn('npm', ['run', 'dev'], {
          cwd: path.join(process.cwd()),
          env,
          stdio: ['ignore','pipe','pipe']
        })
        devServerProc.stdout.on('data', d => {
          const s = String(d)
          if (s.toLowerCase().includes('ready') || s.toLowerCase().includes('started server')) {
            // hint only
          }
          process.stdout.write(s)
        })
        devServerProc.stderr.on('data', d => process.stderr.write(String(d)))
        const ready = await waitForServerReady(30000)
        if (!ready) throw new Error('Dev server failed to become ready within timeout')
      }
    } else {
      const ok = await waitForServerReady(5000)
      if (!ok) throw new Error('Server not responding at ' + BASE_URL + ' and START_SERVER=0')
    }

    console.log('[Harness] Creating tournament...')
    const tournament = await createTournament()
    console.log('[Harness] Tournament created:', tournament)

    console.log('[Harness] Creating first round...')
    const round = await createRound(tournament.id)
    console.log('[Harness] Round created:', round)

    console.log(`[Harness] Creating ${PLAYERS} user profiles...`)
    const users = []
    for (let i = 0; i < PLAYERS; i++) {
      const uid = 1000 + i
      const username = 'user' + uid
      const user = await createProfile(uid, username)
      users.push(user)
    }
    console.log('[Harness] Total users in system:', (await listUsers()).length)

    console.log('[Harness] Adding participants to tournament...')
    const participants = []
    for (let i = 0; i < users.length; i++) {
      const nickname = 'P' + (i + 1)
      const p = await addParticipant(tournament.id, users[i].id, nickname)
      participants.push(p)
    }
    console.log('[Harness] Participants added:', participants.length)

    console.log('[Harness] Triggering pairings generation (BBP-only mode, no fallback)...')
    const gen = await generatePairings(tournament.id, round.id)
    console.log('[Harness] Generation response (matches count):', Array.isArray(gen) ? gen.length : 0)

    console.log('[Harness] Fetching matches for round...')
    const matches = await getMatches(round.id)
    console.log('=== Round Matches ===')
    for (const m of matches) {
      const w = m.white_nickname || m.white_participant_id
      const b = m.black_nickname || m.black_participant_id
      console.log(`#${m.board_no ?? ''} ${w} vs ${b} => result=${m.result}`)
    }
    console.log('[Harness] Done.')
  } catch (e) {
    console.error('[Harness] Failed:', e && e.message ? e.message : String(e))
    process.exitCode = 1
  } finally {
    if (devServerProc) {
      console.log('[Harness] Stopping dev server...')
      try { devServerProc.kill('SIGINT') } catch {}
    }
  }
}

if (require.main === module) {
  main()
}