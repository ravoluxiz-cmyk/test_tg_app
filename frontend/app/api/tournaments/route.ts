import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/telegram"
import { createTournament, listTournaments, type Tournament } from "@/lib/db"

export async function GET() {
  try {
    const tournaments = listTournaments()
    return NextResponse.json(tournaments)
  } catch (e) {
    console.error("Failed to list tournaments:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = requireAdmin(request.headers)
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const body = (await request.json()) as Partial<Tournament>

    if (!body.title) {
      return NextResponse.json({ error: "Название обязательно" }, { status: 400 })
    }

    const tournament: Tournament = {
      title: body.title,
      format: body.format || "swiss_fide_javafo",
      points_win: body.points_win ?? 1,
      points_loss: body.points_loss ?? 0,
      points_draw: body.points_draw ?? 0.5,
      bye_points: body.bye_points ?? 0,
      rounds: body.rounds ?? 5,
      tiebreakers: body.tiebreakers || "head_to_head, buchholz_cut1, buchholz",
      team_mode: body.team_mode || "none",
      allow_join: body.allow_join ?? 0,
      allow_edit_results: body.allow_edit_results ?? 0,
      allow_danger_changes: body.allow_danger_changes ?? 0,
      forbid_repeat_bye: body.forbid_repeat_bye ?? 1,
      late_join_points: body.late_join_points ?? 0,
      hide_rating: body.hide_rating ?? 0,
      hide_new_rating: body.hide_new_rating ?? 0,
      compute_performance: body.compute_performance ?? 0,
      hide_color_names: body.hide_color_names ?? 0,
      show_opponent_names: body.show_opponent_names ?? 1,
      archived: body.archived ?? 0,
    }

    const created = createTournament(tournament)
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    console.error("Failed to create tournament:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
