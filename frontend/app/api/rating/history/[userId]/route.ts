import { NextRequest, NextResponse } from 'next/server'
import { ratingService } from '@/lib/rating/ratingService'

// GET /api/rating/history/[userId] - Get player rating history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: userIdParam } = await params
    const userId = parseInt(userIdParam)
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    const history = await ratingService.getRatingHistory(userId, limit)
    
    return NextResponse.json({ 
      history,
      pagination: {
        limit,
        offset,
        total: history.length
      }
    })
  } catch (error) {
    console.error('Error getting rating history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}