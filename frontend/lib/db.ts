import Database from "better-sqlite3"
import fs from "fs"
import path from "path"

const DB_PATH = path.join(process.cwd(), "database", "repchess.db")
const SCHEMA_PATH = path.join(process.cwd(), "database", "schema.sql")

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
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
      const schema = fs.readFileSync(SCHEMA_PATH, "utf-8")
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
