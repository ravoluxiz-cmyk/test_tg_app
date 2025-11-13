import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/telegram"
import { listRounds as listToursInternal, createRound as createTourInternal, getNextRoundNumber as getNextTourNumberInternal, deleteAllRoundsForTournament, getTournamentById } from "@/lib/db"

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    const tournamentId = Number(id)
    if (!Number.isFinite(tournamentId)) {
      return NextResponse.json({ error: "Некорректный ID турнира" }, { status: 400 })
    }
    const tours = await listToursInternal(tournamentId)
    return NextResponse.json(tours)
  } catch (e) {
    console.error("Failed to list tours:", e)
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const telegramUser = await requireAdmin(req.headers)
    if (!telegramUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await ctx.params
    const tournamentId = Number(id)
    if (!Number.isFinite(tournamentId)) {
      return NextResponse.json({ error: "Некорректный ID турнира" }, { status: 400 })
    }

    // Fetch tournament to enforce business rules (rounds limit, archived state)
    const tournament = await getTournamentById(tournamentId)
    if (!tournament) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 })
    }

    if ((tournament.archived ?? 0) === 1) {
      return NextResponse.json({ error: "Турнир завершён, новые туры недоступны" }, { status: 400 })
    }

    const planned = tournament.rounds ?? 0

    const body = await req.json().catch(() => ({})) as { number?: number }
    const nextNumber = body.number ?? (await getNextTourNumberInternal(tournamentId))

    if (planned > 0 && nextNumber > planned) {
      return NextResponse.json({ error: `Достигнут лимит туров (${planned}) — создать тур №${nextNumber} нельзя` }, { status: 400 })
    }

    const tour = await createTourInternal(tournamentId, nextNumber)
    return NextResponse.json(tour, { status: 201 })
  } catch (e) {
    console.error("Failed to create tour:", e)
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const telegramUser = await requireAdmin(req.headers)
    if (!telegramUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await ctx.params
    const tournamentId = Number(id)
    if (!Number.isFinite(tournamentId)) {
      return NextResponse.json({ error: "Некорректный ID турнира" }, { status: 400 })
    }

    const ok = await deleteAllRoundsForTournament(tournamentId)
    if (!ok) {
      return NextResponse.json({ error: "Не удалось удалить туры" }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("Failed to delete tours:", e)
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 })
  }
}