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
