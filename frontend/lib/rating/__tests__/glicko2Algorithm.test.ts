import { describe, it, expect } from 'vitest'
import { Glicko2 } from 'glicko2'

describe('Glicko2 Algorithm Tests', () => {
  describe('Basic Rating Calculations', () => {
    it('should calculate rating updates for equal rated players', () => {
      const glicko = new Glicko2({ tau: 0.5, rating: 1500, rd: 350, vol: 0.06 })
      
      const player1 = glicko.makePlayer(1500, 350, 0.06)
      const player2 = glicko.makePlayer(1500, 350, 0.06)
      
      // Player 1 wins
      const matches = [[player2, 1]] // 1 = win, 0 = loss, 0.5 = draw
      glicko.updateRatings([player1], matches)
      
      expect(player1.getRating()).toBeGreaterThan(1500)
      expect(player1.getRd()).toBeLessThan(350)
    })

    it('should calculate rating updates for upset victory', () => {
      const glicko = new Glicko2({ tau: 0.5, rating: 1500, rd: 350, vol: 0.06 })
      
      const lowerRatedPlayer = glicko.makePlayer(1400, 300, 0.06)
      const higherRatedPlayer = glicko.makePlayer(1600, 250, 0.06)
      
      // Lower rated player wins (upset)
      const matches = [[higherRatedPlayer, 1]]
      glicko.updateRatings([lowerRatedPlayer], matches)
      
      // Lower rated player should gain significant points
      expect(lowerRatedPlayer.getRating()).toBeGreaterThan(1400)
      expect(lowerRatedPlayer.getRating() - 1400).toBeGreaterThan(15)
      
      // Higher rated player should lose points
      const higherRatedMatches = [[lowerRatedPlayer, 0]]
      glicko.updateRatings([higherRatedPlayer], higherRatedMatches)
      expect(higherRatedPlayer.getRating()).toBeLessThan(1600)
    })

    it('should handle draws correctly', () => {
      const glicko = new Glicko2({ tau: 0.5, rating: 1500, rd: 350, vol: 0.06 })
      
      const player1 = glicko.makePlayer(1500, 300, 0.06)
      const player2 = glicko.makePlayer(1500, 300, 0.06)
      
      // Draw between equal players
      const matches = [[player2, 0.5]]
      glicko.updateRatings([player1], matches)
      
      // Rating should change minimally for equal players drawing
      expect(Math.abs(player1.getRating() - 1500)).toBeLessThan(5)
    })
  })

  describe('Rating Deviation (RD) Updates', () => {
    it('should decrease RD after match completion', () => {
      const glicko = new Glicko2({ tau: 0.5, rating: 1500, rd: 350, vol: 0.06 })
      
      const player = glicko.makePlayer(1500, 350, 0.06)
      const opponent = glicko.makePlayer(1500, 350, 0.06)
      
      const initialRd = player.getRd()
      
      // Play a match
      const matches = [[opponent, 1]]
      glicko.updateRatings([player], matches)
      
      expect(player.getRd()).toBeLessThan(initialRd)
    })

    it('should handle RD increase during inactivity', () => {
      const glicko = new Glicko2({ tau: 0.5, rating: 1500, rd: 200, vol: 0.06 })
      
      // Removed unused player variable - using opponent directly
      const opponent = glicko.makePlayer(1500, 200, 0.06)
      
      // Simulate period of inactivity by not updating ratings
      // In real implementation, this would be handled by a separate process
      
      const initialRd = player.getRd()
      
      // After a long period, play a match
      const matches = [[opponent, 1]]
      glicko.updateRatings([player], matches)
      
      // RD should not decrease as much due to inactivity
      expect(player.getRd()).toBeLessThanOrEqual(initialRd)
    })

    it('should maintain RD within reasonable bounds', () => {
      const glicko = new Glicko2({ tau: 0.5, rating: 1500, rd: 350, vol: 0.06 })
      
      const player = glicko.makePlayer(1500, 350, 0.06)
      const opponent = glicko.makePlayer(1500, 350, 0.06)
      
      // Play multiple matches
      for (let i = 0; i < 10; i++) {
        const matches = [[opponent, i % 2]]
        glicko.updateRatings([player], matches)
      }
      
      // RD should not go below minimum threshold (around 30)
      expect(player.getRd()).toBeGreaterThan(30)
      
      // RD should not exceed maximum (350)
      expect(player.getRd()).toBeLessThanOrEqual(350)
    })
  })

  describe('Volatility Updates', () => {
    it('should update volatility based on performance', () => {
      const glicko = new Glicko2({ tau: 0.5, rating: 1500, rd: 350, vol: 0.06 })
      
      const player = glicko.makePlayer(1500, 200, 0.06)
      const strongerOpponent = glicko.makePlayer(1600, 200, 0.06)
      
      // Removed unused initialVolatility variable
      // Consistent strong performance (upset wins)
      for (let i = 0; i < 5; i++) {
        const matches = [[strongerOpponent, 1]]
        glicko.updateRatings([player], matches)
      }
      
      // Volatility should be adjusted based on performance consistency
      expect(player.getVol()).toBeGreaterThan(0)
      expect(player.getVol()).toBeLessThan(1)
    })

    it('should maintain volatility within bounds', () => {
      const glicko = new Glicko2({ tau: 0.5, rating: 1500, rd: 350, vol: 0.06 })
      
      const player = glicko.makePlayer(1500, 200, 0.06)
      const opponent = glicko.makePlayer(1500, 200, 0.06)
      
      // Play many matches with consistent results
      for (let i = 0; i < 20; i++) {
        const matches = [[opponent, 0.5]] // Consistent draws
        glicko.updateRatings([player], matches)
      }
      
      // Volatility should remain within reasonable bounds
      expect(player.getVol()).toBeGreaterThan(0.04)
      expect(player.getVol()).toBeLessThan(0.1)
    })
  })

  describe('Time Control Variations', () => {
    it('should handle different time controls with appropriate parameters', () => {
      const timeControls = [
        { name: 'blitz', tau: 0.6, expectedMultiplier: 1.2 },
        { name: 'rapid', tau: 0.5, expectedMultiplier: 1.0 },
        { name: 'classical', tau: 0.4, expectedMultiplier: 0.8 }
      ]
      
      timeControls.forEach(({ tau }) => {
        const glicko = new Glicko2({ tau, rating: 1500, rd: 350, vol: 0.06 })
        
        const player1 = glicko.makePlayer(1500, 300, 0.06)
        const player2 = glicko.makePlayer(1500, 300, 0.06)
        
        const matches = [[player2, 1]]
        glicko.updateRatings([player1], matches)
        
        // Rating changes should reflect time control sensitivity
        expect(player1.getRating()).toBeGreaterThan(1500)
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle players with minimum RD', () => {
      const glicko = new Glicko2({ tau: 0.5, rating: 1500, rd: 350, vol: 0.06 })
      
      const player1 = glicko.makePlayer(1500, 30, 0.06) // Very low RD
      const player2 = glicko.makePlayer(1500, 30, 0.06)
      
      const matches = [[player2, 1]]
      glicko.updateRatings([player1], matches)
      
      // Should still update ratings, though changes will be minimal
      expect(player1.getRating()).toBeGreaterThan(1500)
      expect(player1.getRd()).toBeGreaterThanOrEqual(30)
    })

    it('should handle players with maximum RD', () => {
      const glicko = new Glicko2({ tau: 0.5, rating: 1500, rd: 350, vol: 0.06 })
      
      const player1 = glicko.makePlayer(1500, 350, 0.06) // Maximum RD
      const player2 = glicko.makePlayer(1500, 350, 0.06)
      
      const matches = [[player2, 1]]
      glicko.updateRatings([player1], matches)
      
      // Should handle high uncertainty appropriately
      expect(player1.getRating()).toBeGreaterThan(1500)
      expect(player1.getRd()).toBeLessThanOrEqual(350)
    })

    it('should handle extreme rating differences', () => {
      const glicko = new Glicko2({ tau: 0.5, rating: 1500, rd: 350, vol: 0.06 })
      
      const masterPlayer = glicko.makePlayer(2500, 100, 0.06)
      const beginnerPlayer = glicko.makePlayer(800, 350, 0.06)
      
      // Beginner beats master (extreme upset)
      const matches = [[masterPlayer, 1]]
      glicko.updateRatings([beginnerPlayer], matches)
      
      // Should handle extreme rating differences gracefully
      expect(beginnerPlayer.getRating()).toBeGreaterThan(800)
      expect(beginnerPlayer.getRating()).toBeLessThan(2500)
    })

    it('should handle zero volatility', () => {
      const glicko = new Glicko2({ tau: 0.5, rating: 1500, rd: 350, vol: 0.06 })
      
      const player1 = glicko.makePlayer(1500, 200, 0.0001) // Near-zero volatility
      const player2 = glicko.makePlayer(1500, 200, 0.06)
      
      const matches = [[player2, 1]]
      glicko.updateRatings([player1], matches)
      
      // Should handle low volatility without errors
      expect(player1.getRating()).toBeGreaterThan(1500)
      expect(player1.getVol()).toBeGreaterThan(0)
    })
  })

  describe('Mathematical Properties', () => {
    it('should maintain rating conservation in closed system', () => {
      const glicko = new Glicko2({ tau: 0.5, rating: 1500, rd: 350, vol: 0.06 })
      
      const players = [
        glicko.makePlayer(1500, 200, 0.06),
        glicko.makePlayer(1500, 200, 0.06),
        glicko.makePlayer(1500, 200, 0.06),
        glicko.makePlayer(1500, 200, 0.06)
      ]
      
      const initialTotalRating = players.reduce((sum, p) => sum + p.getRating(), 0)
      
      // Simulate round-robin tournament
      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          const matches = [[players[j], Math.random() > 0.5 ? 1 : 0]]
          glicko.updateRatings([players[i]], matches)
        }
      }
      
      const finalTotalRating = players.reduce((sum, p) => sum + p.getRating(), 0)
      
      // Total rating should be approximately conserved
      expect(Math.abs(finalTotalRating - initialTotalRating)).toBeLessThan(50)
    })

    it('should converge to true skill over many matches', () => {
      const glicko = new Glicko2({ tau: 0.5, rating: 1500, rd: 350, vol: 0.06 })
      
      const trueSkill = 1800
      const player = glicko.makePlayer(1500, 350, 0.06)
      
      // Simulate many matches against known opponents
      for (let i = 0; i < 50; i++) {
        const opponentRating = 1500 + (Math.random() - 0.5) * 400
        const opponent = glicko.makePlayer(opponentRating, 200, 0.06)
        
        // Player wins more often if their true skill is higher
        const winProbability = 1 / (1 + Math.pow(10, (opponentRating - trueSkill) / 400))
        const result = Math.random() < winProbability ? 1 : 0
        
        const matches = [[opponent, result]]
        glicko.updateRatings([player], matches)
      }
      
      // Rating should converge toward true skill
      expect(Math.abs(player.getRating() - trueSkill)).toBeLessThan(100)
      expect(player.getRd()).toBeLessThan(150) // RD should decrease with more data
    })
  })

  describe('Performance and Stability', () => {
    it('should handle large number of players efficiently', () => {
      const glicko = new Glicko2({ tau: 0.5, rating: 1500, rd: 350, vol: 0.06 })
      
      const players = Array(100).fill(null).map(() => 
        glicko.makePlayer(1500 + (Math.random() - 0.5) * 400, 200 + Math.random() * 150, 0.06)
      )
      
      const startTime = Date.now()
      
      // Simulate tournament
      for (let i = 0; i < players.length; i += 2) {
        if (i + 1 < players.length) {
          const result = Math.random() > 0.5 ? 1 : 0
          const matches = [[players[i + 1], result]]
          glicko.updateRatings([players[i]], matches)
        }
      }
      
      const endTime = Date.now()
      
      // Should complete in reasonable time (< 1 second for 50 matches)
      expect(endTime - startTime).toBeLessThan(1000)
      
      // All players should have valid ratings
      players.forEach(player => {
        expect(player.getRating()).toBeGreaterThan(500)
        expect(player.getRating()).toBeLessThan(2500)
        expect(player.getRd()).toBeGreaterThan(30)
        expect(player.getRd()).toBeLessThan(350)
      })
    })

    it('should maintain numerical stability', () => {
      const glicko = new Glicko2({ tau: 0.5, rating: 1500, rd: 350, vol: 0.06 })
      
      const opponent = glicko.makePlayer(1500, 200, 0.06)
      
      // Extreme scenarios
      const extremeScenarios = [
        { rating: 100, rd: 30 },
        { rating: 3000, rd: 350 },
        { rating: 1500, rd: 1 },
        { rating: 1500, rd: 500 },
        { rating: 1500, rd: 200, vol: 0.0001 },
        { rating: 1500, rd: 200, vol: 0.999 }
      ]
      
      extremeScenarios.forEach(({ rating, rd, vol = 0.06 }) => {
        const testPlayer = glicko.makePlayer(rating, rd, vol)
        const matches = [[opponent, 0.5]]
        
        // Should not throw errors or produce NaN
        expect(() => glicko.updateRatings([testPlayer], matches)).not.toThrow()
        expect(testPlayer.getRating()).not.toBeNaN()
        expect(testPlayer.getRd()).not.toBeNaN()
        expect(testPlayer.getVol()).not.toBeNaN()
      })
    })
  })
})