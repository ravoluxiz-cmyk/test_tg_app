import { NextRequest, NextResponse } from 'next/server'
import { ratingPairingService } from '@/lib/rating/ratingPairingService'

// GET /api/rating/recommendations/[tournamentId]/[userId] - Get pairing recommendations for user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string; userId: string }> }
) {
  try {
    const { tournamentId: tournamentIdParam, userId: userIdParam } = await params
    const tournamentId = parseInt(tournamentIdParam)
    const userId = parseInt(userIdParam)
    const { searchParams } = new URL(request.url)
    const maxOpponents = Math.min(parseInt(searchParams.get('max') || '5'), 10)

    if (isNaN(tournamentId) || isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid tournament or user ID' },
        { status: 400 }
      )
    }

    const recommendations = await ratingPairingService.getPairingRecommendations(
      tournamentId,
      userId,
      maxOpponents
    )

    return NextResponse.json({
      recommendations,
      metadata: {
        totalRecommendations: recommendations.length,
        userId,
        tournamentId
      }
    })

  } catch (error) {
    console.error('Error getting pairing recommendations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}