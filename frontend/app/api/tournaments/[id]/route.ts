import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/telegram"
import { deleteTournament, getTournamentById, updateTournamentArchived } from "@/lib/db"

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const tournamentId = Number(id)
    if (!Number.isFinite(tournamentId)) {
      return NextResponse.json({ error: "Некорректный ID турнира" }, { status: 400 })
    }

    const tournament = await getTournamentById(tournamentId)
    if (!tournament) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 })
    }

    return NextResponse.json(tournament)
  } catch (e) {
    console.error("Failed to get tournament:", e)
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const adminUser = await requireAdmin(request.headers)
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await ctx.params
    const tournamentId = Number(id)
    if (!Number.isFinite(tournamentId)) {
      return NextResponse.json({ error: "Некорректный ID турнира" }, { status: 400 })
    }

    const exists = await getTournamentById(tournamentId)
    if (!exists) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 })
    }

    const ok = await deleteTournament(tournamentId)
    if (!ok) {
      return NextResponse.json({ error: "Не удалось удалить турнир" }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("Failed to delete tournament:", e)
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const adminUser = await requireAdmin(request.headers)
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await ctx.params
    const tournamentId = Number(id)
    if (!Number.isFinite(tournamentId)) {
      return NextResponse.json({ error: "Некорректный ID турнира" }, { status: 400 })
    }

    const exists = await getTournamentById(tournamentId)
    if (!exists) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 })
    }

    const body = await request.json().catch(() => null)
    const archived = typeof body?.archived === "number" ? body.archived : (typeof body?.archived === "boolean" ? (body.archived ? 1 : 0) : undefined)
    if (archived === undefined || (archived !== 0 && archived !== 1)) {
      return NextResponse.json({ error: "Укажите archived: 0 или 1" }, { status: 400 })
    }

    const ok = await updateTournamentArchived(tournamentId, archived)
    if (!ok) {
      return NextResponse.json({ error: "Не удалось обновить статус" }, { status: 500 })
    }
    return NextResponse.json({ ok: true, id: tournamentId, archived })
  } catch (e) {
    console.error("Failed to patch tournament:", e)
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 })
  }
}