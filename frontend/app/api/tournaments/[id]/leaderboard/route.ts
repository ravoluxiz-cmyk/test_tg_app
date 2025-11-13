import { NextRequest, NextResponse } from "next/server"
import { listLeaderboard, getStandings } from "@/lib/db"

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const tournamentId = Number(id)
    if (!Number.isFinite(tournamentId)) {
      return NextResponse.json({ error: "Некорректный ID турнира" }, { status: 400 })
    }
    const leaderboard = await listLeaderboard(tournamentId)
    if (Array.isArray(leaderboard) && leaderboard.length > 0) {
      return NextResponse.json(leaderboard)
    }

    // Fallback: compute standings dynamically when snapshot is absent
    const standings = await getStandings(tournamentId)
    const rows = standings.map((s, idx) => ({
      participant_id: s.participant_id,
      nickname: s.nickname,
      points: s.points,
      rank: idx + 1,
    }))
    return NextResponse.json(rows)
  } catch (e) {
    console.error("Failed to get leaderboard:", e)
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 })
  }
}