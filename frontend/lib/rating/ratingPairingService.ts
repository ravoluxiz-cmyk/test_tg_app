import { supabase } from '../supabase'
import { type Tournament } from '../db'
import { ratingService } from './ratingService'
import { 
  type PairingConstraints,
  type RatingPairingConfig,
  TOURNAMENT_RATING_CONFIGS,
  type TournamentType
} from './types'
import type { TournamentParticipant } from '../db'

export interface RatingAwarePairing {
  whiteParticipant: TournamentParticipant
  blackParticipant: TournamentParticipant
  ratingDifference: number
  qualityScore: number
  colorBalance: number
}

export class RatingPairingService {
  private readonly DEFAULT_MAX_RATING_DIFF = 200
  private readonly QUALITY_SCORE_THRESHOLD = 0.6
  private readonly TOP_PLAYER_RATING_THRESHOLD = 2200

  /**
   * Find optimal pairings based on ratings
   */
  async findRatingAwarePairings(
    tournamentId: number,
    _roundNumber: number, // Currently unused but kept for future round-specific logic
    participants: TournamentParticipant[],
    config?: Partial<RatingPairingConfig>
  ): Promise<RatingAwarePairing[]> {
    try {
      // Get tournament configuration
      const tournament = await this.getTournamentConfig(tournamentId)
      const tournamentConfig = this.getTournamentPairingConfig(tournament, config)

      // Get participant ratings
      const ratings = await this.getParticipantRatings(participants)
      
      // Filter out participants without ratings if required
      const validParticipants = this.filterParticipantsByRating(participants, ratings, tournamentConfig)
      
      if (validParticipants.length < 2) {
        return []
      }

      // Sort by rating for optimal pairing
      const sortedParticipants = this.sortByRating(validParticipants, ratings)
      
      // Generate pairings
      const pairings = await this.generateOptimalPairings(
        sortedParticipants,
        ratings,
        tournamentConfig,
        _roundNumber
      )

      return pairings
    } catch (error) {
      console.error('Error finding rating-aware pairings:', error)
      return []
    }
  }

  /**
   * Get tournament configuration
   */
  private async getTournamentConfig(tournamentId: number): Promise<Tournament | null> {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single()

      if (error) {
        throw new Error(`Failed to get tournament: ${error.message}`)
      }

      return data as Tournament
    } catch (error) {
      console.error('Error getting tournament config:', error)
      return null
    }
  }

  /**
   * Get tournament pairing configuration
   */
  private getTournamentPairingConfig(
    tournament: Tournament | null,
    customConfig?: Partial<RatingPairingConfig>
  ): RatingPairingConfig {
    // Determine tournament type based on format
    const format = tournament?.format?.toLowerCase() || 'classical'
    let tournamentType: TournamentType = 'classical'
    
    if (format.includes('blitz')) tournamentType = 'blitz'
    else if (format.includes('rapid')) tournamentType = 'rapid'
    
    const baseConfig = TOURNAMENT_RATING_CONFIGS[tournamentType]
    
    return {
      ...baseConfig,
      ...customConfig,
      ratingRange: { ...baseConfig.ratingRange, ...customConfig?.ratingRange },
      waitTime: { ...baseConfig.waitTime, ...customConfig?.waitTime },
      quality: { ...baseConfig.quality, ...customConfig?.quality },
      tournament: { ...baseConfig.tournament, ...customConfig?.tournament }
    }
  }

  /**
   * Get participant ratings
   */
  private async getParticipantRatings(participants: TournamentParticipant[]): Promise<Map<number, number>> {
    const ratings = new Map<number, number>()
    
    for (const participant of participants) {
      const rating = await ratingService.getPlayerRating(participant.user_id)
      if (rating) {
        ratings.set(participant.user_id, rating.rating)
      } else {
        // Initialize rating if not exists
        const newRating = await ratingService.initializePlayerRating(participant.user_id)
        if (newRating) {
          ratings.set(participant.user_id, newRating.rating)
        }
      }
    }
    
    return ratings
  }

  /**
   * Filter participants by rating requirements
   */
  private filterParticipantsByRating(
    participants: TournamentParticipant[],
    ratings: Map<number, number>,
    _config: RatingPairingConfig // Currently unused but kept for future use
  ): TournamentParticipant[] {
    return participants.filter(participant => {
      const rating = ratings.get(participant.user_id)
      return rating !== undefined && rating >= 800 // Minimum rating requirement
    })
  }

  /**
   * Sort participants by rating
   */
  private sortByRating(
    participants: TournamentParticipant[],
    ratings: Map<number, number>
  ): TournamentParticipant[] {
    return [...participants].sort((a, b) => {
      const ratingA = ratings.get(a.user_id) || 0
      const ratingB = ratings.get(b.user_id) || 0
      return ratingB - ratingA // Sort descending by rating
    })
  }

  /**
   * Generate optimal pairings
   */
  private async generateOptimalPairings(
    participants: TournamentParticipant[],
    ratings: Map<number, number>,
    config: RatingPairingConfig,
    roundNumber: number
  ): Promise<RatingAwarePairing[]> {
    const pairings: RatingAwarePairing[] = []
    const used = new Set<number>()

    // Try to pair participants with similar ratings
    for (let i = 0; i < participants.length - 1; i++) {
      if (used.has(participants[i].user_id)) continue

      const player1 = participants[i]
      const player1Rating = ratings.get(player1.user_id) || 0

      // Find best opponent
      let bestOpponent: TournamentParticipant | null = null
      let bestScore = -1

      for (let j = i + 1; j < participants.length; j++) {
        if (used.has(participants[j].user_id)) continue

        const player2 = participants[j]
        const player2Rating = ratings.get(player2.user_id) || 0
        const ratingDiff = Math.abs(player1Rating - player2Rating)

        // Check rating difference constraint
        if (ratingDiff > config.ratingRange.max) continue

        // Calculate pairing quality score
        const qualityScore = this.calculatePairingQuality(
          player1Rating,
          player2Rating,
          ratingDiff,
          config
        )

        if (qualityScore > bestScore) {
          bestScore = qualityScore
          bestOpponent = player2
        }
      }

      if (bestOpponent && bestScore >= config.quality.minQualityScore) {
        const opponentRating = ratings.get(bestOpponent.user_id) || 0
        const colorBalance = this.calculateColorBalance(player1.user_id, bestOpponent.user_id)

        pairings.push({
          whiteParticipant: player1,
          blackParticipant: bestOpponent,
          ratingDifference: Math.abs(player1Rating - opponentRating),
          qualityScore: bestScore,
          colorBalance
        })

        used.add(player1.user_id)
        used.add(bestOpponent.user_id)
      }
    }

    return pairings
  }

  /**
   * Calculate pairing quality score
   */
  private calculatePairingQuality(
    rating1: number,
    rating2: number,
    ratingDiff: number,
    config: RatingPairingConfig
  ): number {
    // Closeness score (higher is better)
    const maxDiff = config.ratingRange.max
    const closenessScore = 1 - (ratingDiff / maxDiff)

    // Rating balance score (prefer balanced ratings)
    const avgRating = (rating1 + rating2) / 2
    const balanceScore = 1 - Math.abs(rating1 - rating2) / avgRating

    // Combined score
    return (closenessScore * 0.7) + (balanceScore * 0.3)
  }

  /**
   * Calculate color balance score
   */
  private calculateColorBalance(_player1Id: number, _player2Id: number): number {
    // For now, return a simple balance score
    // This could be enhanced with actual color history tracking
    return 0.5 // Neutral balance
  }

  /**
   * Get rating-based pairing recommendations
   */
  async getPairingRecommendations(
    tournamentId: number,
    userId: number,
    maxOpponents: number = 5
  ): Promise<Array<{
    opponentId: number
    opponentName: string
    opponentRating: number
    ratingDifference: number
    expectedScore: number
    qualityScore: number
  }>> {
    try {
      // Get user rating
      const userRating = await ratingService.getPlayerRating(userId)
      if (!userRating) {
        return []
      }

      // Get tournament participants
      const { data: participants } = await supabase
        .from('tournament_participants')
        .select('*, user:users(*)')
        .eq('tournament_id', tournamentId)
        .neq('user_id', userId)

      if (!participants || participants.length === 0) {
        return []
      }

      const recommendations = []

      for (const participant of participants) {
        const opponentRating = await ratingService.getPlayerRating(participant.user_id)
        if (!opponentRating) continue

        const ratingDiff = Math.abs(userRating.rating - opponentRating.rating)
        const expectedScore = this.calculateExpectedScore(userRating.rating, opponentRating.rating)
        const qualityScore = this.calculatePairingQuality(
          userRating.rating,
          opponentRating.rating,
          ratingDiff,
          TOURNAMENT_RATING_CONFIGS.classical // Use default config
        )

        recommendations.push({
          opponentId: participant.user_id,
          opponentName: participant.user.first_name + ' ' + participant.user.last_name,
          opponentRating: opponentRating.rating,
          ratingDifference: ratingDiff,
          expectedScore,
          qualityScore
        })
      }

      // Sort by quality score and rating difference
      return recommendations
        .sort((a, b) => {
          if (Math.abs(a.qualityScore - b.qualityScore) > 0.1) {
            return b.qualityScore - a.qualityScore
          }
          return a.ratingDifference - b.ratingDifference
        })
        .slice(0, maxOpponents)

    } catch (error) {
      console.error('Error getting pairing recommendations:', error)
      return []
    }
  }

  /**
   * Calculate expected score using Elo-like formula
   */
  private calculateExpectedScore(playerRating: number, opponentRating: number): number {
    const ratingDiff = opponentRating - playerRating
    return 1 / (1 + Math.pow(10, ratingDiff / 400))
  }

  /**
   * Validate pairing constraints
   */
  validatePairingConstraints(
    player1Rating: number,
    player2Rating: number,
    constraints: PairingConstraints
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = []
    const ratingDiff = Math.abs(player1Rating - player2Rating)

    // Check rating difference
    if (ratingDiff > constraints.maxRatingDifference) {
      issues.push(`Rating difference too large: ${ratingDiff} > ${constraints.maxRatingDifference}`)
    }

    // Check if both players are top-rated
    if (player1Rating > this.TOP_PLAYER_RATING_THRESHOLD && player2Rating > this.TOP_PLAYER_RATING_THRESHOLD) {
      if (ratingDiff > constraints.maxRatingDiffForTopPlayers) {
        issues.push(`Top players rating difference too large: ${ratingDiff} > ${constraints.maxRatingDiffForTopPlayers}`)
      }
    }

    return {
      valid: issues.length === 0,
      issues
    }
  }
}

// Export singleton instance
export const ratingPairingService = new RatingPairingService()