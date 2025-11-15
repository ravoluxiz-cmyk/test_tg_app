import { supabase } from './supabase'

// Types matching our database schema
export interface User {
  id?: number
  telegram_id: number
  username?: string | null
  first_name: string
  last_name: string
  rating: number
  chesscom_url?: string | null
  lichess_url?: string | null
  bio?: string | null
  role?: string
  created_at?: string
  updated_at?: string
}

export interface UserProfileData {
  first_name: string
  last_name: string
  rating?: number
  chesscom_url?: string | null
  lichess_url?: string | null
  bio?: string | null
}

export interface Tournament {
  id?: number
  title: string
  format: string
  points_win: number
  points_loss: number
  points_draw: number
  bye_points: number
  rounds: number
  tiebreakers: string
  team_mode: string
  allow_join?: number
  allow_edit_results?: number
  allow_danger_changes?: number
  forbid_repeat_bye?: number
  late_join_points?: number
  hide_rating?: number
  hide_new_rating?: number
  compute_performance?: number
  hide_color_names?: number
  show_opponent_names?: number
  creator_telegram_id?: number | null
  archived?: number
  created_at?: string
}

export interface TournamentParticipant {
  id?: number
  tournament_id: number
  user_id: number
  nickname: string
  created_at?: string
}

export interface Round {
  id?: number
  tournament_id: number
  number: number
  status: string
  created_at?: string
  paired_at?: string | null
  locked_at?: string | null
}

export interface Match {
  id?: number
  round_id: number
  white_participant_id: number | null
  black_participant_id: number | null
  board_no?: number | null
  result: string
  score_white: number
  score_black: number
  source?: string | null
  notes?: string | null
}

// ===== USER FUNCTIONS =====

export async function getUserById(userId: number): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    console.error('Error getting user by id:', error)
    return null
  }

  return data as User
}

export async function getUserByTelegramId(telegramId: number): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    console.error('Error getting user by telegram_id:', error)
    return null
  }

  return data as User
}

export async function createUser(user: User): Promise<User | null> {
  const { data, error} = await supabase
    .from('users')
    .insert({
      telegram_id: user.telegram_id,
      username: user.username || null,
      first_name: user.first_name,
      last_name: user.last_name,
      rating: user.rating || 800,
      chesscom_url: user.chesscom_url || null,
      lichess_url: user.lichess_url || null,
      bio: user.bio || null,
      role: user.role || 'user'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating user:', error)
    return null
  }

  return data as User
}

export async function updateUserProfile(
  telegramId: number,
  profileData: UserProfileData
): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      rating: profileData.rating || 800,
      chesscom_url: profileData.chesscom_url || null,
      lichess_url: profileData.lichess_url || null,
      bio: profileData.bio || null
    })
    .eq('telegram_id', telegramId)

  if (error) {
    console.error('Error updating user profile:', error)
    return false
  }

  return true
}

export async function upsertUser(user: User): Promise<User | null> {
  const existingUser = await getUserByTelegramId(user.telegram_id)

  if (existingUser) {
    const updated = await updateUserProfile(user.telegram_id, {
      first_name: user.first_name,
      last_name: user.last_name,
      chesscom_url: user.chesscom_url,
      lichess_url: user.lichess_url,
      bio: user.bio
    })

    if (updated) {
      return await getUserByTelegramId(user.telegram_id)
    }
    return null
  } else {
    return await createUser(user)
  }
}

export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error getting all users:', error)
    return []
  }

  return (data || []) as User[]
}

export async function searchUsersByUsernameFragment(fragment: string, limit = 8): Promise<User[]> {
  const q = (fragment || '').trim()
  if (!q) return []

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('username', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error searching users by username fragment:', error)
    return []
  }

  return (data || []) as User[]
}

export async function seedTestUsers(count = 20): Promise<{ inserted: number }> {
  let inserted = 0
  const baseId = 700000000

  for (let i = 1; i <= count; i++) {
    const role = i <= 5 ? 'admin' : i <= 10 ? 'moderator' : 'user'
    const tgId = baseId + i

    const { error } = await supabase
      .from('users')
      .insert({
        telegram_id: tgId,
        username: `test${i}`,
        first_name: `Тест${i}`,
        last_name: `Пользователь${i}`,
        fide_rating: null,
        chesscom_rating: null,
        lichess_rating: null,
        chesscom_url: null,
        lichess_url: null,
        bio: `Сидер ${i}`,
        role: role
      })
      .select()
    if (error) {
      console.error(`Seed user insert failed for tgId=${tgId}:`, error)
    } else {
      inserted++
    }
  }

  return { inserted }
}

// ===== TOURNAMENT FUNCTIONS =====

export async function createTournament(t: Tournament): Promise<Tournament | null> {
  const { data, error } = await supabase
    .from('tournaments')
    .insert({
      title: t.title,
      format: t.format,
      points_win: t.points_win,
      points_loss: t.points_loss,
      points_draw: t.points_draw,
      bye_points: t.bye_points,
      rounds: t.rounds,
      tiebreakers: t.tiebreakers,
      team_mode: t.team_mode,
      allow_join: t.allow_join ?? 0,
      allow_edit_results: t.allow_edit_results ?? 0,
      allow_danger_changes: t.allow_danger_changes ?? 0,
      forbid_repeat_bye: t.forbid_repeat_bye ?? 1,
      late_join_points: t.late_join_points ?? 0,
      hide_rating: t.hide_rating ?? 0,
      hide_new_rating: t.hide_new_rating ?? 0,
      compute_performance: t.compute_performance ?? 0,
      hide_color_names: t.hide_color_names ?? 0,
      show_opponent_names: t.show_opponent_names ?? 1,
      creator_telegram_id: t.creator_telegram_id ?? null,
      archived: t.archived ?? 0
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating tournament:', error)
    return null
  }

  return data as Tournament
}

export async function listTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error listing tournaments:', error)
    return []
  }

  return data as Tournament[]
}

export async function listTournamentsByCreator(telegramId: number): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('creator_telegram_id', telegramId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error listing tournaments by creator:', error)
    return []
  }

  return data as Tournament[]
}

export async function getTournamentById(id: number): Promise<Tournament | null> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error getting tournament by id:', error)
    return null
  }

  return data as Tournament
}

export async function deleteTournament(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting tournament:', error)
    return false
  }

  return true
}

export async function updateTournamentArchived(id: number, archived: number): Promise<boolean> {
  const { error } = await supabase
    .from('tournaments')
    .update({ archived })
    .eq('id', id)

  if (error) {
    console.error('Error updating tournament archived status:', error)
    return false
  }

  return true
}

// ===== TOURNAMENT PARTICIPANTS =====

export async function addTournamentParticipant(tp: TournamentParticipant): Promise<TournamentParticipant | null> {
  // Ensure the user exists
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('id', tp.user_id)
    .single()

  if (!user) {
    console.error('User not found')
    return null
  }

  const { data, error } = await supabase
    .from('tournament_participants')
    .insert({
      tournament_id: tp.tournament_id,
      user_id: tp.user_id,
      nickname: tp.nickname
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding tournament participant:', error)
    return null
  }

  return data as TournamentParticipant
}

export async function listTournamentParticipants(tournamentId: number): Promise<Array<TournamentParticipant & { user: User }>> {
  const { data, error } = await supabase
    .from('tournament_participants')
    .select(`
      *,
      user:users(*)
    `)
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error listing tournament participants:', error)
    return []
  }

  const rows = (data || []) as Array<{
    id: number
    tournament_id: number
    user_id: number
    nickname: string
    created_at: string
    user?: User
  }>

  return rows.map((row) => ({
    id: row.id,
    tournament_id: row.tournament_id,
    user_id: row.user_id,
    nickname: row.nickname,
    created_at: row.created_at,
    user: (row.user as User) || ({} as User)
  }))
}

// ===== ROUNDS =====

export async function getNextRoundNumber(tournamentId: number): Promise<number> {
  const { data, error } = await supabase
    .from('rounds')
    .select('number')
    .eq('tournament_id', tournamentId)
    .order('number', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return 1
  }

  return (data.number || 0) + 1
}

export async function createRound(tournamentId: number, number?: number): Promise<Round | null> {
  const num = number ?? await getNextRoundNumber(tournamentId)

  const { data, error } = await supabase
    .from('rounds')
    .insert({
      tournament_id: tournamentId,
      number: num,
      status: 'planned'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating round:', error)
    return null
  }

  return data as Round
}

export async function listRounds(tournamentId: number): Promise<Round[]> {
  const { data, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('number', { ascending: true })

  if (error) {
    console.error('Error listing rounds:', error)
    return []
  }

  return data as Round[]
}

// ===== MATCHES =====

export async function listMatches(roundId: number): Promise<Array<Match & { white_nickname?: string | null; black_nickname?: string | null }>> {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      white:tournament_participants!white_participant_id(nickname),
      black:tournament_participants!black_participant_id(nickname)
    `)
    .eq('round_id', roundId)
    .order('board_no', { ascending: true })

  if (error) {
    console.error('Error listing matches:', error)
    return []
  }

  const rows = (data || []) as Array<
    Match & {
      white?: { nickname?: string | null } | null
      black?: { nickname?: string | null } | null
    }
  >

  return rows.map((row) => ({
    ...row,
    white_nickname: row.white?.nickname || null,
    black_nickname: row.black?.nickname || null
  }))
}

async function getTournamentScoring(tournamentId: number) {
  const tournament = await getTournamentById(tournamentId)
  return tournament || { points_win: 1, points_loss: 0, points_draw: 0.5, bye_points: 0 }
}

export async function simpleSwissPairings(tournamentId: number, roundId: number): Promise<Match[]> {
  // Determine current round number
  const { data: roundRow } = await supabase
    .from('rounds')
    .select('number')
    .eq('id', roundId)
    .single()

  const currentRoundNum = typeof roundRow?.number === 'number' ? roundRow.number : 1

  // Get tournament config for scoring and bye rules
  const tournament = await getTournamentById(tournamentId)
  const scoring = await getTournamentScoring(tournamentId)
  const forbidRepeatBye = tournament?.forbid_repeat_bye ? 1 : 0

  // Determine ordering of participants (rating-aware)
  let ids: number[] = []

  // Build rating map for tournament participants
  const participantsExt = await listTournamentParticipants(tournamentId)
  if (!participantsExt || participantsExt.length === 0) return []

  const effectiveRating = (u: User | undefined) => {
    if (!u) return 0
    return u.rating || 0
  }

  const ratingMap = new Map<number, number>()
  for (const p of participantsExt) {
    if (p.id) ratingMap.set(p.id, effectiveRating(p.user))
  }

  if (currentRoundNum <= 1) {
    // First round: sort by rating (ascending) so adjacent players have close ratings
    const sortedByRating = [...participantsExt].sort((a, b) => effectiveRating(a.user) - effectiveRating(b.user))
    ids = sortedByRating.map((p) => p.id!)
  } else {
    // Subsequent rounds: group by points and sort within each group by rating to pair close ratings
    const standings = await getStandings(tournamentId)
    if (!standings || standings.length === 0) return []

    const groups = new Map<number, number[]>()
    for (const s of standings) {
      const arr = groups.get(s.points) || []
      arr.push(s.participant_id)
      groups.set(s.points, arr)
    }
    const sortedPointValues = Array.from(groups.keys()).sort((a, b) => b - a)

    const ordered: number[] = []
    for (const pts of sortedPointValues) {
      const groupIds = groups.get(pts) || []
      groupIds.sort((a, b) => (ratingMap.get(a)! - ratingMap.get(b)!))
      ordered.push(...groupIds)
    }
    ids = ordered
  }

  // Compute who already received a bye in previous rounds
  const hadBye = new Set<number>()
  if (currentRoundNum > 1) {
    const prevRounds = await listRounds(tournamentId)
    const prevIds = (prevRounds || [])
      .filter(r => (r.number || 0) < currentRoundNum)
      .map(r => r.id!)
    for (const rid of prevIds) {
      const prevMatches = await listMatches(rid)
      for (const m of prevMatches) {
        // Treat matches with missing black participant as bye, regardless of result label
        if ((m.black_participant_id === null || m.result === 'bye') && m.white_participant_id) {
          hadBye.add(m.white_participant_id)
        }
      }
    }
  }

  const matches: Match[] = []
  let board = 1

  // Bye handling if odd number of participants
  let byeId: number | null = null
  if (ids.length % 2 === 1) {
    // Prefer a player without previous bye (if forbidRepeatBye enabled)
    if (forbidRepeatBye) {
      for (let i = ids.length - 1; i >= 0; i--) {
        const candidate = ids[i]
        if (!hadBye.has(candidate)) {
          byeId = candidate
          ids.splice(i, 1)
          break
        }
      }
    }
    // If none found (or forbidRepeatBye disabled), take the last one
    if (byeId === null) {
      byeId = ids.pop() || null
    }
  }

  // Pair remaining players sequentially
  for (let i = 0; i < ids.length; i += 2) {
    const w = ids[i]
    const b = ids[i + 1]

    const { data } = await supabase
      .from('matches')
      .insert({
        round_id: roundId,
        white_participant_id: w,
        black_participant_id: b,
        board_no: board,
        result: 'not_played',
        score_white: 0,
        score_black: 0,
        source: 'system'
      })
      .select()
      .single()

    if (data) {
      matches.push(data as Match)
    }
    board += 1
  }

  // Add bye if needed: automatically assign a win to the player with a bye
  if (byeId) {
    const { data } = await supabase
      .from('matches')
      .insert({
        round_id: roundId,
        white_participant_id: byeId,
        black_participant_id: null,
        board_no: board,
        result: 'bye',
        score_white: scoring.bye_points,
        score_black: 0,
        source: 'system'
      })
      .select()
      .single()

    if (data) {
      matches.push(data as Match)
    }
  }

  // Update round status
  await supabase
    .from('rounds')
    .update({ status: 'paired', paired_at: new Date().toISOString() })
    .eq('id', roundId)

  return matches
}

export async function updateMatchResult(matchId: number, result: string): Promise<Match | null> {
  // Get match and tournament info
  const { data: match } = await supabase
    .from('matches')
    .select('id, round_id, rounds!inner(tournament_id)')
    .eq('id', matchId)
    .single()

  if (!match) {
    console.error('Match not found')
    return null
  }

  const tournamentId = (() => {
    const r = (match as { rounds?: Array<{ tournament_id: number }> }).rounds
    return Array.isArray(r) && r.length > 0 ? r[0].tournament_id : 0
  })()
  const scoring = await getTournamentScoring(tournamentId)

  let sw = 0, sb = 0
  switch (result) {
    case 'white':
    case 'forfeit_black':
      sw = scoring.points_win
      sb = scoring.points_loss
      break
    case 'black':
    case 'forfeit_white':
      sw = scoring.points_loss
      sb = scoring.points_win
      break
    case 'draw':
      sw = scoring.points_draw
      sb = scoring.points_draw
      break
    case 'bye':
      sw = scoring.bye_points
      sb = 0
      break
    default:
      result = 'not_played'
      sw = 0
      sb = 0
  }

  const { data, error } = await supabase
    .from('matches')
    .update({
      result,
      score_white: sw,
      score_black: sb
    })
    .eq('id', matchId)
    .select()
    .single()

  if (error) {
    console.error('Error updating match result:', error)
    return null
  }

  // After updating the result, check if the round has all matches finished
  try {
    const roundId = (match as { round_id?: number }).round_id ?? 0
    if (Number.isFinite(roundId)) {
      const { data: roundMatches } = await supabase
        .from('matches')
        .select('id, result')
        .eq('round_id', roundId)

      const rms = (roundMatches || []) as Array<{ id: number; result: string | null }>
      const allFinished = rms.length > 0 && rms.every((m) => m.result && m.result !== 'not_played')
      if (allFinished) {
        // Lock the round
        await supabase
          .from('rounds')
          .update({ status: 'locked', locked_at: new Date().toISOString() })
          .eq('id', roundId)

        // Trigger finalization check based on locked rounds
        const tournamentId2 = (() => {
          const r = (match as { rounds?: Array<{ tournament_id: number }> }).rounds
          return Array.isArray(r) && r.length > 0 ? r[0].tournament_id : 0
        })()
        if (Number.isFinite(tournamentId2)) {
          try {
            await finalizeTournamentIfExceeded(tournamentId2)
          } catch (fErr) {
            console.error('Finalization after round lock failed:', fErr)
          }
        }
      }
    }
  } catch (postErr) {
    console.error('Post-update round lock check failed:', postErr)
  }

  return data as Match
}

// ===== STANDINGS =====

export async function getStandings(tournamentId: number): Promise<Array<{ participant_id: number; nickname: string; points: number }>> {
  const participants = await listTournamentParticipants(tournamentId)
  const rounds = await listRounds(tournamentId)

  const standings = await Promise.all(
    participants.map(async (p) => {
      let points = 0

      for (const round of rounds) {
        const matches = await listMatches(round.id!)

        for (const match of matches) {
          if (match.white_participant_id === p.id) {
            points += match.score_white
          } else if (match.black_participant_id === p.id) {
            points += match.score_black
          }
        }
      }

      return {
        participant_id: p.id!,
        nickname: p.nickname,
        points
      }
    })
  )

  standings.sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points
    }
    return a.nickname.localeCompare(b.nickname)
  })

  return standings
}

// ===== AUTO-FINALIZATION =====
// Finish tournament when played rounds exceed planned total and snapshot standings.
export async function finalizeTournamentIfExceeded(tournamentId: number): Promise<boolean> {
  const tournament = await getTournamentById(tournamentId)
  if (!tournament) return false
  if ((tournament.archived ?? 0) === 1) return false

  const planned = tournament.rounds || 0

  const { data: rounds, error: rErr } = await supabase
    .from('rounds')
    .select('id, number, status')
    .eq('tournament_id', tournamentId)
    .order('number', { ascending: true })

  if (rErr) {
    console.error('Failed to list rounds for finalization:', rErr)
    return false
  }

  // Finalize when the number of locked (completed) rounds is at least planned total
  const lockedCount = ((rounds || []) as Array<{ status?: string }>).filter((r) => r.status === 'locked').length
  if (lockedCount >= planned) {
    const standings = await getStandings(tournamentId)
    const rows = standings.map((s, idx) => ({
      tournament_id: tournamentId,
      participant_id: s.participant_id,
      nickname: s.nickname,
      points: s.points,
      rank: idx + 1
    }))

    // If there are no participants/standings, skip leaderboard snapshot gracefully
    if (rows.length > 0) {
      const { error: lbErr } = await supabase
        .from('leaderboard')
        .upsert(rows, { onConflict: 'tournament_id,participant_id' })
        .select()

      if (lbErr) {
        console.error('Failed to insert leaderboard snapshot:', lbErr)
        // Proceed without leaderboard snapshot (e.g., table missing). We'll still archive.
      }
    } else {
      console.warn('No standings to snapshot; finalizing without leaderboard entries')
    }

    const archivedOk = await updateTournamentArchived(tournamentId, 1)
    if (!archivedOk) {
      console.error('Failed to mark tournament archived after finalization')
      return false
    }

    return true
  }

  return false
}

// ===== MANUAL FINALIZATION =====
// Finish tournament explicitly and snapshot standings to leaderboard regardless of round locks.
export async function finalizeTournament(tournamentId: number): Promise<boolean> {
  const tournament = await getTournamentById(tournamentId)
  if (!tournament) return false

  // Compute current standings
  const standings = await getStandings(tournamentId)
  const rows = standings.map((s, idx) => ({
    tournament_id: tournamentId,
    participant_id: s.participant_id,
    nickname: s.nickname,
    points: s.points,
    rank: idx + 1
  }))

  // If there are no participants/standings, skip leaderboard snapshot gracefully
  if (rows.length > 0) {
    const { error: lbErr } = await supabase
      .from('leaderboard')
      .upsert(rows, { onConflict: 'tournament_id,participant_id' })
      .select()

    if (lbErr) {
      console.error('Failed to insert leaderboard snapshot (manual):', lbErr)
      // Proceed without leaderboard snapshot (e.g., table missing). We'll still archive.
    }
  } else {
    console.warn('No standings to snapshot; manual finalization will archive without leaderboard entries')
  }

  const archivedOk = await updateTournamentArchived(tournamentId, 1)
  if (!archivedOk) {
    console.error('Failed to mark tournament archived after manual finalization')
    return false
  }

  return true
}

// ===== LEADERBOARD =====
export async function listLeaderboard(tournamentId: number): Promise<Array<{ participant_id: number; nickname: string; points: number; rank: number }>> {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('participant_id, nickname, points, rank')
    .eq('tournament_id', tournamentId)
    .order('rank', { ascending: true })

  if (error) {
    console.error('Error listing leaderboard:', error)
    return []
  }

  return (data || []) as Array<{ participant_id: number; nickname: string; points: number; rank: number }>
}

// ===== ADMIN MAINTENANCE =====

export async function deleteAllRoundsForTournament(tournamentId: number): Promise<boolean> {
  try {
    // Get all round IDs for the tournament
    const { data: rounds, error: roundsErr } = await supabase
      .from('rounds')
      .select('id')
      .eq('tournament_id', tournamentId)

    if (roundsErr) {
      console.error('Error fetching rounds to delete:', roundsErr)
      return false
    }

    const roundsRows = (rounds || []) as Array<{ id: number }>
    const roundIds = roundsRows.map((r) => r.id)

    // Delete matches first to satisfy FK constraints (though ON DELETE CASCADE exists, be explicit)
    if (roundIds.length > 0) {
      const { error: matchesErr } = await supabase
        .from('matches')
        .delete()
        .in('round_id', roundIds)
      if (matchesErr) {
        console.error('Error deleting matches:', matchesErr)
        return false
      }
    }

    // Delete rounds for the tournament
    const { error: delRoundsErr } = await supabase
      .from('rounds')
      .delete()
      .eq('tournament_id', tournamentId)

    if (delRoundsErr) {
      console.error('Error deleting rounds:', delRoundsErr)
      return false
    }

    return true
  } catch (err) {
    console.error('Error in deleteAllRoundsForTournament:', err)
    return false
  }
}

// Удаление конкретного тура и всех его матчей
export async function deleteRoundById(roundId: number): Promise<boolean> {
  try {
    // Удаляем матчи этого тура
    const { error: matchesErr } = await supabase
      .from('matches')
      .delete()
      .eq('round_id', roundId)

    if (matchesErr) {
      console.error('Error deleting matches for round:', matchesErr)
      return false
    }

    // Удаляем сам тур
    const { error: roundErr } = await supabase
      .from('rounds')
      .delete()
      .eq('id', roundId)

    if (roundErr) {
      console.error('Error deleting round:', roundErr)
      return false
    }

    return true
  } catch (e) {
    console.error('Failed to delete round by id:', e)
    return false
  }
}

export default supabase
