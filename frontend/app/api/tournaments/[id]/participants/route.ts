import { NextRequest, NextResponse } from "next/server"
import { addTournamentParticipant, listTournamentParticipants } from "@/lib/db"

interface ParamsPromise {
  params: Promise<{ id: string }>
}

export async function GET(_: NextRequest, { params }: ParamsPromise) {
  try {
    const { id } = await params
    const tournamentId = Number(id)
    if (Number.isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid tournament id" }, { status: 400 })
    }
    const participants = listTournamentParticipants(tournamentId)
    return NextResponse.json(participants)
  } catch (e) {
    console.error("Failed to list participants:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: ParamsPromise) {
  try {
    const { id } = await params
    const tournamentId = Number(id)
    if (Number.isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid tournament id" }, { status: 400 })
    }

    const body = await request.json()
    const { user_id, nickname } = body as { user_id?: number; nickname?: string }

    if (!user_id || !nickname) {
      return NextResponse.json({ error: "user_id и nickname обязательны" }, { status: 400 })
    }

    const created = addTournamentParticipant({ tournament_id: tournamentId, user_id, nickname })
    if (!created) {
      return NextResponse.json({ error: "Не удалось добавить участника (возможно, ник занят)" }, { status: 400 })
    }
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    console.error("Failed to add participant:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}