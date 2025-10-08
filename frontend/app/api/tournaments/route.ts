import { NextResponse } from "next/server"
import { fetchUpcomingEvents } from "@/lib/google-calendar/client"
import { parseCalendarEvents } from "@/lib/google-calendar/parser"

export async function GET() {
  try {
    // Fetch events from Google Calendar
    const events = await fetchUpcomingEvents(20)

    // Parse events to Tournament objects
    const tournaments = parseCalendarEvents(events)

    return NextResponse.json(tournaments)
  } catch (error) {
    console.error("Error fetching tournaments:", error)

    // Return user-friendly error message
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    return NextResponse.json(
      {
        error: "Failed to fetch tournaments",
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
