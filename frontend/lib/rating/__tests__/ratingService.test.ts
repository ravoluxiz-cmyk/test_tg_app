import { describe, it, expect } from 'vitest'
import { RatingService } from '@/lib/rating/ratingService'
import { supabase } from '@/lib/supabase'
import type { PlayerRating } from '@/lib/rating/types'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { rating: 1500, rd: 350, volatility: 0.06 },
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
            data: { id: 1 },
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { id: 1 },
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
      expect(result.whiteRatingUpdate).toBeDefined()
      expect(result.blackRatingUpdate).toBeDefined()
      expect(result.whiteRatingUpdate.newRating).toBeGreaterThan(1500)
      expect(result.blackRatingUpdate.newRating).toBeLessThan(1500)
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
      expect(result.whiteRatingUpdate).toBeDefined()
      expect(result.blackRatingUpdate).toBeDefined()
      // For equal ratings, changes should be minimal for a draw
      expect(Math.abs(result.whiteRatingUpdate.newRating - 1500)).toBeLessThan(10)
      expect(Math.abs(result.blackRatingUpdate.newRating - 1500)).toBeLessThan(10)
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
      expect(result.whiteRatingUpdate).toBeDefined()
      expect(result.blackRatingUpdate).toBeDefined()
      // Lower rated player should gain more points for upset win
      expect(result.blackRatingUpdate.ratingChange).toBeGreaterThan(result.whiteRatingUpdate.ratingChange)
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

    it('should return default rating for new players', async () => {
      const playerId = 1
      const timeControl = 'classical'

      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null
          }))
        }))
      }))

      vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as { select: typeof mockSelect })

      const rating = await ratingService.getPlayerRating(playerId, timeControl)

      expect(rating).toEqual({
        rating: 1500,
        rd: 350,
        volatility: 0.06,
        games_played: 0,
        win_rate: 0
      })
    })
  })

  describe('validateRatingUpdate', () => {
    it('should accept valid rating changes', () => {
      const currentRating = { rating: 1500, rd: 200, volatility: 0.06 }
      const newRating = { rating: 1520, rd: 195, volatility: 0.06 }

      const isValid = ratingService.validateRatingUpdate(currentRating, newRating)

      expect(isValid).toBe(true)
    })

    it('should reject suspiciously large rating changes', () => {
      const currentRating = { rating: 1500, rd: 200, volatility: 0.06 }
      const newRating = { rating: 1800, rd: 195, volatility: 0.06 } // +300 points

      const isValid = ratingService.validateRatingUpdate(currentRating, newRating)

      expect(isValid).toBe(false)
    })

    it('should reject invalid volatility values', () => {
      const currentRating = { rating: 1500, rd: 200, volatility: 0.06 }
      const newRating = { rating: 1520, rd: 195, volatility: 1.5 } // Invalid volatility

      const isValid = ratingService.validateRatingUpdate(currentRating, newRating)

      expect(isValid).toBe(false)
    })
  })
})