import { NextRequest, NextResponse } from 'next/server'
import { ratingService } from '@/lib/rating/ratingService'

// GET /api/rating/predict - Predict match outcome
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const player1Id = parseInt(searchParams.get('player1') || '0')
    const player2Id = parseInt(searchParams.get('player2') || '0')

    if (!player1Id || !player2Id || player1Id === player2Id) {
      return NextResponse.json(
        { error: 'Valid player1 and player2 IDs are required' },
        { status: 400 }
      )
    }

    const prediction = await ratingService.predictMatchOutcome(player1Id, player2Id)
    
    return NextResponse.json({
      prediction,
      players: {
        player1: player1Id,
        player2: player2Id
      }
    })
  } catch (error) {
    console.error('Error predicting match outcome:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}