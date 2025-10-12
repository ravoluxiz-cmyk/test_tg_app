import Database from "better-sqlite3"
import fs from "fs"
import path from "path"

// Determine database path with environment override and serverless fallback
function resolveDbPath(): string {
  const envPath = process.env.DATABASE_PATH
  if (envPath && envPath.trim().length > 0) {
    return envPath
  }

  // In serverless environments (e.g., Vercel), writeable path is /tmp
  if (process.env.VERCEL || process.env.AWS_REGION || process.env.NODE_ENV === "production") {
    return path.join("/tmp", "repchess.db")
  }

  // Default local path
  return path.join(process.cwd(), "database", "repchess.db")
}

const DB_PATH = resolveDbPath()
const SCHEMA_PATH = path.join(process.cwd(), "database", "schema.sql")

// Inline schema fallback (used if reading schema file fails)
const DEFAULT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  fide_rating INTEGER,
  chesscom_rating INTEGER,
  lichess_rating INTEGER,
  chesscom_url TEXT,
  lichess_url TEXT,
  bio TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- Tournaments
CREATE TABLE IF NOT EXISTS tournaments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'swiss_fide_javafo',
  points_win REAL NOT NULL DEFAULT 1.0,
  points_loss REAL NOT NULL DEFAULT 0.0,
  points_draw REAL NOT NULL DEFAULT 0.5,
  bye_points REAL NOT NULL DEFAULT 0.0,
  rounds INTEGER NOT NULL DEFAULT 5,
  tiebreakers TEXT NOT NULL DEFAULT 'head_to_head, buchholz_cut1, buchholz',
  team_mode TEXT NOT NULL DEFAULT 'none',
  allow_join INTEGER NOT NULL DEFAULT 0,
  allow_edit_results INTEGER NOT NULL DEFAULT 0,
  allow_danger_changes INTEGER NOT NULL DEFAULT 0,
  forbid_repeat_bye INTEGER NOT NULL DEFAULT 1,
  late_join_points INTEGER NOT NULL DEFAULT 0,
  hide_rating INTEGER NOT NULL DEFAULT 0,
  hide_new_rating INTEGER NOT NULL DEFAULT 0,
  compute_performance INTEGER NOT NULL DEFAULT 0,
  hide_color_names INTEGER NOT NULL DEFAULT 0,
  show_opponent_names INTEGER NOT NULL DEFAULT 1,
  creator_telegram_id BIGINT,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tournament_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  nickname TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tournament_id, nickname),
  FOREIGN KEY(tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Rounds
CREATE TABLE IF NOT EXISTS rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  paired_at DATETIME,
  locked_at DATETIME,
  UNIQUE(tournament_id, number),
  FOREIGN KEY(tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

-- Matches
CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id INTEGER NOT NULL,
  white_participant_id INTEGER,
  black_participant_id INTEGER,
  board_no INTEGER,
  result TEXT NOT NULL DEFAULT 'not_played',
  score_white REAL NOT NULL DEFAULT 0,
  score_black REAL NOT NULL DEFAULT 0,
  source TEXT,
  notes TEXT,
  FOREIGN KEY(round_id) REFERENCES rounds(id) ON DELETE CASCADE,
  FOREIGN KEY(white_participant_id) REFERENCES tournament_participants(id) ON DELETE SET NULL,
  FOREIGN KEY(black_participant_id) REFERENCES tournament_participants(id) ON DELETE SET NULL
);
`

// Ensure database directory exists (if not using /tmp)
try {
  const dbDir = path.dirname(DB_PATH)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
} catch (e) {
  console.warn("Failed to ensure DB directory exists:", e)
}

// Initialize database connection
const db = new Database(DB_PATH)

// Enable foreign keys
db.pragma("foreign_keys = ON")

// Initialize database schema if needed
function initDatabase() {
  try {
    // Check if users table exists
    const tableExists = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      )
      .get()

    if (!tableExists) {
      console.log("Initializing database schema...")
      let schema = DEFAULT_SCHEMA_SQL
      try {
        if (fs.existsSync(SCHEMA_PATH)) {
          schema = fs.readFileSync(SCHEMA_PATH, "utf-8")
        } else {
          console.warn("Schema file not found, using inline schema fallback")
        }
      } catch (readErr) {
        console.warn("Failed to read schema file, using inline fallback:", readErr)
      }
      db.exec(schema)
      console.log("Database schema initialized successfully")
    }
  } catch (error) {
    console.error("Error initializing database:", error)
    throw error
  }
}

// Initialize on module load
initDatabase()

// Ensure tournaments schema exists even if users table already present
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      format TEXT NOT NULL DEFAULT 'swiss_fide_javafo',
      points_win REAL NOT NULL DEFAULT 1.0,
      points_loss REAL NOT NULL DEFAULT 0.0,
      points_draw REAL NOT NULL DEFAULT 0.5,
      bye_points REAL NOT NULL DEFAULT 0.0,
      rounds INTEGER NOT NULL DEFAULT 5,
      tiebreakers TEXT NOT NULL DEFAULT 'head_to_head, buchholz_cut1, buchholz',
      team_mode TEXT NOT NULL DEFAULT 'none',
      allow_join INTEGER NOT NULL DEFAULT 0,
      allow_edit_results INTEGER NOT NULL DEFAULT 0,
      allow_danger_changes INTEGER NOT NULL DEFAULT 0,
      forbid_repeat_bye INTEGER NOT NULL DEFAULT 1,
      late_join_points INTEGER NOT NULL DEFAULT 0,
      hide_rating INTEGER NOT NULL DEFAULT 0,
      hide_new_rating INTEGER NOT NULL DEFAULT 0,
      compute_performance INTEGER NOT NULL DEFAULT 0,
      hide_color_names INTEGER NOT NULL DEFAULT 0,
      show_opponent_names INTEGER NOT NULL DEFAULT 1,
      creator_telegram_id BIGINT,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS tournament_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      nickname TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tournament_id, nickname),
      FOREIGN KEY(tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      number INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'planned',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      paired_at DATETIME,
      locked_at DATETIME,
      UNIQUE(tournament_id, number),
      FOREIGN KEY(tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round_id INTEGER NOT NULL,
      white_participant_id INTEGER,
      black_participant_id INTEGER,
      board_no INTEGER,
      result TEXT NOT NULL DEFAULT 'not_played',
      score_white REAL NOT NULL DEFAULT 0,
      score_black REAL NOT NULL DEFAULT 0,
      source TEXT,
      notes TEXT,
      FOREIGN KEY(round_id) REFERENCES rounds(id) ON DELETE CASCADE,
      FOREIGN KEY(white_participant_id) REFERENCES tournament_participants(id) ON DELETE SET NULL,
      FOREIGN KEY(black_participant_id) REFERENCES tournament_participants(id) ON DELETE SET NULL
    );
  `)
} catch (e) {
  console.warn("Failed to ensure tournaments schema:", e)
}

// Ensure new column exists when upgrading existing DB
try {
  const cols = db.prepare("PRAGMA table_info(tournaments)").all() as Array<{ name: string }>
  const hasCreator = cols.some(c => c.name === "creator_telegram_id")
  if (!hasCreator) {
    db.exec("ALTER TABLE tournaments ADD COLUMN creator_telegram_id BIGINT")
  }
} catch (e) {
  console.warn("Failed to ensure creator_telegram_id column:", e)
}

export interface User {
  id?: number
  telegram_id: number
  username?: string | null
  first_name: string
  last_name: string
  fide_rating?: number | null
  chesscom_rating?: number | null
  lichess_rating?: number | null
  chesscom_url?: string | null
  lichess_url?: string | null
  bio?: string | null
  created_at?: string
  updated_at?: string
}

export interface UserProfileData {
  first_name: string
  last_name: string
  fide_rating?: number | null
  chesscom_rating?: number | null
  lichess_rating?: number | null
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
  creator_telegram_id?: number
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

// Rounds and matches models
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

// Get user by telegram_id
export function getUserByTelegramId(telegramId: number): User | undefined {
  const stmt = db.prepare("SELECT * FROM users WHERE telegram_id = ?")
  return stmt.get(telegramId) as User | undefined
}

// Create new user
export function createUser(user: User): User {
  const stmt = db.prepare(`
    INSERT INTO users (
      telegram_id, username, first_name, last_name,
      fide_rating, chesscom_rating, lichess_rating,
      chesscom_url, lichess_url, bio
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    user.telegram_id,
    user.username || null,
    user.first_name,
    user.last_name,
    user.fide_rating || null,
    user.chesscom_rating || null,
    user.lichess_rating || null,
    user.chesscom_url || null,
    user.lichess_url || null,
    user.bio || null
  )

  return {
    ...user,
    id: result.lastInsertRowid as number,
  }
}

// Update user profile
export function updateUserProfile(
  telegramId: number,
  data: UserProfileData
): boolean {
  const stmt = db.prepare(`
    UPDATE users SET
      first_name = ?,
      last_name = ?,
      fide_rating = ?,
      chesscom_rating = ?,
      lichess_rating = ?,
      chesscom_url = ?,
      lichess_url = ?,
      bio = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE telegram_id = ?
  `)

  const result = stmt.run(
    data.first_name,
    data.last_name,
    data.fide_rating || null,
    data.chesscom_rating || null,
    data.lichess_rating || null,
    data.chesscom_url || null,
    data.lichess_url || null,
    data.bio || null,
    telegramId
  )

  return result.changes > 0
}

// Create or update user
export function upsertUser(user: User): User {
  const existingUser = getUserByTelegramId(user.telegram_id)

  if (existingUser) {
    updateUserProfile(user.telegram_id, {
      first_name: user.first_name,
      last_name: user.last_name,
      fide_rating: user.fide_rating,
      chesscom_rating: user.chesscom_rating,
      lichess_rating: user.lichess_rating,
      chesscom_url: user.chesscom_url,
      lichess_url: user.lichess_url,
      bio: user.bio,
    })
    return getUserByTelegramId(user.telegram_id)!
  } else {
    return createUser(user)
  }
}

export default db

// Additional helpers
export function getAllUsers(): User[] {
  const stmt = db.prepare("SELECT * FROM users ORDER BY created_at DESC")
  return stmt.all() as User[]
}

export function createTournament(t: Tournament): Tournament {
  const stmt = db.prepare(`
    INSERT INTO tournaments (
      title, format, points_win, points_loss, points_draw, bye_points,
      rounds, tiebreakers, team_mode,
      allow_join, allow_edit_results, allow_danger_changes,
      forbid_repeat_bye, late_join_points, hide_rating, hide_new_rating,
      compute_performance, hide_color_names, show_opponent_names, creator_telegram_id, archived
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    t.title,
    t.format,
    t.points_win,
    t.points_loss,
    t.points_draw,
    t.bye_points,
    t.rounds,
    t.tiebreakers,
    t.team_mode,
    t.allow_join ?? 0,
    t.allow_edit_results ?? 0,
    t.allow_danger_changes ?? 0,
    t.forbid_repeat_bye ?? 1,
    t.late_join_points ?? 0,
    t.hide_rating ?? 0,
    t.hide_new_rating ?? 0,
    t.compute_performance ?? 0,
    t.hide_color_names ?? 0,
    t.show_opponent_names ?? 1,
    t.creator_telegram_id ?? null,
    t.archived ?? 0
  )

  return { ...t, id: result.lastInsertRowid as number }
}

export function listTournaments(): Tournament[] {
  const stmt = db.prepare("SELECT * FROM tournaments ORDER BY created_at DESC")
  return stmt.all() as Tournament[]
}

export function listTournamentsByCreator(telegramId: number): Tournament[] {
  const stmt = db.prepare("SELECT * FROM tournaments WHERE creator_telegram_id = ? ORDER BY created_at DESC")
  return stmt.all(telegramId) as Tournament[]
}

export function deleteTournament(id: number): boolean {
  const res = db.prepare("DELETE FROM tournaments WHERE id = ?").run(id)
  return (res.changes || 0) > 0
}

export function addTournamentParticipant(tp: TournamentParticipant): TournamentParticipant | null {
  // Ensure the user exists
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(tp.user_id) as { id?: number } | undefined
  if (!user?.id) return null

  const stmt = db.prepare(`
    INSERT INTO tournament_participants (tournament_id, user_id, nickname)
    VALUES (?, ?, ?)
  `)
  try {
    const res = stmt.run(tp.tournament_id, tp.user_id, tp.nickname)
    return { ...tp, id: res.lastInsertRowid as number }
  } catch (e) {
    console.error("Failed to add participant:", e)
    return null
  }
}

export function listTournamentParticipants(tournamentId: number): (TournamentParticipant & { user: User })[] {
  const stmt = db.prepare(`
    SELECT tp.*, u.* FROM tournament_participants tp
    JOIN users u ON u.id = tp.user_id
    WHERE tp.tournament_id = ?
    ORDER BY tp.created_at ASC
  `)
  const rows = stmt.all(tournamentId) as Array<{
    // tournament_participants (tp.*)
    id: number
    tournament_id: number
    user_id: number
    nickname: string
    created_at: string
    // users (u.*)
    telegram_id: number
    username: string | null
    first_name: string
    last_name: string
    fide_rating: number | null
    chesscom_rating: number | null
    lichess_rating: number | null
    chesscom_url: string | null
    lichess_url: string | null
    bio: string | null
    updated_at: string
  }>
  return rows.map(r => ({
    id: r.id,
    tournament_id: r.tournament_id,
    user_id: r.user_id,
    nickname: r.nickname,
    created_at: r.created_at,
    user: {
      id: r.user_id,
      telegram_id: r.telegram_id,
      username: r.username,
      first_name: r.first_name,
      last_name: r.last_name,
      fide_rating: r.fide_rating,
      chesscom_rating: r.chesscom_rating,
      lichess_rating: r.lichess_rating,
      chesscom_url: r.chesscom_url,
      lichess_url: r.lichess_url,
      bio: r.bio,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  }))
}

// Rounds helpers
export function getNextRoundNumber(tournamentId: number): number {
  const row = db
    .prepare("SELECT COALESCE(MAX(number), 0) AS maxnum FROM rounds WHERE tournament_id = ?")
    .get(tournamentId) as { maxnum: number }
  return (row?.maxnum || 0) + 1
}

export function createRound(tournamentId: number, number?: number): Round {
  const num = number ?? getNextRoundNumber(tournamentId)
  const stmt = db.prepare(`
    INSERT INTO rounds (tournament_id, number, status)
    VALUES (?, ?, 'planned')
  `)
  const res = stmt.run(tournamentId, num)
  return { id: res.lastInsertRowid as number, tournament_id: tournamentId, number: num, status: 'planned' }
}

export function listRounds(tournamentId: number): Round[] {
  const stmt = db.prepare(`
    SELECT * FROM rounds WHERE tournament_id = ? ORDER BY number ASC
  `)
  return stmt.all(tournamentId) as Round[]
}

export function listMatches(roundId: number): (Match & { white_nickname?: string|null, black_nickname?: string|null })[] {
  const stmt = db.prepare(`
    SELECT m.*, w.nickname AS white_nickname, b.nickname AS black_nickname
    FROM matches m
    LEFT JOIN tournament_participants w ON w.id = m.white_participant_id
    LEFT JOIN tournament_participants b ON b.id = m.black_participant_id
    WHERE m.round_id = ?
    ORDER BY m.board_no ASC, m.id ASC
  `)
  return stmt.all(roundId) as Array<Match & { white_nickname?: string | null; black_nickname?: string | null }>
}

function getTournamentScoring(tournamentId: number) {
  const row = db.prepare("SELECT points_win, points_loss, points_draw, bye_points FROM tournaments WHERE id = ?").get(tournamentId) as {
    points_win: number; points_loss: number; points_draw: number; bye_points: number
  } | undefined
  return row || { points_win: 1, points_loss: 0, points_draw: 0.5, bye_points: 0 }
}

export function simpleSwissPairings(tournamentId: number, roundId: number): Match[] {
  const participants = db.prepare(`
    SELECT id FROM tournament_participants WHERE tournament_id = ? ORDER BY created_at ASC
  `).all(tournamentId) as { id: number }[]

  const matches: Match[] = []
  const scoring = getTournamentScoring(tournamentId)

  const ids = participants.map(p => p.id)
  let board = 1

  // bye if odd
  let byeId: number | null = null
  if (ids.length % 2 === 1) {
    byeId = ids.pop() || null
  }

  for (let i = 0; i < ids.length; i += 2) {
    const w = ids[i]
    const b = ids[i + 1]
    const res = db.prepare(`
      INSERT INTO matches (round_id, white_participant_id, black_participant_id, board_no, result, score_white, score_black, source)
      VALUES (?, ?, ?, ?, 'not_played', 0, 0, 'system')
    `).run(roundId, w, b, board)
    matches.push({ id: res.lastInsertRowid as number, round_id: roundId, white_participant_id: w, black_participant_id: b, board_no: board, result: 'not_played', score_white: 0, score_black: 0, source: 'system' })
    board += 1
  }

  if (byeId) {
    const res = db.prepare(`
      INSERT INTO matches (round_id, white_participant_id, black_participant_id, board_no, result, score_white, score_black, source)
      VALUES (?, ?, NULL, ?, 'bye', ?, 0, 'system')
    `).run(roundId, byeId, board, scoring.bye_points)
    matches.push({ id: res.lastInsertRowid as number, round_id: roundId, white_participant_id: byeId, black_participant_id: null, board_no: board, result: 'bye', score_white: scoring.bye_points, score_black: 0, source: 'system' })
  }

  db.prepare(`UPDATE rounds SET status = 'paired', paired_at = CURRENT_TIMESTAMP WHERE id = ?`).run(roundId)
  return matches
}

export function updateMatchResult(matchId: number, result: string): Match | null {
  const row = db.prepare(`
    SELECT m.id, m.round_id, r.tournament_id FROM matches m
    JOIN rounds r ON r.id = m.round_id
    WHERE m.id = ?
  `).get(matchId) as { id: number, round_id: number, tournament_id: number } | undefined
  if (!row) return null

  const scoring = getTournamentScoring(row.tournament_id)
  let sw = 0, sb = 0
  switch (result) {
    case 'white':
    case 'forfeit_black':
      sw = scoring.points_win; sb = scoring.points_loss; break
    case 'black':
    case 'forfeit_white':
      sw = scoring.points_loss; sb = scoring.points_win; break
    case 'draw':
      sw = scoring.points_draw; sb = scoring.points_draw; break
    case 'bye':
      sw = scoring.bye_points; sb = 0; break
    default:
      result = 'not_played'; sw = 0; sb = 0
  }

  db.prepare(`UPDATE matches SET result = ?, score_white = ?, score_black = ? WHERE id = ?`).run(result, sw, sb, matchId)
  const updated = db.prepare(`SELECT * FROM matches WHERE id = ?`).get(matchId) as Match
  return updated
}

// Standings helpers
export function getTournamentById(id: number): Tournament | undefined {
  const row = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(id) as Tournament | undefined
  return row
}

export function getStandings(tournamentId: number): { participant_id: number; nickname: string; points: number }[] {
  const stmt = db.prepare(`
    SELECT tp.id AS participant_id, tp.nickname,
           COALESCE(SUM(
             CASE
               WHEN m.white_participant_id = tp.id THEN m.score_white
               WHEN m.black_participant_id = tp.id THEN m.score_black
               ELSE 0
             END
           ), 0) AS points
    FROM tournament_participants tp
    LEFT JOIN matches m ON m.white_participant_id = tp.id OR m.black_participant_id = tp.id
    LEFT JOIN rounds r ON r.id = m.round_id
    WHERE tp.tournament_id = ? AND (r.tournament_id = tp.tournament_id OR r.id IS NULL)
    GROUP BY tp.id, tp.nickname
    ORDER BY points DESC, tp.nickname ASC
  `)
  const rows = stmt.all(tournamentId) as { participant_id: number; nickname: string; points: number }[]
  return rows
}
