import { NextRequest, NextResponse } from "next/server"
import { getTelegramUserFromHeaders } from "@/lib/telegram"
import { listMatches, updateMatchResult } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; roundId: string } }
) {
  try {
    const roundId = Number(params.roundId)
    if (!Number.isFinite(roundId)) {
      return NextResponse.json({ error: "Некорректный раунд" }, { status: 400 })
    }
    const matches = listMatches(roundId)
    return NextResponse.json(matches)
  } catch (e) {
    console.error("Failed to list matches:", e)
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; roundId: string } }
) {
  try {
    const telegramUser = getTelegramUserFromHeaders(req.headers)
    if (!telegramUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({})) as { matchId?: number; result?: string }
    if (!body.matchId || !body.result) {
      return NextResponse.json({ error: "Укажите matchId и result" }, { status: 400 })
    }

    const updated = updateMatchResult(body.matchId, body.result)
    if (!updated) {
      return NextResponse.json({ error: "Матч не найден" }, { status: 404 })
    }
    return NextResponse.json(updated)
  } catch (e) {
    console.error("Failed to update match:", e)
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 })
  }
}