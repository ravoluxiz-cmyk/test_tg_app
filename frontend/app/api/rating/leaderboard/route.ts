import { NextRequest, NextResponse } from 'next/server'
import { ratingService } from '@/lib/rating/ratingService'

// GET /api/rating/leaderboard - Get rating leaderboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const offset = parseInt(searchParams.get('offset') || '0')
    const minGames = parseInt(searchParams.get('minGames') || '5')

    const leaderboard = await ratingService.getLeaderboard(limit)
    
    // Filter by minimum games if specified
    const filteredLeaderboard = minGames > 0 
      ? leaderboard.filter(player => player.games_count >= minGames)
      : leaderboard

    // Apply pagination
    const paginatedLeaderboard = filteredLeaderboard.slice(offset, offset + limit)

    return NextResponse.json({
      leaderboard: paginatedLeaderboard,
      pagination: {
        limit,
        offset,
        total: filteredLeaderboard.length,
        hasMore: offset + limit < filteredLeaderboard.length
      },
      filters: {
        minGames
      }
    })
  } catch (error) {
    console.error('Error getting leaderboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}