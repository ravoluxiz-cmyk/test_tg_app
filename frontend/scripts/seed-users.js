#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// Seed test users into SQLite with safe defaults.
// Usage:
//   node frontend/scripts/seed-users.js --db=/absolute/path/to/repchess.db [--count=20] [--base-id=700000000]
// Or set env: DATABASE_PATH=/absolute/path/to/repchess.db

const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {}
  for (const a of args) {
    const m = a.match(/^--([^=]+)=(.*)$/)
    if (m) opts[m[1]] = m[2]
    else if (a === '--dry-run') opts.dryRun = true
  }
  return opts
}

function usageAndExit() {
  console.error('Usage: node frontend/scripts/seed-users.js --db=/absolute/path/to/repchess.db [--count=20] [--base-id=700000000] [--dry-run]')
  console.error('Or set env: DATABASE_PATH=/absolute/path/to/repchess.db')
  process.exit(1)
}

function resolveDbPath(opts) {
  const envPath = process.env.DATABASE_PATH
  const cliPath = opts.db
  const dbPath = (cliPath && cliPath.trim()) || (envPath && envPath.trim())
  if (!dbPath) usageAndExit()
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    throw new Error(`Directory does not exist: ${dir}`)
  }
  return dbPath
}

function ensureUsersTableWithRole(db) {
  const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get()
  if (!table) {
    db.exec(`
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
        role TEXT NOT NULL DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
    `)
    return
  }
  // Ensure 'role' column exists
  const cols = db.prepare('PRAGMA table_info(users)').all()
  const hasRole = cols.some(c => c.name === 'role')
  if (!hasRole) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'")
  }
}

function seedUsers(db, { count, baseId, dryRun }) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO users (
      telegram_id, username, first_name, last_name,
      fide_rating, chesscom_rating, lichess_rating,
      chesscom_url, lichess_url, bio, role
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  let inserted = 0
  let skipped = 0
  for (let i = 1; i <= count; i++) {
    const role = i <= 5 ? 'admin' : i <= 10 ? 'moderator' : 'user'
    const tgId = baseId + i
    if (dryRun) {
      console.log(`[dry-run] would insert`, { tgId, username: `test${i}`, role })
      continue
    }
    const res = insert.run(
      tgId,
      `test${i}`,
      `Тест${i}`,
      `Пользователь${i}`,
      null,
      null,
      null,
      null,
      null,
      `Сидер ${i}`,
      role
    )
    if (res.changes) inserted++
    else skipped++
  }
  return { inserted, skipped }
}

function main() {
  try {
    const opts = parseArgs()
    const dbPath = resolveDbPath(opts)
    const count = Number(opts.count || 20)
    const baseId = Number(opts['base-id'] || 700000000)
    const dryRun = !!opts.dryRun

    if (!Number.isFinite(count) || count <= 0) throw new Error('Invalid --count')
    if (!Number.isFinite(baseId) || baseId <= 0) throw new Error('Invalid --base-id')

    console.log(`Using database: ${dbPath}`)
    const db = new Database(dbPath)
    db.pragma('foreign_keys = ON')

    ensureUsersTableWithRole(db)
    const { inserted, skipped } = seedUsers(db, { count, baseId, dryRun })
    console.log(`Done. Inserted: ${inserted}, skipped (existing): ${skipped}${dryRun ? ' [dry-run]' : ''}`)
    db.close()
  } catch (e) {
    console.error('Seeding failed:', e.message || e)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}