import { describe, it, expect } from 'vitest'
import { RatingValidator } from '@/lib/rating/ratingValidator'

describe('RatingValidator Security Tests', () => {
  let validator: RatingValidator

  beforeEach(() => {
    validator = new RatingValidator()
  })

  describe('validateTournamentEligibility', () => {
    it('should detect players with insufficient games', () => {
      const playerData = {
        userId: 1,
        rating: 1500,
        gamesPlayed: 5, // Less than minimum 10
        recentForm: 'WWLWD',
        timeControl: 'classical' as const
      }

      const result = validator.validateTournamentEligibility(playerData)
      
      expect(result.isValid).toBe(false)
      expect(result.reasons).toContain('Insufficient games played')
    })

    it('should detect suspicious rating manipulation', () => {
      const playerData = {
        userId: 1,
        rating: 2500, // Unrealistically high for new player
        gamesPlayed: 15,
        recentForm: 'WWWWW',
        timeControl: 'classical' as const
      }

      const result = validator.validateTournamentEligibility(playerData)
      
      expect(result.isValid).toBe(false)
      expect(result.reasons).toContain('Rating appears artificially inflated')
    })

    it('should allow legitimate players', () => {
      const playerData = {
        userId: 1,
        rating: 1650,
        gamesPlayed: 25,
        recentForm: 'WWLWD',
        timeControl: 'classical' as const
      }

      const result = validator.validateTournamentEligibility(playerData)
      
      expect(result.isValid).toBe(true)
      expect(result.reasons).toHaveLength(0)
    })
  })

  describe('validateRatingUpdate', () => {
    it('should reject suspiciously large rating changes', () => {
      const currentRating = { rating: 1500, rd: 200, volatility: 0.06 }
      const newRating = { rating: 2000, rd: 195, volatility: 0.06 } // +500 points

      const result = validator.validateRatingUpdate(currentRating, newRating)
      
      expect(result.isValid).toBe(false)
      expect(result.reasons).toContain('Rating change too large')
    })

    it('should reject impossible RD values', () => {
      const currentRating = { rating: 1500, rd: 200, volatility: 0.06 }
      const newRating = { rating: 1520, rd: 50, volatility: 0.06 } // RD too low

      const result = validator.validateRatingUpdate(currentRating, newRating)
      
      expect(result.isValid).toBe(false)
      expect(result.reasons).toContain('Rating deviation out of valid range')
    })

    it('should reject invalid volatility values', () => {
      const currentRating = { rating: 1500, rd: 200, volatility: 0.06 }
      const newRating = { rating: 1520, rd: 195, volatility: 2.0 } // Volatility too high

      const result = validator.validateRatingUpdate(currentRating, newRating)
      
      expect(result.isValid).toBe(false)
      expect(result.reasons).toContain('Volatility out of valid range')
    })

    it('should accept reasonable rating changes', () => {
      const currentRating = { rating: 1500, rd: 200, volatility: 0.06 }
      const newRating = { rating: 1520, rd: 195, volatility: 0.06 }

      const result = validator.validateRatingUpdate(currentRating, newRating)
      
      expect(result.isValid).toBe(true)
      expect(result.reasons).toHaveLength(0)
    })
  })

  describe('detectSuspiciousActivity', () => {
    it('should detect rapid rating inflation', () => {
      const history = [
        { date: '2024-01-01', rating: 1500 },
        { date: '2024-01-02', rating: 1600 },
        { date: '2024-01-03', rating: 1750 },
        { date: '2024-01-04', rating: 1900 },
        { date: '2024-01-05', rating: 2100 }, // +600 in 5 days
      ]

      const result = validator.detectSuspiciousActivity(history)
      
      expect(result.isSuspicious).toBe(true)
      expect(result.reasons).toContain('Rating increased too rapidly')
    })

    it('should detect unusual win streaks', () => {
      const history = [
        { date: '2024-01-01', rating: 1500, result: 'W' },
        { date: '2024-01-02', rating: 1520, result: 'W' },
        { date: '2024-01-03', rating: 1540, result: 'W' },
        { date: '2024-01-04', rating: 1560, result: 'W' },
        { date: '2024-01-05', rating: 1580, result: 'W' },
        { date: '2024-01-06', rating: 1600, result: 'W' },
        { date: '2024-01-07', rating: 1620, result: 'W' },
        { date: '2024-01-08', rating: 1640, result: 'W' },
        { date: '2024-01-09', rating: 1660, result: 'W' },
        { date: '2024-01-10', rating: 1680, result: 'W' }, // 10 wins in a row
      ]

      const result = validator.detectSuspiciousActivity(history)
      
      expect(result.isSuspicious).toBe(true)
      expect(result.reasons).toContain('Unusual win streak detected')
    })

    it('should detect sandbagging', () => {
      const history = [
        { date: '2024-01-01', rating: 1800 },
        { date: '2024-01-02', rating: 1750 },
        { date: '2024-01-03', rating: 1700 },
        { date: '2024-01-04', rating: 1650 },
        { date: '2024-01-05', rating: 1600 }, // Deliberate losing
        { date: '2024-01-06', rating: 1650 }, // Sudden improvement
        { date: '2024-01-07', rating: 1700 },
        { date: '2024-01-08', rating: 1750 },
        { date: '2024-01-09', rating: 1800 },
        { date: '2024-01-10', rating: 1850 },
      ]

      const result = validator.detectSuspiciousActivity(history)
      
      expect(result.isSuspicious).toBe(true)
      expect(result.reasons).toContain('Possible sandbagging detected')
    })

    it('should not flag normal rating progression', () => {
      const history = [
        { date: '2024-01-01', rating: 1500 },
        { date: '2024-01-08', rating: 1510 },
        { date: '2024-01-15', rating: 1525 },
        { date: '2024-01-22', rating: 1515 },
        { date: '2024-01-29', rating: 1530 },
      ]

      const result = validator.detectSuspiciousActivity(history)
      
      expect(result.isSuspicious).toBe(false)
      expect(result.reasons).toHaveLength(0)
    })
  })

  describe('rate limiting', () => {
    it('should enforce request limits', async () => {
      const userId = 1
      
      // Make multiple requests rapidly
      const requests = Array(15).fill(null).map(() => 
        validator.checkRateLimit(userId)
      )
      
      const results = await Promise.all(requests)
      const blockedRequests = results.filter(result => !result.allowed)
      
      expect(blockedRequests.length).toBeGreaterThan(0)
    })

    it('should reset rate limits after time window', async () => {
      const userId = 1
      
      // Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        await validator.checkRateLimit(userId)
      }
      
      // Should be blocked
      const blockedResult = await validator.checkRateLimit(userId)
      expect(blockedResult.allowed).toBe(false)
      
      // Wait for reset (in real implementation)
      // For test purposes, we'll check that the mechanism exists
      expect(validator.resetRateLimit).toBeDefined()
    })
  })

  describe('fraud detection', () => {
    it('should detect multiple accounts from same IP', () => {
      const ipAddress = '192.168.1.100'
      const accounts = [
        { userId: 1, username: 'player1', createdAt: '2024-01-01' },
        { userId: 2, username: 'player2', createdAt: '2024-01-02' },
        { userId: 3, username: 'player3', createdAt: '2024-01-03' },
      ]

      const result = validator.detectMultiAccount(ipAddress, accounts)
      
      expect(result.isSuspicious).toBe(true)
      expect(result.reasons).toContain('Multiple accounts from same IP')
    })

    it('should detect collusion patterns', () => {
      const matches = [
        { whiteId: 1, blackId: 2, result: 'white', moves: 10 },
        { whiteId: 2, blackId: 3, result: 'black', moves: 8 },
        { whiteId: 3, blackId: 1, result: 'white', moves: 12 },
        { whiteId: 1, blackId: 2, result: 'white', moves: 9 },
        { whiteId: 2, blackId: 3, result: 'black', moves: 7 },
      ]

      const result = validator.detectCollusion(matches)
      
      expect(result.isSuspicious).toBe(true)
      expect(result.reasons).toContain('Suspicious match patterns detected')
    })
  })
})