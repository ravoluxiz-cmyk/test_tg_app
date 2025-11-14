import { NextRequest, NextResponse } from 'next/server'
import { ratingService } from '@/lib/rating/ratingService'
import { supabase } from '@/lib/supabase'

// GET /api/rating/player/[userId] - Get player rating
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: userIdParam } = await params
    const userId = parseInt(userIdParam)
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    const rating = await ratingService.getPlayerRating(userId)
    
    if (!rating) {
      // Initialize rating if not exists
      const newRating = await ratingService.initializePlayerRating(userId)
      if (!newRating) {
        return NextResponse.json(
          { error: 'Failed to initialize player rating' },
          { status: 500 }
        )
      }
      return NextResponse.json({ rating: newRating })
    }

    return NextResponse.json({ rating })
  } catch (error) {
    console.error('Error getting player rating:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/rating/player/[userId] - Update player rating (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: userIdParam } = await params
    const userId = parseInt(userIdParam)
    const body = await request.json()
    const { rating, rd, volatility } = body

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    // TODO: Add admin authentication check
    // For now, we'll skip auth for development

    if (typeof rating !== 'number' || typeof rd !== 'number' || typeof volatility !== 'number') {
      return NextResponse.json(
        { error: 'Invalid rating parameters' },
        { status: 400 }
      )
    }

    // Get current rating
    const currentRating = await ratingService.getPlayerRating(userId)
    if (!currentRating) {
      return NextResponse.json(
        { error: 'Player rating not found' },
        { status: 404 }
      )
    }

    // Update rating
    const { data, error } = await supabase
      .from('player_ratings')
      .update({
        rating,
        rd,
        volatility,
        last_updated: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update rating: ${error.message}`)
    }

    // Create history entry for manual adjustment
    await supabase.from('rating_history').insert({
      user_id: userId,
      old_rating: currentRating.rating,
      new_rating: rating,
      old_rd: currentRating.rd,
      new_rd: rd,
      old_volatility: currentRating.volatility,
      new_volatility: volatility,
      change_reason: 'manual_adjustment',
      created_at: new Date().toISOString()
    })

    return NextResponse.json({ rating: data })
  } catch (error) {
    console.error('Error updating player rating:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}