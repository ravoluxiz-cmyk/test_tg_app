import { NextRequest, NextResponse } from "next/server"
import { getTelegramUserFromHeaders } from "@/lib/telegram"
import { updateMatchResult } from "@/lib/db"
import { processMatchResultWithRatings } from "@/lib/rating/matchIntegration"

export async function POST(req: NextRequest) {
  try {
    const user = getTelegramUserFromHeaders(req.headers)
    if (!user) {
      return NextResponse.json({ ok: false, error: "Authentication Failed: Invalid Telegram Web App initData" }, { status: 401 })
    }

    const body = await req.json().catch(() => null) as { matchId?: number; result?: string }
    const matchId = body?.matchId
    const result = body?.result

    if (!matchId || typeof matchId !== 'number') {
      return NextResponse.json({ ok: false, error: "Missing or invalid matchId" }, { status: 400 })
    }
    if (!result || typeof result !== 'string') {
      return NextResponse.json({ ok: false, error: "Missing or invalid result" }, { status: 400 })
    }

    const allowed = new Set(["white", "black", "draw", "bye", "forfeit_white", "forfeit_black", "not_played"]) 
    const finalResult = allowed.has(result) ? result : "not_played"

    const updated = await updateMatchResult(matchId, finalResult)
    if (!updated) {
      return NextResponse.json({ ok: false, error: "Failed to update match" }, { status: 500 })
    }

    // Process rating updates if match result is valid for rating
    if (['white', 'black', 'draw'].includes(finalResult)) {
      try {
        const ratingResult = await processMatchResultWithRatings(matchId, finalResult)
        if (ratingResult.success) {
          console.log('Rating updates processed successfully:', ratingResult.ratingUpdates)
        } else {
          console.warn('Rating update failed:', ratingResult.error)
        }
      } catch (ratingError) {
        console.error('Error processing rating updates:', ratingError)
        // Don't fail the entire request if rating update fails
      }
    }

    return NextResponse.json({ ok: true, match: updated })
  } catch (e) {
    console.error("/api/match/submit failed:", e)
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 })
  }
}