import { Glicko2, type Player } from 'glicko2'
import { supabase } from '../supabase'
import { getUserById, type User } from '../db'

// Types for rating system
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

export interface RatingUpdateResult {
  success: boolean
  newRating: PlayerRating
  historyEntry: RatingHistory
  error?: string
}

export interface MatchResult {
  whitePlayerId: number
  blackPlayerId: number
  result: 'white' | 'black' | 'draw'
  matchId: number
  tournamentId: number
}

export class RatingService {
  private glicko2: Glicko2

  constructor() {
    // Initialize Glicko2 with default parameters
    this.glicko2 = new Glicko2({
      tau: 0.5,        // System constant (reasonable values: 0.3-1.2)
      rating: 1500,    // Default rating
      rd: 350,         // Default rating deviation
      vol: 0.06        // Default volatility
    })
  }

  /**
   * Initialize player rating if not exists
   */
  async initializePlayerRating(userId: number): Promise<PlayerRating | null> {
    try {
      // Check if rating already exists
      const existingRating = await this.getPlayerRating(userId)
      if (existingRating) {
        return existingRating
      }

      // Get user to determine initial rating based on existing ratings
      const user = await getUserById(userId)
      if (!user) {
        throw new Error(`User with ID ${userId} not found`)
      }

      // Calculate initial rating based on existing chess ratings
      const initialRating = this.calculateInitialRating(user)

      // Create new rating entry
      const { data, error } = await supabase
        .from('player_ratings')
        .insert({
          user_id: userId,
          rating: initialRating.rating,
          rd: initialRating.rd,
          volatility: initialRating.volatility,
          games_count: 0,
          wins_count: 0,
          losses_count: 0,
          draws_count: 0,
          rating_period_start: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to initialize player rating: ${error.message}`)
      }

      return data as PlayerRating
    } catch (error) {
      console.error('Error initializing player rating:', error)
      return null
    }
  }

  /**
   * Calculate initial rating based on existing chess ratings
   */
  private calculateInitialRating(user: User): { rating: number; rd: number; volatility: number } {
    // Use unified rating field with confidence-based RD values
    if (user.rating && user.rating > 800) {
      // User has an established rating (above default)
      return {
        rating: user.rating,
        rd: 150,  // Medium confidence for established players
        volatility: 0.06
      }
    } else if (user.rating && user.rating <= 800) {
      // User has default or below-default rating
      return {
        rating: user.rating,
        rd: 250,  // Higher uncertainty for new/unrated players
        volatility: 0.06
      }
    }

    // Fallback to default values (should not happen with NOT NULL constraint)
    return {
      rating: 800,    // Default unified rating
      rd: 350,        // High uncertainty
      volatility: 0.06
    }
  }

  /**
   * Get player rating
   */
  async getPlayerRating(userId: number): Promise<PlayerRating | null> {
    try {
      const { data, error } = await supabase
        .from('player_ratings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw new Error(`Failed to get player rating: ${error.message}`)
      }

      return data as PlayerRating
    } catch (error) {
      console.error('Error getting player rating:', error)
      return null
    }
  }

  /**
   * Update player rating based on match result
   */
  async updateRatingFromMatch(matchResult: MatchResult): Promise<RatingUpdateResult | null> {
    try {
      // Initialize ratings if needed
      const whiteRating = await this.initializePlayerRating(matchResult.whitePlayerId)
      const blackRating = await this.initializePlayerRating(matchResult.blackPlayerId)

      if (!whiteRating || !blackRating) {
        throw new Error('Failed to initialize player ratings')
      }

      // Calculate new ratings using Glicko2
      const whiteUpdate = await this.calculateRatingChange(
        whiteRating,
        blackRating,
        matchResult.result === 'white' ? 1 : matchResult.result === 'draw' ? 0.5 : 0
      )

      const blackUpdate = await this.calculateRatingChange(
        blackRating,
        whiteRating,
        matchResult.result === 'black' ? 1 : matchResult.result === 'draw' ? 0.5 : 0
      )

      // Update ratings in database
      const updatedWhiteRating = await this.updatePlayerRating(whiteUpdate)
      const updatedBlackRating = await this.updatePlayerRating(blackUpdate)

      if (!updatedWhiteRating || !updatedBlackRating) {
        throw new Error('Failed to update player ratings')
      }

      // Create history entries
      const whiteHistory = await this.createRatingHistory({
        userId: matchResult.whitePlayerId,
        oldRating: whiteRating.rating,
        newRating: updatedWhiteRating.rating,
        oldRd: whiteRating.rd,
        newRd: updatedWhiteRating.rd,
        oldVolatility: whiteRating.volatility,
        newVolatility: updatedWhiteRating.volatility,
        matchId: matchResult.matchId,
        tournamentId: matchResult.tournamentId,
        changeReason: 'match_result',
        opponentId: matchResult.blackPlayerId,
        opponentRating: blackRating.rating,
        gameResult: matchResult.result === 'white' ? 'win' : matchResult.result === 'draw' ? 'draw' : 'loss'
      })

      // Create history for black player as well
      await this.createRatingHistory({
        userId: matchResult.blackPlayerId,
        oldRating: blackRating.rating,
        newRating: updatedBlackRating.rating,
        oldRd: blackRating.rd,
        newRd: updatedBlackRating.rd,
        oldVolatility: blackRating.volatility,
        newVolatility: updatedBlackRating.volatility,
        matchId: matchResult.matchId,
        tournamentId: matchResult.tournamentId,
        changeReason: 'match_result',
        opponentId: matchResult.whitePlayerId,
        opponentRating: whiteRating.rating,
        gameResult: matchResult.result === 'black' ? 'win' : matchResult.result === 'draw' ? 'draw' : 'loss'
      })

      return {
        success: true,
        newRating: updatedWhiteRating,
        historyEntry: whiteHistory
      }
    } catch (error) {
      console.error('Error updating rating from match:', error)
      return {
        success: false,
        newRating: {} as PlayerRating,
        historyEntry: {} as RatingHistory,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Calculate rating change using Glicko2 algorithm
   */
  private async calculateRatingChange(
    playerRating: PlayerRating,
    opponentRating: PlayerRating,
    score: number // 1 for win, 0.5 for draw, 0 for loss
  ): Promise<PlayerRating> {
    try {
      // Create Glicko2 players
      const player = this.glicko2.makePlayer(
        playerRating.rating,
        playerRating.rd,
        playerRating.volatility
      )

      const opponent = this.glicko2.makePlayer(
        opponentRating.rating,
        opponentRating.rd,
        opponentRating.volatility
      )

      // Create match and update ratings
      const matches: [Player, Player, number][] = [[player, opponent, score]]
      this.glicko2.updateRatings(matches)

      // Return updated player data
      return {
        ...playerRating,
        rating: player.getRating(),
        rd: player.getRd(),
        volatility: player.getVol(),
        games_count: playerRating.games_count + 1,
        wins_count: playerRating.wins_count + (score === 1 ? 1 : 0),
        losses_count: playerRating.losses_count + (score === 0 ? 1 : 0),
        draws_count: playerRating.draws_count + (score === 0.5 ? 1 : 0),
        last_game_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error calculating rating change:', error)
      throw error
    }
  }

  /**
   * Update player rating in database
   */
  private async updatePlayerRating(updatedRating: PlayerRating): Promise<PlayerRating | null> {
    try {
      const { data, error } = await supabase
        .from('player_ratings')
        .update({
          rating: updatedRating.rating,
          rd: updatedRating.rd,
          volatility: updatedRating.volatility,
          games_count: updatedRating.games_count,
          wins_count: updatedRating.wins_count,
          losses_count: updatedRating.losses_count,
          draws_count: updatedRating.draws_count,
          last_game_at: updatedRating.last_game_at,
          last_updated: updatedRating.last_updated
        })
        .eq('user_id', updatedRating.user_id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update player rating: ${error.message}`)
      }

      return data as PlayerRating
    } catch (error) {
      console.error('Error updating player rating in database:', error)
      return null
    }
  }

  /**
   * Create rating history entry
   */
  private async createRatingHistory(history: {
    userId: number
    oldRating: number
    newRating: number
    oldRd: number
    newRd: number
    oldVolatility: number
    newVolatility: number
    matchId?: number | null
    tournamentId?: number | null
    changeReason: string
    opponentId?: number | null
    opponentRating?: number | null
    gameResult?: string | null
  }): Promise<RatingHistory> {
    try {
      const { data, error } = await supabase
        .from('rating_history')
        .insert({
          user_id: history.userId,
          old_rating: history.oldRating,
          new_rating: history.newRating,
          old_rd: history.oldRd,
          new_rd: history.newRd,
          old_volatility: history.oldVolatility,
          new_volatility: history.newVolatility,
          match_id: history.matchId || null,
          tournament_id: history.tournamentId || null,
          change_reason: history.changeReason,
          opponent_id: history.opponentId || null,
          opponent_rating: history.opponentRating || null,
          game_result: history.gameResult || null
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create rating history: ${error.message}`)
      }

      return data as RatingHistory
    } catch (error) {
      console.error('Error creating rating history:', error)
      throw error
    }
  }

  /**
   * Get rating history for a player
   */
  async getRatingHistory(userId: number, limit: number = 50): Promise<RatingHistory[]> {
    try {
      const { data, error } = await supabase
        .from('rating_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw new Error(`Failed to get rating history: ${error.message}`)
      }

      return (data || []) as RatingHistory[]
    } catch (error) {
      console.error('Error getting rating history:', error)
      return []
    }
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(limit: number = 100): Promise<Array<{
    id: number
    username: string | null
    first_name: string
    last_name: string
    rating: number
    rd: number
    games_count: number
    win_rate: number
    global_rank: number
  }>> {
    try {
      const { data, error } = await supabase
        .from('rating_leaderboard')
        .select('*')
        .limit(limit)

      if (error) {
        throw new Error(`Failed to get leaderboard: ${error.message}`)
      }

      return (data || []) as Array<{
        id: number
        username: string | null
        first_name: string
        last_name: string
        rating: number
        rd: number
        games_count: number
        win_rate: number
        global_rank: number
      }>
    } catch (error) {
      console.error('Error getting leaderboard:', error)
      return []
    }
  }

  /**
   * Predict match outcome between two players
   */
  async predictMatchOutcome(player1Id: number, player2Id: number): Promise<{
    player1WinProbability: number
    drawProbability: number
    player2WinProbability: number
  }> {
    try {
      const player1Rating = await this.getPlayerRating(player1Id)
      const player2Rating = await this.getPlayerRating(player2Id)

      if (!player1Rating || !player2Rating) {
        throw new Error('Player ratings not found')
      }

      // Create Glicko2 players for prediction
      const player1 = this.glicko2.makePlayer(
        player1Rating.rating,
        player1Rating.rd,
        player1Rating.volatility
      )

      const player2 = this.glicko2.makePlayer(
        player2Rating.rating,
        player2Rating.rd,
        player2Rating.volatility
      )

      // Predict outcome
      const player1WinProbability = player1.predict(player2)
      const player2WinProbability = 1 - player1WinProbability
      
      // Estimate draw probability (simplified)
      const drawProbability = Math.min(0.3, 0.1 + Math.abs(player1Rating.rating - player2Rating.rating) / 1000)
      
      // Adjust win probabilities for draws
      const adjustedPlayer1Win = player1WinProbability * (1 - drawProbability)
      const adjustedPlayer2Win = player2WinProbability * (1 - drawProbability)

      return {
        player1WinProbability: adjustedPlayer1Win,
        drawProbability,
        player2WinProbability: adjustedPlayer2Win
      }
    } catch (error) {
      console.error('Error predicting match outcome:', error)
      return {
        player1WinProbability: 0.5,
        drawProbability: 0.1,
        player2WinProbability: 0.4
      }
    }
  }
}

// Export singleton instance
export const ratingService = new RatingService()