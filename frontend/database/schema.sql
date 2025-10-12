-- Schema for RepChess User Profiles
-- This file defines the database structure for user profiles

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id BIGINT UNIQUE NOT NULL,        -- Telegram user ID (unique identifier)
  username TEXT,                              -- Telegram username (optional)
  first_name TEXT NOT NULL,                   -- User's first name
  last_name TEXT NOT NULL,                    -- User's last name
  fide_rating INTEGER,                        -- FIDE chess rating
  chesscom_rating INTEGER,                    -- Chess.com rating
  lichess_rating INTEGER,                     -- Lichess rating
  chesscom_url TEXT,                          -- Chess.com profile URL
  lichess_url TEXT,                           -- Lichess profile URL
  bio TEXT,                                   -- Profile bio/description
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by telegram_id
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
