import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/telegram"
import { listRounds as listToursInternal, createRound as createTourInternal, getNextRoundNumber as getNextTourNumberInternal } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tournamentId = Number(id)
    if (!Number.isFinite(tournamentId)) {
      return NextResponse.json({ error: "Некорректный ID турнира" }, { status: 400 })
    }
    const tours = listToursInternal(tournamentId)
    return NextResponse.json(tours)
  } catch (e) {
    console.error("Failed to list tours:", e)
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const telegramUser = requireAdmin(req.headers)
    if (!telegramUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const tournamentId = Number(id)
    if (!Number.isFinite(tournamentId)) {
      return NextResponse.json({ error: "Некорректный ID турнира" }, { status: 400 })
    }

    const body = await req.json().catch(() => ({})) as { number?: number }
    const number = body.number ?? getNextTourNumberInternal(tournamentId)
    const tour = createTourInternal(tournamentId, number)
    return NextResponse.json(tour, { status: 201 })
  } catch (e) {
    console.error("Failed to create tour:", e)
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 })
  }
}