-- RepChess Full Supabase Migration
-- This migration creates all tables and imports existing data
-- Run this in your Supabase SQL Editor

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PART 1: SCHEMA CREATION
-- ============================================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups by telegram_id
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id BIGSERIAL PRIMARY KEY,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tournament participants table
CREATE TABLE IF NOT EXISTS tournament_participants (
  id BIGSERIAL PRIMARY KEY,
  tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, nickname)
);

-- Rounds table
CREATE TABLE IF NOT EXISTS rounds (
  id BIGSERIAL PRIMARY KEY,
  tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paired_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  UNIQUE(tournament_id, number)
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id BIGSERIAL PRIMARY KEY,
  round_id BIGINT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  white_participant_id BIGINT REFERENCES tournament_participants(id) ON DELETE SET NULL,
  black_participant_id BIGINT REFERENCES tournament_participants(id) ON DELETE SET NULL,
  board_no INTEGER,
  result TEXT NOT NULL DEFAULT 'not_played',
  score_white REAL NOT NULL DEFAULT 0,
  score_black REAL NOT NULL DEFAULT 0,
  source TEXT,
  notes TEXT
);

-- Leaderboard table (snapshot of final standings when a tournament is auto-finished)
CREATE TABLE IF NOT EXISTS leaderboard (
  id BIGSERIAL PRIMARY KEY,
  tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  participant_id BIGINT NOT NULL REFERENCES tournament_participants(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  points REAL NOT NULL,
  rank INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, participant_id)
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 2: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow service role to do everything
CREATE POLICY "Service role can do everything on users"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything on tournaments"
  ON tournaments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything on tournament_participants"
  ON tournament_participants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything on rounds"
  ON rounds
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything on matches"
  ON matches
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything on leaderboard"
  ON leaderboard
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public read access (anon role can read)
CREATE POLICY "Public can read users"
  ON users
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can read tournaments"
  ON tournaments
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can read tournament_participants"
  ON tournament_participants
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can read rounds"
  ON rounds
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can read matches"
  ON matches
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can read leaderboard"
  ON leaderboard
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================================
-- PART 3: DATA IMPORT (from existing SQLite database)
-- ============================================================================

BEGIN;

-- Users data
INSERT INTO users (telegram_id, username, first_name, last_name, fide_rating, chesscom_rating, lichess_rating, chesscom_url, lichess_url, bio, role, created_at, updated_at)
VALUES
  (123456789, 'testuser', 'Test', 'User', NULL, NULL, NULL, NULL, NULL, NULL, 'user', '2025-10-12 11:07:03', '2025-10-12 13:47:41')
ON CONFLICT (telegram_id) DO NOTHING;

-- Tournaments data
INSERT INTO tournaments (title, format, points_win, points_loss, points_draw, bye_points, rounds, tiebreakers, team_mode, allow_join, allow_edit_results, allow_danger_changes, forbid_repeat_bye, late_join_points, hide_rating, hide_new_rating, compute_performance, hide_color_names, show_opponent_names, archived, creator_telegram_id, created_at)
VALUES
  ('My Tournament', 'swiss_fide_javafo', 1.0, 0.0, 0.5, 0.0, 5, 'head_to_head, buchholz_cut1, buchholz', 'none', 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, NULL, '2025-10-12 12:58:22'),
  ('Test Tournament', 'swiss_fide_javafo', 1.0, 0.0, 0.5, 0.0, 5, 'head_to_head, buchholz_cut1, buchholz', 'none', 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, NULL, '2025-10-12 13:12:29'),
  ('My Tournament', 'swiss_fide_javafo', 1.0, 0.0, 0.5, 0.0, 5, 'head_to_head, buchholz_cut1, buchholz', 'none', 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, NULL, '2025-10-12 13:13:00');

-- Tournament participants data
INSERT INTO tournament_participants (tournament_id, user_id, nickname, created_at)
VALUES
  (1, (SELECT id FROM users WHERE telegram_id = 123456789), '123', '2025-10-12 12:58:27'),
  (1, (SELECT id FROM users WHERE telegram_id = 123456789), 'baby pussy', '2025-10-12 12:58:36'),
  (1, (SELECT id FROM users WHERE telegram_id = 123456789), 'mr jopa', '2025-10-12 12:58:42'),
  (1, (SELECT id FROM users WHERE telegram_id = 123456789), 'holy moly', '2025-10-12 12:58:48'),
  (1, (SELECT id FROM users WHERE telegram_id = 123456789), 'ебаная жопа осла', '2025-10-12 12:58:56'),
  (1, (SELECT id FROM users WHERE telegram_id = 123456789), 'hello', '2025-10-12 12:59:03'),
  (1, (SELECT id FROM users WHERE telegram_id = 123456789), 'sdfsdfsdf', '2025-10-12 12:59:06'),
  (1, (SELECT id FROM users WHERE telegram_id = 123456789), 'пизда рез', '2025-10-12 12:59:12'),
  (1, (SELECT id FROM users WHERE telegram_id = 123456789), 'долбоящер', '2025-10-12 12:59:17'),
  (3, (SELECT id FROM users WHERE telegram_id = 123456789), 'попа', '2025-10-12 13:13:05'),
  (3, (SELECT id FROM users WHERE telegram_id = 123456789), 'жопа', '2025-10-12 13:13:09'),
  (3, (SELECT id FROM users WHERE telegram_id = 123456789), 'попа1', '2025-10-12 13:13:15'),
  (3, (SELECT id FROM users WHERE telegram_id = 123456789), 'жопа1', '2025-10-12 13:13:19'),
  (3, (SELECT id FROM users WHERE telegram_id = 123456789), 'попа11', '2025-10-12 13:13:25'),
  (3, (SELECT id FROM users WHERE telegram_id = 123456789), 'жопа12', '2025-10-12 13:13:30'),
  (3, (SELECT id FROM users WHERE telegram_id = 123456789), 'срачка', '2025-10-12 13:13:38')
ON CONFLICT (tournament_id, nickname) DO NOTHING;

-- Rounds data
INSERT INTO rounds (tournament_id, number, status, created_at, paired_at, locked_at)
VALUES
  (1, 1, 'planned', '2025-10-12 13:02:08', NULL, NULL),
  (1, 2, 'planned', '2025-10-12 13:06:00', NULL, NULL),
  (3, 1, 'paired', '2025-10-12 13:13:50', '2025-10-12 13:13:51', NULL)
ON CONFLICT (tournament_id, number) DO NOTHING;

COMMIT;

-- ============================================================================
-- PART 4: VERIFICATION
-- ============================================================================

-- Verify data import
DO $$
DECLARE
  user_count INTEGER;
  tournament_count INTEGER;
  participant_count INTEGER;
  round_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users;
  SELECT COUNT(*) INTO tournament_count FROM tournaments;
  SELECT COUNT(*) INTO participant_count FROM tournament_participants;
  SELECT COUNT(*) INTO round_count FROM rounds;

  RAISE NOTICE '=======================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE '=======================================';
  RAISE NOTICE 'Users imported: %', user_count;
  RAISE NOTICE 'Tournaments imported: %', tournament_count;
  RAISE NOTICE 'Participants imported: %', participant_count;
  RAISE NOTICE 'Rounds imported: %', round_count;
  RAISE NOTICE '=======================================';
END $$;
