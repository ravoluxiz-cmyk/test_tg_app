import { NextRequest, NextResponse } from "next/server"
import { addTournamentParticipant } from "@/lib/db"
import { supabase } from "@/lib/supabase"
import { requireAdmin } from "@/lib/telegram"

export async function POST(request: NextRequest) {
  try {
    // Check authorization - only admins can add participants
    const adminUser = await requireAdmin(request.headers)
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { tournament_id, user_id, nickname } = body as {
      tournament_id?: number
      user_id?: number
      nickname?: string
    }

    if (!tournament_id || !user_id || !nickname) {
      return NextResponse.json({ error: "user_id, tournament_id и nickname обязательны" }, { status: 400 })
    }

    // Check tournament existence and status
    const { data: tournament, error: tErr } = await supabase
      .from('tournaments')
      .select('id, archived')
      .eq('id', tournament_id)
      .single()

    if (!tournament || (tErr && tErr.code === 'PGRST116')) {
      return NextResponse.json({ error: "tournament not found or invalid status" }, { status: 400 })
    }

    if (Number(tournament.archived) === 1) {
      return NextResponse.json({ error: "tournament not found or invalid status" }, { status: 400 })
    }

    // Check user existence
    const { data: user, error: uErr } = await supabase
      .from('users')
      .select('id')
      .eq('id', user_id)
      .single()

    if (!user || (uErr && uErr.code === 'PGRST116')) {
      return NextResponse.json({ error: "user not found" }, { status: 404 })
    }

    const created = await addTournamentParticipant({ tournament_id, user_id, nickname })
    if (!created) {
      return NextResponse.json({ error: "Не удалось добавить участника (возможно, ник занят)" }, { status: 400 })
    }
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    console.error("Failed to add participant (alias):", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}