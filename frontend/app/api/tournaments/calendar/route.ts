import { NextResponse } from "next/server"
import { fetchUpcomingEvents } from "@/lib/google-calendar/client"
import { parseCalendarEvents } from "@/lib/google-calendar/parser"

export async function GET(req: Request) {
  const url = new URL(req.url)
  // Allow tests to simulate an upstream failure
  if (url.searchParams.get("simulateError") === "true") {
    return NextResponse.json({ error: "Simulated failure" }, { status: 500 })
  }

  try {
    const events = await fetchUpcomingEvents(50)
    const tournaments = parseCalendarEvents(events)
    return NextResponse.json(tournaments)
  } catch (e) {
    console.error("Failed to fetch calendar tournaments:", e)
    // Return empty array on error to prevent breaking the UI
    return NextResponse.json([])
  }
}