import { describe, it, expect, vi } from 'vitest'
import { RatingService } from '@/lib/rating/ratingService'
import { RatingValidator } from '@/lib/rating/ratingValidator'
import { supabase } from '@/lib/supabase'
import type { PlayerRating } from '@/lib/rating/types'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { 
              user_id: 1, 
              rating: 1500, 
              rd: 350, 
              volatility: 0.06,
              games_count: 0,
              wins_count: 0,
              losses_count: 0,
              draws_count: 0,
              rating_period_start: new Date().toISOString(),
              last_updated: new Date().toISOString()
            },
            error: null
          }))
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            data: [],
            error: null
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { 
              id: 1,
              user_id: 1, 
              rating: 1520, 
              rd: 345, 
              volatility: 0.06,
              games_count: 1,
              wins_count: 1,
              losses_count: 0,
              draws_count: 0,
              rating_period_start: new Date().toISOString(),
              last_updated: new Date().toISOString()
            },
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { 
                user_id: 1, 
                rating: 1520, 
                rd: 345, 
                volatility: 0.06,
                games_count: 1,
                wins_count: 1,
                losses_count: 0,
                draws_count: 0,
                rating_period_start: new Date().toISOString(),
                last_updated: new Date().toISOString()
              },
              error: null
            }))
          }))
        }))
      }))
    }))
  }
}))

describe('RatingService', () => {
  let ratingService: RatingService

  beforeEach(() => {
    ratingService = new RatingService()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('updateRatingFromMatch', () => {
    it('should update player ratings correctly for a decisive result', async () => {
      const matchResult = {
        whitePlayerId: 1,
        blackPlayerId: 2,
        result: 'white' as const,
        whiteRating: 1500,
        blackRating: 1500,
        whiteRd: 350,
        blackRd: 350,
        whiteVolatility: 0.06,
        blackVolatility: 0.06,
        timeControl: 'classical' as const
      }

      const result = await ratingService.updateRatingFromMatch(matchResult)

      expect(result).toBeDefined()
      expect(result?.success).toBe(true)
      expect(result?.newRating).toBeDefined()
      expect(result?.historyEntry).toBeDefined()
    })

    it('should update player ratings correctly for a draw', async () => {
      const matchResult = {
        whitePlayerId: 1,
        blackPlayerId: 2,
        result: 'draw' as const,
        whiteRating: 1500,
        blackRating: 1500,
        whiteRd: 350,
        blackRd: 350,
        whiteVolatility: 0.06,
        blackVolatility: 0.06,
        timeControl: 'classical' as const
      }

      const result = await ratingService.updateRatingFromMatch(matchResult)

      expect(result).toBeDefined()
      expect(result?.success).toBe(true)
      expect(result?.newRating).toBeDefined()
      expect(result?.historyEntry).toBeDefined()
    })

    it('should handle rating updates for players with different initial ratings', async () => {
      const matchResult = {
        whitePlayerId: 1,
        blackPlayerId: 2,
        result: 'black' as const, // Lower rated player wins
        whiteRating: 1800,
        blackRating: 1400,
        whiteRd: 200,
        blackRd: 250,
        whiteVolatility: 0.06,
        blackVolatility: 0.06,
        timeControl: 'classical' as const
      }

      const result = await ratingService.updateRatingFromMatch(matchResult)

      expect(result).toBeDefined()
      expect(result?.success).toBe(true)
      expect(result?.newRating).toBeDefined()
      expect(result?.historyEntry).toBeDefined()
    })
  })

  describe('predictMatchOutcome', () => {
    it('should predict higher win probability for higher rated player', async () => {
      const player1Id = 1
      const player2Id = 2

      // Mock player data
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn()
          .mockReturnValueOnce({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: { rating: 1800, rd: 200, volatility: 0.06 },
                error: null
              }))
            }))
          })
          .mockReturnValueOnce({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: { rating: 1400, rd: 250, volatility: 0.06 },
                error: null
              }))
            }))
          })
      } as { data: PlayerRating[] | null })

      const prediction = await ratingService.predictMatchOutcome(player1Id, player2Id)

      expect(prediction).toBeDefined()
      expect(prediction.player1WinProbability).toBeGreaterThan(0.5)
      expect(prediction.player2WinProbability).toBeLessThan(0.5)
      expect(prediction.drawProbability).toBeGreaterThan(0)
      expect(prediction.player1WinProbability + prediction.player2WinProbability + prediction.drawProbability)
        .toBeCloseTo(1, 5)
    })

    it('should predict roughly equal chances for equally rated players', async () => {
      const player1Id = 1
      const player2Id = 2

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn()
          .mockReturnValueOnce({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: { rating: 1500, rd: 350, volatility: 0.06 },
                error: null
              }))
            }))
          })
          .mockReturnValueOnce({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: { rating: 1500, rd: 350, volatility: 0.06 },
                error: null
              }))
            }))
          })
      } as { data: PlayerRating[] | null })

      const prediction = await ratingService.predictMatchOutcome(player1Id, player2Id)

      expect(prediction).toBeDefined()
      expect(Math.abs(prediction.player1WinProbability - prediction.player2WinProbability))
        .toBeLessThan(0.1)
    })
  })

  describe('getPlayerRating', () => {
    it('should retrieve player rating for specific time control', async () => {
      const playerId = 1
      const timeControl = 'classical'

      const mockData = {
        rating: 1650,
        rd: 180,
        volatility: 0.06,
        games_played: 25,
        win_rate: 0.6
      }

      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: mockData,
            error: null
          }))
        }))
      }))

      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as { select: typeof mockSelect })

      const rating = await ratingService.getPlayerRating(playerId, timeControl)

      expect(rating).toEqual(mockData)
      expect(supabase.from).toHaveBeenCalledWith('player_ratings')
    })

    it('should return null for players without ratings', async () => {
      const playerId = 1

      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: { code: 'PGRST116' }
          }))
        }))
      }))

      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as { select: typeof mockSelect })

      const rating = await ratingService.getPlayerRating(playerId)

      expect(rating).toBeNull()
    })
  })

  describe('validateRatingUpdate', () => {
    it('should accept valid rating changes', async () => {
      const validator = new RatingValidator()
      const result = await validator.validateRatingUpdate(1, 1500, 1520, {})

      expect(result.isValid).toBe(true)
    })

    it('should reject suspiciously large rating changes', async () => {
      const validator = new RatingValidator()
      
      // Mock the rapid change check to avoid database calls
      vi.spyOn(validator as unknown as { checkRapidRatingChange: () => Promise<{ isRapid: boolean }> }, 'checkRapidRatingChange').mockResolvedValue({ isRapid: false })
      vi.spyOn(validator as unknown as { isUpdateTooFrequent: () => Promise<boolean> }, 'isUpdateTooFrequent').mockResolvedValue(false)
      
      const result = await validator.validateRatingUpdate(1, 1500, 1800, {}) // +300 points

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should validate update frequency', async () => {
      const validator = new RatingValidator()
      
      // Mock frequent updates and rapid change check
      vi.spyOn(validator as unknown as { isUpdateTooFrequent: () => Promise<boolean> }, 'isUpdateTooFrequent').mockResolvedValue(true)
      vi.spyOn(validator as unknown as { checkRapidRatingChange: () => Promise<{ isRapid: boolean }> }, 'checkRapidRatingChange').mockResolvedValue({ isRapid: false })
      
      const result = await validator.validateRatingUpdate(1, 1500, 1520, {})

      expect(result.isValid).toBe(true) // Should still be valid, just with warning
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })
})