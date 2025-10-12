import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/telegram"
import { deleteTournament, getTournamentById } from "@/lib/db"

interface ParamsPromise {
  params: Promise<{ id: string }>
}

export async function DELETE(request: NextRequest, { params }: ParamsPromise) {
  try {
    const adminUser = requireAdmin(request.headers)
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const tournamentId = Number(id)
    if (!Number.isFinite(tournamentId)) {
      return NextResponse.json({ error: "Некорректный ID турнира" }, { status: 400 })
    }

    const exists = getTournamentById(tournamentId)
    if (!exists) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 })
    }

    const ok = deleteTournament(tournamentId)
    if (!ok) {
      return NextResponse.json({ error: "Не удалось удалить турнир" }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("Failed to delete tournament:", e)
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 })
  }
}