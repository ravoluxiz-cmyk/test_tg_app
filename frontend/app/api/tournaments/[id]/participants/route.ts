import { NextRequest, NextResponse } from "next/server"
import { addTournamentParticipant, listTournamentParticipants } from "@/lib/db"

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const tournamentId = Number(id)
    if (!Number.isFinite(tournamentId)) {
      return NextResponse.json({ error: "Invalid tournament id" }, { status: 400 })
    }
    const participants = await listTournamentParticipants(tournamentId)
    return NextResponse.json(participants)
  } catch (e) {
    console.error("Failed to list participants:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const tournamentId = Number(id)
    if (!Number.isFinite(tournamentId)) {
      return NextResponse.json({ error: "Invalid tournament id" }, { status: 400 })
    }

    const body = await request.json()
    const { user_id, nickname } = body as { user_id?: number; nickname?: string }

    if (!user_id || !nickname) {
      return NextResponse.json({ error: "user_id и nickname обязательны" }, { status: 400 })
    }

    const created = await addTournamentParticipant({ tournament_id: tournamentId, user_id, nickname })
    if (!created) {
      return NextResponse.json({ error: "Не удалось добавить участника (возможно, ник занят)" }, { status: 400 })
    }
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    console.error("Failed to add participant:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}