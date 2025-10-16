import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/telegram"
import { getTournamentById, finalizeTournament } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminUser = await requireAdmin(request.headers)
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const resolved = await params
    const tournamentId = Number(resolved.id)
    if (!Number.isFinite(tournamentId)) {
      return NextResponse.json({ error: "Некорректный ID турнира" }, { status: 400 })
    }

    const exists = await getTournamentById(tournamentId)
    if (!exists) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 })
    }

    const ok = await finalizeTournament(tournamentId)
    if (!ok) {
      return NextResponse.json({ error: "Не удалось завершить турнир" }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("Failed to finalize tournament:", e)
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 })
  }
}