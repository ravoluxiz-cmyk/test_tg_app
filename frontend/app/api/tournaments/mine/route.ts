import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/telegram"
import { listTournamentsByCreator } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const adminUser = requireAdmin(request.headers)
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const tournaments = listTournamentsByCreator(adminUser.id)
    return NextResponse.json(tournaments)
  } catch (e) {
    console.error("Failed to list my tournaments:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}