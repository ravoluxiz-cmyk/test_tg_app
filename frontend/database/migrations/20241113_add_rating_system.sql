-- Rating System Migration
-- Adds Glicko2 rating system tables to the database

-- Table for storing current player ratings using Glicko2 algorithm
CREATE TABLE player_ratings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rating FLOAT NOT NULL DEFAULT 1500,                    -- Current Glicko2 rating
    rd FLOAT NOT NULL DEFAULT 350,                         -- Rating Deviation (точность рейтинга)
    volatility FLOAT NOT NULL DEFAULT 0.06,               -- Volatility (стабильность рейтинга)
    games_count INTEGER DEFAULT 0,                        -- Total games played
    wins_count INTEGER DEFAULT 0,                         -- Total wins
    losses_count INTEGER DEFAULT 0,                       -- Total losses
    draws_count INTEGER DEFAULT 0,                        -- Total draws
    last_game_at TIMESTAMP WITH TIME ZONE,                -- Last game timestamp
    rating_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Table for tracking rating history
CREATE TABLE rating_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    old_rating FLOAT NOT NULL,
    new_rating FLOAT NOT NULL,
    old_rd FLOAT NOT NULL,
    new_rd FLOAT NOT NULL,
    old_volatility FLOAT NOT NULL,
    new_volatility FLOAT NOT NULL,
    rating_change FLOAT NOT NULL,                       -- Calculated change (new - old)
    match_id INTEGER REFERENCES matches(id),              -- Associated match
    tournament_id INTEGER REFERENCES tournaments(id),     -- Associated tournament
    change_reason VARCHAR(50) NOT NULL,                 -- 'match_result', 'tournament_end', 'manual_adjustment'
    opponent_id INTEGER REFERENCES users(id),             -- Opponent in rated match
    opponent_rating FLOAT,                               -- Opponent's rating at time of match
    game_result VARCHAR(10),                             -- 'win', 'loss', 'draw'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_rating_history_user_id (user_id),
    INDEX idx_rating_history_created_at (created_at DESC),
    INDEX idx_rating_history_match_id (match_id),
    INDEX idx_rating_history_tournament_id (tournament_id)
);

-- Table for rating periods (for batch rating calculations)
CREATE TABLE rating_periods (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER REFERENCES tournaments(id),
    name VARCHAR(100),                                    -- Period name/description
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active',                 -- 'active', 'completed', 'processing'
    processed_at TIMESTAMP WITH TIME ZONE,
    games_processed INTEGER DEFAULT 0,
    players_affected INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_rating_periods_tournament_id (tournament_id),
    INDEX idx_rating_periods_status (status),
    INDEX idx_rating_periods_dates (start_date, end_date)
);

-- Table for player rating statistics
CREATE TABLE player_rating_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    highest_rating FLOAT,                                -- Highest rating achieved
    highest_rating_date TIMESTAMP WITH TIME ZONE,        -- When highest rating was achieved
    lowest_rating FLOAT,                                -- Lowest rating achieved
    lowest_rating_date TIMESTAMP WITH TIME ZONE,        -- When lowest rating was achieved
    best_win_opponent_rating FLOAT,                     -- Highest rated opponent beaten
    best_win_date TIMESTAMP WITH TIME ZONE,
    current_streak INTEGER DEFAULT 0,                    -- Current win/loss streak
    longest_win_streak INTEGER DEFAULT 0,               -- Longest win streak
    longest_loss_streak INTEGER DEFAULT 0,              -- Longest loss streak
    rating_volatility FLOAT DEFAULT 0,                  -- Historical volatility measure
    average_opponent_rating FLOAT,                       -- Average opponent rating
    performance_score FLOAT,                             -- Performance in recent games
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Table for tournament-specific rating adjustments
CREATE TABLE tournament_rating_adjustments (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER REFERENCES tournaments(id),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    adjustment_type VARCHAR(50) NOT NULL,              -- 'initial_rating', 'manual_adjustment', 'correction'
    old_rating FLOAT NOT NULL,
    new_rating FLOAT NOT NULL,
    reason TEXT,
    adjusted_by INTEGER REFERENCES users(id),          -- Admin who made adjustment
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_tournament_adjustments_tournament_id (tournament_id),
    INDEX idx_tournament_adjustments_user_id (user_id)
);

-- Function to update player rating statistics
CREATE OR REPLACE FUNCTION update_player_rating_stats(user_id_param INTEGER)
RETURNS VOID AS $$
BEGIN
    WITH user_stats AS (
        SELECT
            user_id,
            MAX(new_rating) as max_rating,
            MIN(new_rating) as min_rating,
            COUNT(CASE WHEN game_result = 'win' THEN 1 END) as total_wins,
            COUNT(CASE WHEN game_result = 'loss' THEN 1 END) as total_losses,
            COUNT(CASE WHEN game_result = 'draw' THEN 1 END) as total_draws,
            AVG(opponent_rating) as avg_opponent_rating
        FROM rating_history
        WHERE user_id = user_id_param
        GROUP BY user_id
    ),
    best_win AS (
        SELECT opponent_rating, created_at
        FROM rating_history
        WHERE user_id = user_id_param AND game_result = 'win'
        ORDER BY opponent_rating DESC
        LIMIT 1
    )
    INSERT INTO player_rating_stats (
        user_id, highest_rating, highest_rating_date, lowest_rating, lowest_rating_date,
        best_win_opponent_rating, best_win_date, average_opponent_rating
    )
    SELECT 
        user_id_param,
        (SELECT max_rating FROM user_stats),
        (SELECT created_at FROM rating_history WHERE user_id = user_id_param AND new_rating = (SELECT max_rating FROM user_stats) ORDER BY created_at DESC LIMIT 1),
        (SELECT min_rating FROM user_stats),
        (SELECT created_at FROM rating_history WHERE user_id = user_id_param AND new_rating = (SELECT min_rating FROM user_stats) ORDER BY created_at ASC LIMIT 1),
        (SELECT opponent_rating FROM best_win),
        (SELECT created_at FROM best_win),
        (SELECT avg_opponent_rating FROM user_stats)
    ON CONFLICT (user_id) DO UPDATE SET
        highest_rating = EXCLUDED.highest_rating,
        highest_rating_date = EXCLUDED.highest_rating_date,
        lowest_rating = EXCLUDED.lowest_rating,
        lowest_rating_date = EXCLUDED.lowest_rating_date,
        best_win_opponent_rating = EXCLUDED.best_win_opponent_rating,
        best_win_date = EXCLUDED.best_win_date,
        average_opponent_rating = EXCLUDED.average_opponent_rating,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to calculate rating change
CREATE OR REPLACE FUNCTION calculate_rating_change(
    old_rating FLOAT,
    new_rating FLOAT
) RETURNS FLOAT AS $$
BEGIN
    RETURN new_rating - old_rating;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to automatically update rating change in history
CREATE OR REPLACE FUNCTION set_rating_change()
RETURNS TRIGGER AS $$
BEGIN
    NEW.rating_change = calculate_rating_change(NEW.old_rating, NEW.new_rating);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_rating_change
    BEFORE INSERT ON rating_history
    FOR EACH ROW
    EXECUTE FUNCTION set_rating_change();

-- Trigger to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_player_rating_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_player_rating_timestamp
    BEFORE UPDATE ON player_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_player_rating_timestamp();

-- Trigger to update player stats after rating history insert
CREATE OR REPLACE FUNCTION update_stats_after_rating_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_player_rating_stats(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stats_after_rating_change
    AFTER INSERT ON rating_history
    FOR EACH ROW
    EXECUTE FUNCTION update_stats_after_rating_change();

-- Indexes for performance optimization
CREATE INDEX idx_player_ratings_rating ON player_ratings(rating DESC);
CREATE INDEX idx_player_ratings_rd ON player_ratings(rd);
CREATE INDEX idx_player_ratings_games_count ON player_ratings(games_count DESC);
CREATE INDEX idx_player_ratings_last_updated ON player_ratings(last_updated DESC);

-- View for leaderboard
CREATE OR REPLACE VIEW rating_leaderboard AS
SELECT 
    u.id,
    u.username,
    u.first_name,
    u.last_name,
    pr.rating,
    pr.rd,
    pr.volatility,
    pr.games_count,
    pr.wins_count,
    pr.losses_count,
    pr.draws_count,
    pr.last_game_at,
    prs.highest_rating,
    prs.lowest_rating,
    CASE 
        WHEN pr.games_count > 0 THEN 
            ROUND((pr.wins_count::FLOAT / pr.games_count) * 100, 2)
        ELSE 0
    END as win_rate,
    RANK() OVER (ORDER BY pr.rating DESC) as global_rank
FROM users u
JOIN player_ratings pr ON u.id = pr.user_id
LEFT JOIN player_rating_stats prs ON u.id = prs.user_id
WHERE pr.games_count > 0
ORDER BY pr.rating DESC;

-- View for recent rating changes
CREATE OR REPLACE VIEW recent_rating_changes AS
SELECT 
    rh.id,
    rh.user_id,
    u.username,
    rh.old_rating,
    rh.new_rating,
    rh.rating_change,
    rh.rd,
    rh.volatility,
    rh.match_id,
    rh.tournament_id,
    rh.change_reason,
    rh.opponent_id,
    rh.opponent_rating,
    rh.game_result,
    rh.created_at,
    t.title as tournament_title
FROM rating_history rh
JOIN users u ON rh.user_id = u.id
LEFT JOIN tournaments t ON rh.tournament_id = t.id
WHERE rh.created_at >= NOW() - INTERVAL '30 days'
ORDER BY rh.created_at DESC;