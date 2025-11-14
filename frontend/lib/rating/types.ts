// Rating system types and interfaces

export interface PlayerRating {
  id?: number
  user_id: number
  rating: number
  rd: number
  volatility: number
  games_count: number
  wins_count: number
  losses_count: number
  draws_count: number
  last_game_at?: string | null
  rating_period_start: string
  last_updated: string
  created_at?: string
}

export interface RatingHistory {
  id?: number
  user_id: number
  old_rating: number
  new_rating: number
  old_rd: number
  new_rd: number
  old_volatility: number
  new_volatility: number
  rating_change: number
  match_id?: number | null
  tournament_id?: number | null
  change_reason: string
  opponent_id?: number | null
  opponent_rating?: number | null
  game_result?: string | null
  created_at?: string
}

export interface RatingPeriod {
  id?: number
  tournament_id?: number
  name?: string
  start_date: string
  end_date?: string
  status: string
  processed_at?: string | null
  games_processed: number
  players_affected: number
  created_at?: string
}

export interface PlayerRatingStats {
  id?: number
  user_id: number
  highest_rating?: number
  highest_rating_date?: string | null
  lowest_rating?: number
  lowest_rating_date?: string | null
  best_win_opponent_rating?: number
  best_win_date?: string | null
  current_streak: number
  longest_win_streak: number
  longest_loss_streak: number
  rating_volatility: number
  average_opponent_rating?: number
  performance_score?: number
  updated_at: string
}

export interface TournamentRatingAdjustment {
  id?: number
  tournament_id: number
  user_id: number
  adjustment_type: string
  old_rating: number
  new_rating: number
  reason?: string
  adjusted_by?: number | null
  created_at?: string
}

export interface RatingLeaderboardEntry {
  id: number
  username: string | null
  first_name: string
  last_name: string
  rating: number
  rd: number
  volatility: number
  games_count: number
  wins_count: number
  losses_count: number
  draws_count: number
  last_game_at?: string | null
  highest_rating?: number
  lowest_rating?: number
  win_rate: number
  global_rank: number
}

export interface RatingUpdateOptions {
  batchSize?: number
  validateOpponent?: boolean
  createHistory?: boolean
  updateStats?: boolean
}

export interface MatchPrediction {
  player1WinProbability: number
  drawProbability: number
  player2WinProbability: number
}

export interface RatingValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  requiresReview?: boolean
}

export interface RatingUpdateContext {
  matchId?: number
  tournamentId?: number
  opponentId?: number
  gameResult: 'win' | 'loss' | 'draw'
  timestamp: Date
}

export interface PairingConstraints {
  maxRatingDifference: number
  avoidRepeatOpponents: boolean
  balanceColors: boolean
  minQualityScore: number
  maxRatingDiffForTopPlayers: number
}

export interface RatingPairingConfig {
  ratingRange: {
    default: number
    max: number
    expansionRate: number
  }
  waitTime: {
    baseTimeout: number
    maxTimeout: number
    expansionInterval: number
  }
  quality: {
    minQualityScore: number
    balanceColors: boolean
    avoidRepeatOpponents: boolean
    maxRatingDiffForTopPlayers: number
  }
  tournament: {
    swissSystem: boolean
    acceleratedPairings: boolean
    byesHandling: 'random' | 'lowest_rating' | 'highest_rating'
  }
}

// Tournament type configurations
export const TOURNAMENT_RATING_CONFIGS = {
  classical: {
    ratingRange: { default: 100, max: 250, expansionRate: 25 },
    waitTime: { baseTimeout: 15, maxTimeout: 60, expansionInterval: 5 },
    quality: { minQualityScore: 0.7, balanceColors: true, avoidRepeatOpponents: true, maxRatingDiffForTopPlayers: 50 },
    tournament: { swissSystem: true, acceleratedPairings: false, byesHandling: 'lowest_rating' as const }
  },
  rapid: {
    ratingRange: { default: 150, max: 300, expansionRate: 50 },
    waitTime: { baseTimeout: 5, maxTimeout: 30, expansionInterval: 2 },
    quality: { minQualityScore: 0.6, balanceColors: true, avoidRepeatOpponents: false, maxRatingDiffForTopPlayers: 75 },
    tournament: { swissSystem: true, acceleratedPairings: true, byesHandling: 'random' as const }
  },
  blitz: {
    ratingRange: { default: 200, max: 400, expansionRate: 75 },
    waitTime: { baseTimeout: 2, maxTimeout: 15, expansionInterval: 1 },
    quality: { minQualityScore: 0.5, balanceColors: false, avoidRepeatOpponents: false, maxRatingDiffForTopPlayers: 100 },
    tournament: { swissSystem: false, acceleratedPairings: true, byesHandling: 'random' as const }
  }
}

export type TournamentType = 'classical' | 'rapid' | 'blitz'