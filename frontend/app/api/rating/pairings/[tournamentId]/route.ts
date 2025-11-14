import { NextRequest, NextResponse } from 'next/server'
import { ratingPairingService } from '@/lib/rating/ratingPairingService'
import { ratingService } from '@/lib/rating/ratingService'
import { supabase } from '@/lib/supabase'

// GET /api/rating/pairings/[tournamentId] - Get rating-based pairings for tournament
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId: tournamentIdParam } = await params
    const tournamentId = parseInt(tournamentIdParam)
    const { searchParams } = new URL(request.url)
    const roundNumber = parseInt(searchParams.get('round') || '1')
    const maxRatingDiff = parseInt(searchParams.get('maxDiff') || '200')
    const minQualityScore = parseFloat(searchParams.get('minQuality') || '0.6')

    if (isNaN(tournamentId)) {
      return NextResponse.json(
        { error: 'Invalid tournament ID' },
        { status: 400 }
      )
    }

    // Get tournament participants
    const { data: participants } = await supabase
      .from('tournament_participants')
      .select('*, user:users(*)')
      .eq('tournament_id', tournamentId)

    if (!participants || participants.length === 0) {
      return NextResponse.json(
        { error: 'No participants found for tournament' },
        { status: 404 }
      )
    }

    // Get rating-based pairings
    const pairings = await ratingPairingService.findRatingAwarePairings(
      tournamentId,
      roundNumber,
      participants,
      {
        ratingRange: { default: maxRatingDiff, max: maxRatingDiff * 1.5, expansionRate: 25 },
        quality: { minQualityScore, balanceColors: true, avoidRepeatOpponents: true, maxRatingDiffForTopPlayers: 100 },
        tournament: { swissSystem: true, acceleratedPairings: false, byesHandling: 'lowest_rating' }
      }
    )

    return NextResponse.json({
      pairings: await Promise.all(pairings.map(async (pairing) => {
        // Get ratings for participants
        const whiteRating = await ratingService.getPlayerRating(pairing.whiteParticipant.user_id)
        const blackRating = await ratingService.getPlayerRating(pairing.blackParticipant.user_id)
        
        return {
          white: {
            id: pairing.whiteParticipant.id,
            userId: pairing.whiteParticipant.user_id,
            nickname: pairing.whiteParticipant.nickname,
            rating: whiteRating?.rating || 1500
          },
          black: {
            id: pairing.blackParticipant.id,
            userId: pairing.blackParticipant.user_id,
            nickname: pairing.blackParticipant.nickname,
            rating: blackRating?.rating || 1500
          },
          ratingDifference: pairing.ratingDifference,
          qualityScore: pairing.qualityScore,
          colorBalance: pairing.colorBalance
        }
      })),
      metadata: {
        totalPairings: pairings.length,
        averageQualityScore: pairings.reduce((sum, p) => sum + p.qualityScore, 0) / pairings.length || 0,
        averageRatingDiff: pairings.reduce((sum, p) => sum + p.ratingDifference, 0) / pairings.length || 0
      }
    })

  } catch (error) {
    console.error('Error getting rating pairings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}