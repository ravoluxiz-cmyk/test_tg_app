import { NextRequest, NextResponse } from 'next/server'
import { ratingService } from '@/lib/rating/ratingService'

// POST /api/rating/calculate - Calculate rating from match result
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { whitePlayerId, blackPlayerId, result, matchId, tournamentId } = body

    // Validate input
    if (!whitePlayerId || !blackPlayerId || !result || !matchId || !tournamentId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Validate result value
    if (!['white', 'black', 'draw'].includes(result)) {
      return NextResponse.json(
        { error: 'Invalid result value. Must be "white", "black", or "draw"' },
        { status: 400 }
      )
    }

    const matchResult = {
      whitePlayerId: parseInt(whitePlayerId),
      blackPlayerId: parseInt(blackPlayerId),
      result: result as 'white' | 'black' | 'draw',
      matchId: parseInt(matchId),
      tournamentId: parseInt(tournamentId)
    }

    // Validate numeric values
    if (isNaN(matchResult.whitePlayerId) || isNaN(matchResult.blackPlayerId) || isNaN(matchResult.matchId) || isNaN(matchResult.tournamentId)) {
      return NextResponse.json(
        { error: 'Invalid numeric parameters' },
        { status: 400 }
      )
    }

    // Calculate and update ratings
    const ratingResult = await ratingService.updateRatingFromMatch(matchResult)

    if (!ratingResult || !ratingResult.success) {
      return NextResponse.json(
        { 
          error: 'Failed to update ratings', 
          details: ratingResult?.error || 'Unknown error' 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      rating: ratingResult.newRating,
      history: ratingResult.historyEntry
    })

  } catch (error) {
    console.error('Error calculating rating:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}