import { test, expect } from '@playwright/test'

test.describe('Rating System E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to rating dashboard
    await page.goto('/rating')
  })

  test.describe('Rating Display Component', () => {
    test('should display user rating information', async ({ page }) => {
      // Check if rating display is visible
      await expect(page.locator('[data-testid="rating-display"]')).toBeVisible()
      
      // Check for rating value
      await expect(page.locator('[data-testid="rating-value"]')).toContainText(/\d+/)
      
      // Check for RD value
      await expect(page.locator('[data-testid="rating-rd"]')).toContainText(/\d+/)
      
      // Check for volatility
      await expect(page.locator('[data-testid="rating-volatility"]')).toContainText(/\d+\.\d+%/)
    })

    test('should handle time control switching', async ({ page }) => {
      // Test blitz time control
      await page.selectOption('[data-testid="time-control-select"]', 'blitz')
      await expect(page.locator('[data-testid="rating-display"]')).toBeVisible()
      
      // Test rapid time control
      await page.selectOption('[data-testid="time-control-select"]', 'rapid')
      await expect(page.locator('[data-testid="rating-display"]')).toBeVisible()
      
      // Test classical time control
      await page.selectOption('[data-testid="time-control-select"]', 'classical')
      await expect(page.locator('[data-testid="rating-display"]')).toBeVisible()
    })

    test('should show rating history chart', async ({ page }) => {
      // Navigate to history tab
      await page.click('[data-testid="history-tab"]')
      
      // Check if chart is visible
      await expect(page.locator('[data-testid="rating-chart"]')).toBeVisible()
      
      // Check for chart controls
      await expect(page.locator('[data-testid="time-range-select"]')).toBeVisible()
      await expect(page.locator('[data-testid="metric-select"]')).toBeVisible()
    })

    test('should handle chart interactions', async ({ page }) => {
      await page.click('[data-testid="history-tab"]')
      
      // Test different time ranges
      const timeRanges = ['7d', '30d', '90d', '1y', 'all']
      for (const range of timeRanges) {
        await page.selectOption('[data-testid="time-range-select"]', range)
        await expect(page.locator('[data-testid="rating-chart"]')).toBeVisible()
      }
      
      // Test different metrics
      const metrics = ['rating', 'rd', 'volatility']
      for (const metric of metrics) {
        await page.selectOption('[data-testid="metric-select"]', metric)
        await expect(page.locator('[data-testid="rating-chart"]')).toBeVisible()
      }
    })
  })

  test.describe('Rating Leaderboard', () => {
    test('should display leaderboard', async ({ page }) => {
      await page.click('[data-testid="leaderboard-tab"]')
      
      // Check if leaderboard is visible
      await expect(page.locator('[data-testid="rating-leaderboard"]')).toBeVisible()
      
      // Check for leaderboard items
      const leaderboardItems = page.locator('[data-testid="leaderboard-item"]')
      await expect(leaderboardItems.first()).toBeVisible()
      
      // Check for ranking numbers
      await expect(page.locator('[data-testid="leaderboard-rank"]').first()).toContainText(/\d+/)
      
      // Check for usernames
      await expect(page.locator('[data-testid="leaderboard-username"]').first()).toBeVisible()
      
      // Check for ratings
      await expect(page.locator('[data-testid="leaderboard-rating"]').first()).toContainText(/\d+/)
    })

    test('should handle leaderboard filtering', async ({ page }) => {
      await page.click('[data-testid="leaderboard-tab"]')
      
      // Test rating range filter
      await page.fill('[data-testid="min-rating-input"]', '1600')
      await page.fill('[data-testid="max-rating-input"]', '1800')
      await page.click('[data-testid="apply-filters-button"]')
      
      // Check filtered results
      await expect(page.locator('[data-testid="rating-leaderboard"]')).toBeVisible()
      
      // Test reset filters
      await page.click('[data-testid="reset-filters-button"]')
      await expect(page.locator('[data-testid="rating-leaderboard"]')).toBeVisible()
    })

    test('should handle leaderboard sorting', async ({ page }) => {
      await page.click('[data-testid="leaderboard-tab"]')
      
      // Test sorting by rating
      await page.selectOption('[data-testid="sort-select"]', 'rating')
      await expect(page.locator('[data-testid="rating-leaderboard"]')).toBeVisible()
      
      // Test sorting by recent activity
      await page.selectOption('[data-testid="sort-select"]', 'recent')
      await expect(page.locator('[data-testid="rating-leaderboard"]')).toBeVisible()
    })

    test('should handle pagination', async ({ page }) => {
      await page.click('[data-testid="leaderboard-tab"]')
      
      // Check if pagination controls exist
      await expect(page.locator('[data-testid="pagination-controls"]')).toBeVisible()
      
      // Test next page
      await page.click('[data-testid="next-page-button"]')
      await expect(page.locator('[data-testid="rating-leaderboard"]')).toBeVisible()
      
      // Test previous page
      await page.click('[data-testid="prev-page-button"]')
      await expect(page.locator('[data-testid="rating-leaderboard"]')).toBeVisible()
    })
  })

  test.describe('Rating Predictions', () => {
    test('should display match prediction', async ({ page }) => {
      await page.click('[data-testid="predictions-tab"]')
      
      // Check if prediction component is visible
      await expect(page.locator('[data-testid="rating-prediction"]')).toBeVisible()
      
      // Check for player information
      await expect(page.locator('[data-testid="player1-info"]')).toBeVisible()
      await expect(page.locator('[data-testid="player2-info"]')).toBeVisible()
      
      // Check for win probabilities
      await expect(page.locator('[data-testid="win-probability"]')).toContainText(/\d+%/)
      await expect(page.locator('[data-testid="loss-probability"]')).toContainText(/\d+%/)
      await expect(page.locator('[data-testid="draw-probability"]')).toContainText(/\d+%/)
    })

    test('should handle prediction scenarios', async ({ page }) => {
      await page.click('[data-testid="predictions-tab"]')
      
      // Test win scenario
      await page.click('[data-testid="scenario-win-button"]')
      await expect(page.locator('[data-testid="rating-change-win"]')).toBeVisible()
      
      // Test draw scenario
      await page.click('[data-testid="scenario-draw-button"]')
      await expect(page.locator('[data-testid="rating-change-draw"]')).toBeVisible()
      
      // Test loss scenario
      await page.click('[data-testid="scenario-loss-button"]')
      await expect(page.locator('[data-testid="rating-change-loss"]')).toBeVisible()
    })

    test('should show detailed analysis', async ({ page }) => {
      await page.click('[data-testid="predictions-tab"]')
      
      // Check for detailed analysis section
      await expect(page.locator('[data-testid="detailed-analysis"]')).toBeVisible()
      
      // Check for advantage factors
      await expect(page.locator('[data-testid="advantage-factors"]')).toBeVisible()
      
      // Check for risk factors
      await expect(page.locator('[data-testid="risk-factors"]')).toBeVisible()
    })
  })

  test.describe('Rating Dashboard Integration', () => {
    test('should handle time control changes across all components', async ({ page }) => {
      // Test overview tab
      await page.selectOption('[data-testid="dashboard-time-control"]', 'rapid')
      await expect(page.locator('[data-testid="rating-display"]')).toBeVisible()
      
      // Test leaderboard tab
      await page.click('[data-testid="leaderboard-tab"]')
      await expect(page.locator('[data-testid="rating-leaderboard"]')).toBeVisible()
      
      // Test history tab
      await page.click('[data-testid="history-tab"]')
      await expect(page.locator('[data-testid="rating-chart"]')).toBeVisible()
      
      // Test predictions tab
      await page.click('[data-testid="predictions-tab"]')
      await expect(page.locator('[data-testid="rating-prediction"]')).toBeVisible()
    })

    test('should handle refresh functionality', async ({ page }) => {
      // Click refresh button
      await page.click('[data-testid="refresh-button"]')
      
      // Check if loading state is shown
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
      
      // Check if data is refreshed
      await expect(page.locator('[data-testid="rating-display"]')).toBeVisible()
    })

    test('should handle theme switching', async ({ page }) => {
      // Test light theme
      await page.click('[data-testid="theme-toggle-light"]')
      await expect(page.locator('[data-testid="rating-dashboard"]')).toHaveClass(/light/)
      
      // Test dark theme
      await page.click('[data-testid="theme-toggle-dark"]')
      await expect(page.locator('[data-testid="rating-dashboard"]')).toHaveClass(/dark/)
    })
  })

  test.describe('Rating System Performance', () => {
    test('should load rating data quickly', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/rating')
      const loadTime = Date.now() - startTime
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)
    })

    test('should handle large datasets efficiently', async ({ page }) => {
      await page.click('[data-testid="leaderboard-tab"]')
      
      // Set large page size
      await page.selectOption('[data-testid="page-size-select"]', '100')
      
      // Should render large leaderboard quickly
      const startTime = Date.now()
      await expect(page.locator('[data-testid="rating-leaderboard"]')).toBeVisible()
      const renderTime = Date.now() - startTime
      
      expect(renderTime).toBeLessThan(2000)
    })

    test('should handle chart interactions smoothly', async ({ page }) => {
      await page.click('[data-testid="history-tab"]')
      
      // Test chart interactions
      const chart = page.locator('[data-testid="rating-chart"]')
      await chart.hover()
      
      // Should show tooltip quickly
      await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible()
    })
  })

  test.describe('Rating System Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Block API requests
      await page.route('**/api/rating/**', route => route.abort())
      
      await page.goto('/rating')
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
      
      // Should show retry button
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
    })

    test('should handle invalid user data', async ({ page }) => {
      // Navigate to invalid user profile
      await page.goto('/rating/history/invalid-user-id')
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
      
      // Should not crash the application
      await expect(page.locator('[data-testid="rating-dashboard"]')).toBeVisible()
    })

    test('should handle malformed API responses', async ({ page }) => {
      // Mock malformed API response
      await page.route('**/api/rating/**', route => 
        route.fulfill({
          status: 200,
          body: JSON.stringify({ invalid: 'data' })
        })
      )
      
      await page.goto('/rating')
      
      // Should handle gracefully
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    })
  })

  test.describe('Rating System Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/rating')
      
      // Tab through navigation
      await page.keyboard.press('Tab')
      await page.keyboard.press('Enter')
      
      // Should navigate to leaderboard
      await expect(page.locator('[data-testid="rating-leaderboard"]')).toBeVisible()
    })

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/rating')
      
      // Check for ARIA labels
      await expect(page.locator('[data-testid="rating-display"]')).toHaveAttribute('role', 'region')
      await expect(page.locator('[data-testid="time-control-select"]')).toHaveAttribute('aria-label', /time control/i)
      
      // Check for screen reader support
      await expect(page.locator('[data-testid="rating-value"]')).toHaveAttribute('aria-live', 'polite')
    })

    test('should support screen readers', async ({ page }) => {
      await page.goto('/rating')
      
      // Check for semantic HTML
      await expect(page.locator('h1, h2, h3')).toHaveCountGreaterThan(0)
      
      // Check for proper headings
      await expect(page.locator('h1')).toContainText(/rating/i)
    })
  })
})