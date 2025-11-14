import { supabase } from '../supabase'
import { getUserById } from '../db'
import type { User } from '../db'
import type { RatingValidationResult, RatingHistory } from './types'

export class RatingValidator {
  private readonly MIN_RATING_FOR_TOURNAMENT = 800
  private readonly MAX_RATING_DIFFERENCE = 400
  private readonly MAX_RATING_CHANGE = 200
  private readonly MIN_TIME_BETWEEN_UPDATES = 60 // seconds
  private readonly SUSPICIOUS_ACTIVITY_THRESHOLD = 10 // matches per hour

  /**
   * Validate user eligibility for rated tournaments
   */
  async validateTournamentEligibility(userId: number): Promise<RatingValidationResult> {
    try {
      const user = await getUserById(userId)
      if (!user) {
        return {
          isValid: false,
          errors: ['User not found'],
          warnings: []
        }
      }

      const errors: string[] = []
      const warnings: string[] = []

      // Check if user has required rating
      if (!this.hasRequiredRating(user)) {
        errors.push('Необходимо указать хотя бы один рейтинг (FIDE, Chess.com или Lichess)')
      }

      // Check minimum rating
      const effectiveRating = this.getEffectiveRating(user)
      if (effectiveRating < this.MIN_RATING_FOR_TOURNAMENT) {
        errors.push(`Минимальный рейтинг для участия в турнирах: ${this.MIN_RATING_FOR_TOURNAMENT}`)
      }

      // Check rating consistency
      if (!this.validateRatingConsistency(user)) {
        warnings.push('Рейтинги не проходят проверку достоверности')
      }

      // Check for suspicious activity
      const suspiciousActivity = await this.checkSuspiciousActivity(userId)
      if (suspiciousActivity.isSuspicious) {
        warnings.push(`Подозрительная активность: ${suspiciousActivity.details}`)
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        requiresReview: warnings.length > 2
      }
    } catch (_error) {
      console.error('Error validating tournament eligibility:', _error)
      return {
        isValid: false,
        errors: ['Validation error occurred'],
        warnings: []
      }
    }
  }

  /**
   * Validate rating update
   */
  async validateRatingUpdate(
    userId: number,
    oldRating: number,
    newRating: number,
    context: { matchId?: number; tournamentId?: number }
  ): Promise<RatingValidationResult> {
    try {
      const errors: string[] = []
      const warnings: string[] = []

      // Check rating change magnitude
      const ratingChange = Math.abs(newRating - oldRating)
      if (ratingChange > this.MAX_RATING_CHANGE) {
        errors.push(`Слишком большое изменение рейтинга: ${ratingChange.toFixed(1)} > ${this.MAX_RATING_CHANGE}`)
      }

      // Check update frequency
      const tooFrequent = await this.isUpdateTooFrequent(userId)
      if (tooFrequent) {
        warnings.push('Слишком частые обновления рейтинга')
      }

      // Check for rapid rating changes
      const rapidChange = await this.checkRapidRatingChange(userId, oldRating, newRating)
      if (rapidChange.isRapid) {
        warnings.push(`Быстрое изменение рейтинга: ${rapidChange.details}`)
      }

      // Validate match context if provided
      if (context.matchId) {
        const matchValidation = await this.validateMatchContext(context.matchId, userId)
        if (!matchValidation.isValid) {
          errors.push(...matchValidation.errors)
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        requiresReview: warnings.length > 2 || errors.length > 0
      }
    } catch (_error) {
      console.error('Error validating rating update:', _error)
      return {
        isValid: false,
        errors: ['Rating validation error occurred'],
        warnings: []
      }
    }
  }

  /**
   * Validate profile completeness for rating system
   */
  async validateProfileCompleteness(userId: number): Promise<{
    complete: boolean
    missingFields: string[]
    suggestions: string[]
  }> {
    try {
      const user = await getUserById(userId)
      if (!user) {
        return {
          complete: false,
          missingFields: ['user_not_found'],
          suggestions: []
        }
      }

      const missingFields: string[] = []
      const suggestions: string[] = []

      // Check for chess ratings
      if (!user.fide_rating && !user.chesscom_rating && !user.lichess_rating) {
        missingFields.push('chess_ratings')
        suggestions.push('Добавьте хотя бы один рейтинг (FIDE, Chess.com или Lichess)')
      }

      // Check for profile completeness
      if (!user.first_name || !user.last_name) {
        missingFields.push('full_name')
        suggestions.push('Укажите полное имя')
      }

      // Check for profile picture (if applicable)
      // This would depend on your user model

      // Check for bio/description
      if (!user.bio) {
        suggestions.push('Добавьте описание профиля для лучшего матчинга')
      }

      return {
        complete: missingFields.length === 0,
        missingFields,
        suggestions
      }
    } catch (error) {
      console.error('Error validating profile completeness:', error)
      return {
        complete: false,
        missingFields: ['validation_error'],
        suggestions: []
      }
    }
  }

  /**
   * Check if user has required rating
   */
  private hasRequiredRating(user: User): boolean {
    return !!(user.fide_rating || user.chesscom_rating || user.lichess_rating)
  }

  /**
   * Get effective rating (priority: FIDE > Chess.com > Lichess)
   */
  private getEffectiveRating(user: User): number {
    return user.fide_rating || user.chesscom_rating || user.lichess_rating || 0
  }

  /**
   * Validate rating consistency across platforms
   */
  private validateRatingConsistency(user: User): boolean {
    const ratings = [user.fide_rating, user.chesscom_rating, user.lichess_rating]
      .filter((rating): rating is number => rating !== null && rating !== undefined)
    
    if (ratings.length < 2) return true
    
    const maxDiff = Math.max(...ratings) - Math.min(...ratings)
    return maxDiff <= this.MAX_RATING_DIFFERENCE
  }

  /**
   * Check for suspicious activity patterns
   */
  private async checkSuspiciousActivity(userId: number): Promise<{
    isSuspicious: boolean
    details: string
  }> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      
      // Check recent rating history
      const { data: recentHistory } = await supabase
        .from('rating_history')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', oneHourAgo.toISOString())

      if (recentHistory && recentHistory.length > this.SUSPICIOUS_ACTIVITY_THRESHOLD) {
        return {
          isSuspicious: true,
          details: `${recentHistory.length} обновлений рейтинга за последний час`
        }
      }

      return {
        isSuspicious: false,
        details: ''
      }
    } catch (error) {
      console.error('Error checking suspicious activity:', error)
      return {
        isSuspicious: false,
        details: ''
      }
    }
  }

  /**
   * Check if rating updates are too frequent
   */
  private async isUpdateTooFrequent(userId: number): Promise<boolean> {
    try {
      const lastUpdate = await this.getLastRatingUpdate(userId)
      if (!lastUpdate) return false

      const now = new Date()
      const timeDiff = (now.getTime() - lastUpdate.getTime()) / 1000 // seconds
      
      return timeDiff < this.MIN_TIME_BETWEEN_UPDATES
    } catch (error) {
      console.error('Error checking update frequency:', error)
      return false
    }
  }

  /**
   * Get last rating update time
   */
  private async getLastRatingUpdate(userId: number): Promise<Date | null> {
    try {
      const { data } = await supabase
        .from('rating_history')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      return data ? new Date(data.created_at) : null
    } catch (error) {
      return null
    }
  }

  /**
   * Check for rapid rating changes
   */
  private async checkRapidRatingChange(
    userId: number,
    oldRating: number,
    newRating: number
  ): Promise<{
    isRapid: boolean
    details: string
  }> {
    try {
      const ratingChange = Math.abs(newRating - oldRating)
      
      // Check if this is a very large change
      if (ratingChange > 100) {
        return {
          isRapid: true,
          details: `Большое изменение: ${ratingChange.toFixed(1)} пунктов`
        }
      }

      // Check recent changes pattern
      const { data: recentHistory } = await supabase
        .from('rating_history')
        .select('rating_change')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentHistory && recentHistory.length >= 3) {
        const avgChange = recentHistory.reduce((sum: number, h: RatingHistory) => sum + Math.abs(h.rating_change), 0) / recentHistory.length
        if (avgChange > 50) {
          return {
            isRapid: true,
            details: `Среднее изменение за последние игры: ${avgChange.toFixed(1)} пунктов`
          }
        }
      }

      return {
        isRapid: false,
        details: ''
      }
    } catch (error) {
      console.error('Error checking rapid rating change:', error)
      return {
        isRapid: false,
        details: ''
      }
    }
  }

  /**
   * Validate match context
   */
  private async validateMatchContext(matchId: number, userId: number): Promise<{
    isValid: boolean
    errors: string[]
  }> {
    try {
      const errors: string[] = []

      // Check if match exists and user is participant
      const { data: match } = await supabase
        .from('matches')
        .select(`
          *,
          rounds!inner(tournament_id),
          white:tournament_participants!white_participant_id(user_id),
          black:tournament_participants!black_participant_id(user_id)
        `)
        .eq('id', matchId)
        .single()

      if (!match) {
        errors.push('Матч не найден')
        return { isValid: false, errors }
      }

      const isParticipant = 
        match.white?.[0]?.user_id === userId || 
        match.black?.[0]?.user_id === userId

      if (!isParticipant) {
        errors.push('Пользователь не участвует в этом матче')
      }

      return {
        isValid: errors.length === 0,
        errors
      }
    } catch (error) {
      console.error('Error validating match context:', error)
      return {
        isValid: false,
        errors: ['Ошибка валидации матча']
      }
    }
  }

  /**
   * Flag suspicious activity for manual review
   */
  async flagSuspiciousActivity(userId: number, reason: string): Promise<void> {
    try {
      await supabase.from('security_flags').insert({
        user_id: userId,
        type: 'rating_manipulation',
        reason,
        created_at: new Date().toISOString()
      })

      // TODO: Send notification to admins
      console.warn(`Suspicious activity flagged for user ${userId}: ${reason}`)
    } catch (error) {
      console.error('Error flagging suspicious activity:', error)
    }
  }
}

// Export singleton instance
export const ratingValidator = new RatingValidator()