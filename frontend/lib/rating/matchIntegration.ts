import { supabase } from '../supabase'
import { ratingService } from './ratingService'
import { type Match, type TournamentParticipant, type User } from '../db'
import type { RatingHistory } from './ratingService'

/**
 * Enhanced match result update with rating system integration
 */
export interface MatchResultUpdate {
  matchId: number
  result: string
  whiteParticipantId: number
  blackParticipantId: number
  tournamentId: number
  roundId: number
}

/**
 * Get match participants for rating update
 */
async function getMatchParticipants(matchId: number): Promise<{
  whiteParticipant?: TournamentParticipant & { user: User }
  blackParticipant?: TournamentParticipant & { user: User }
  tournamentId: number
} | null> {
  try {
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .select(`
        *,
        rounds!inner(tournament_id),
        white:tournament_participants!white_participant_id(*, user:users(*)),
        black:tournament_participants!black_participant_id(*, user:users(*))
      `)
      .eq('id', matchId)
      .single()

    if (matchError || !matchData) {
      console.error('Match not found:', matchError)
      return null
    }

    const match = matchData as Match & {
      rounds?: Array<{ tournament_id: number }>
      white?: TournamentParticipant[]
      black?: TournamentParticipant[]
    }
    const tournamentId = match.rounds?.[0]?.tournament_id

    if (!tournamentId) {
      console.error('Tournament ID not found in match data')
      return null
    }

    return {
      whiteParticipant: match.white?.[0] as (TournamentParticipant & { user: User }) | undefined,
      blackParticipant: match.black?.[0] as (TournamentParticipant & { user: User }) | undefined,
      tournamentId
    }
  } catch (error) {
    console.error('Error getting match participants:', error)
    return null
  }
}

/**
 * Process match result and update ratings
 */
export async function processMatchResultWithRatings(
  matchId: number,
  result: string
): Promise<{
  success: boolean
  match?: Match
  ratingUpdates?: Array<{
    userId: number
    oldRating: number
    newRating: number
    change: number
  }>
  error?: string
}> {
  try {
    // Get match participants
    const participants = await getMatchParticipants(matchId)
    if (!participants || !participants.whiteParticipant || !participants.blackParticipant) {
      return {
        success: false,
        error: 'Could not find match participants'
      }
    }

    const whiteUserId = participants.whiteParticipant.user_id
    const blackUserId = participants.blackParticipant.user_id
    const tournamentId = participants.tournamentId

    // Convert result to rating format
    let ratingResult: 'white' | 'black' | 'draw'
    switch (result) {
      case 'white':
      case 'forfeit_black':
        ratingResult = 'white'
        break
      case 'black':
      case 'forfeit_white':
        ratingResult = 'black'
        break
      case 'draw':
        ratingResult = 'draw'
        break
      case 'bye':
        // Don't update ratings for byes
        return {
          success: true,
          ratingUpdates: []
        }
      default:
        return {
          success: false,
          error: 'Invalid result for rating update'
        }
    }

    // Store old ratings for response
    const oldWhiteRating = await ratingService.getPlayerRating(whiteUserId)
    const oldBlackRating = await ratingService.getPlayerRating(blackUserId)

    // Update ratings
    const ratingUpdate = await ratingService.updateRatingFromMatch({
      whitePlayerId: whiteUserId,
      blackPlayerId: blackUserId,
      result: ratingResult,
      matchId,
      tournamentId
    })

    if (!ratingUpdate || !ratingUpdate.success) {
      console.error('Rating update failed:', ratingUpdate?.error)
      return {
        success: false,
        error: `Rating update failed: ${ratingUpdate?.error || 'Unknown error'}`
      }
    }

    // Prepare rating updates response
    const ratingUpdates = []
    if (oldWhiteRating) {
      ratingUpdates.push({
        userId: whiteUserId,
        oldRating: oldWhiteRating.rating,
        newRating: ratingUpdate.newRating.rating,
        change: ratingUpdate.newRating.rating - oldWhiteRating.rating
      })
    }
    if (oldBlackRating) {
      ratingUpdates.push({
        userId: blackUserId,
        oldRating: oldBlackRating.rating,
        newRating: ratingUpdate.newRating.rating,
        change: ratingUpdate.newRating.rating - oldBlackRating.rating
      })
    }

    return {
      success: true,
      ratingUpdates
    }

  } catch (error) {
    console.error('Error processing match result with ratings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get user ID by telegram ID
 * @deprecated Currently unused - kept for future telegram integration
 */
// async function getUserIdByTelegramId(telegramId: number): Promise<number | null> {
//   try {
//     const { data, error } = await supabase
//       .from('users')
//       .select('id')
//       .eq('telegram_id', telegramId)
//       .single()

//     if (error || !data) {
//       console.error('User not found:', error)
//       return null
//     }

//     return data.id
//   } catch (error) {
//     console.error('Error getting user by telegram ID:', error)
//     return null
//   }
// }

/**
 * Validate if user can participate in rated matches
 */
export async function validateRatingEligibility(userId: number): Promise<{
  eligible: boolean
  errors: string[]
  warnings: string[]
}> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('rating')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return {
        eligible: false,
        errors: ['User not found'],
        warnings: []
      }
    }

    const errors: string[] = []
    const warnings: string[] = []

    // Check if user has valid rating
    const hasRating = user.rating && user.rating >= 100 && user.rating <= 3000
    if (!hasRating) {
      errors.push('User must have a valid chess rating (100-3000)')
    }

    // Check minimum rating (if needed)
    const minRating = 800
    if (user.rating < minRating) {
      warnings.push(`Low rating (${user.rating}) may affect pairing quality`)
    }

    return {
      eligible: errors.length === 0,
      errors,
      warnings
    }
  } catch (error) {
    console.error('Error validating rating eligibility:', error)
    return {
      eligible: false,
      errors: ['Validation error occurred'],
      warnings: []
    }
  }
}

/**
 * Get rating statistics for a user
 */
export async function getUserRatingStats(userId: number): Promise<{
  currentRating?: number
  highestRating?: number
  lowestRating?: number
  gamesPlayed: number
  winRate: number
  averageOpponentRating?: number
  ratingTrend: 'up' | 'down' | 'stable'
} | null> {
  try {
    const rating = await ratingService.getPlayerRating(userId)
    if (!rating) {
      return null
    }

    // Get recent history for trend analysis
    const { data: recentHistory } = await supabase
      .from('rating_history')
      .select('new_rating, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Calculate trend
    let ratingTrend: 'up' | 'down' | 'stable' = 'stable'
    if (recentHistory && recentHistory.length >= 3) {
      const recent = recentHistory.slice(0, 3)
      const avgRecent = recent.reduce((sum: number, h: RatingHistory) => sum + h.new_rating, 0) / recent.length
      const avgPrevious = recentHistory.length >= 6 
        ? recentHistory.slice(3, 6).reduce((sum: number, h: RatingHistory) => sum + h.new_rating, 0) / 3
        : rating.rating
      
      if (avgRecent > avgPrevious + 20) ratingTrend = 'up'
      else if (avgRecent < avgPrevious - 20) ratingTrend = 'down'
    }

    // Get stats from player_rating_stats
    const { data: stats } = await supabase
      .from('player_rating_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    return {
      currentRating: rating.rating,
      highestRating: stats?.highest_rating,
      lowestRating: stats?.lowest_rating,
      gamesPlayed: rating.games_count,
      winRate: rating.games_count > 0 
        ? (rating.wins_count / rating.games_count) * 100 
        : 0,
      averageOpponentRating: stats?.average_opponent_rating,
      ratingTrend
    }
  } catch (error) {
    console.error('Error getting user rating stats:', error)
    return null
  }
}