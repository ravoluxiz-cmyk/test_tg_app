import { NextResponse } from "next/server"
import { fetchUpcomingEvents } from "@/lib/google-calendar/client"
import { parseCalendarEvents } from "@/lib/google-calendar/parser"

export async function GET() {
  try {
    const events = await fetchUpcomingEvents(50)
    const tournaments = parseCalendarEvents(events)
    return NextResponse.json(tournaments)
  } catch (e) {
    console.error("Failed to fetch calendar tournaments:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}