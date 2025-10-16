import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/telegram"
import { deleteRoundById } from "@/lib/db"
import { supabase } from "@/lib/supabase"

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; tourId: string } }
) {
  try {
    const telegramUser = await requireAdmin(req.headers)
    if (!telegramUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const tournamentId = Number(params.id)
    const tourId = Number(params.tourId)
    if (!Number.isFinite(tournamentId) || !Number.isFinite(tourId)) {
      return NextResponse.json({ error: "Некорректные параметры" }, { status: 400 })
    }

    // Проверяем, что тур принадлежит турниру
    const { data: round, error } = await supabase
      .from("rounds")
      .select("id, tournament_id")
      .eq("id", tourId)
      .single()

    if (error || !round) {
      return NextResponse.json({ error: "Тур не найден" }, { status: 404 })
    }

    if (round.tournament_id !== tournamentId) {
      return NextResponse.json({ error: "Тур не принадлежит турниру" }, { status: 400 })
    }

    const ok = await deleteRoundById(tourId)
    if (!ok) {
      return NextResponse.json({ error: "Не удалось удалить тур" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("Failed to delete tour:", e)
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 })
  }
}