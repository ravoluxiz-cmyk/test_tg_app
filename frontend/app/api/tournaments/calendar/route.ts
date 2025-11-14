import { NextResponse } from "next/server"
import { fetchUpcomingEvents, calendarMetrics } from "@/lib/google-calendar/client"
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
    return NextResponse.json(tournaments, {
      headers: {
        'X-Calendar-Cache-Hits': String(calendarMetrics.cacheHits),
        'X-Calendar-Cache-Misses': String(calendarMetrics.cacheMisses),
        'X-Calendar-Cache-Stale': String(calendarMetrics.cacheStaleHits),
        'X-Calendar-API-Calls': String(calendarMetrics.apiCalls),
        'X-Calendar-API-Errors': String(calendarMetrics.apiErrors),
        'X-Calendar-Last-Latency': String(calendarMetrics.lastApiLatencyMs),
      },
    })
  } catch (e) {
    console.error("Failed to fetch calendar tournaments:", e)
    return NextResponse.json([], {
      headers: {
        'X-Calendar-API-Errors': String(calendarMetrics.apiErrors),
        'X-Calendar-Last-Error-At': String(calendarMetrics.lastErrorAt),
      },
    })
  }
}
