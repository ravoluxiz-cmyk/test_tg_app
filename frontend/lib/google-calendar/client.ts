import { google } from "googleapis"

/**
 * Get Google Calendar client
 * Uses service account authentication
 */
export function getCalendarClient() {
  // Option 1: Service Account (recommended for server-side)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    )

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    })

    return google.calendar({ version: "v3", auth })
  }

  // Option 2: API Key (simpler, but only for public calendars)
  if (process.env.GOOGLE_CALENDAR_API_KEY) {
    return google.calendar({
      version: "v3",
      auth: process.env.GOOGLE_CALENDAR_API_KEY,
    })
  }

  throw new Error(
    "Google Calendar credentials not configured. Please set GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_CALENDAR_API_KEY"
  )
}

/**
 * Fetch upcoming events from Google Calendar
 */
export async function fetchUpcomingEvents(maxResults: number = 10) {
  try {
    const calendar = getCalendarClient()
    const calendarId = process.env.GOOGLE_CALENDAR_ID

    if (!calendarId) {
      throw new Error("GOOGLE_CALENDAR_ID not set in environment variables")
    }

    const response = await calendar.events.list({
      calendarId,
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
    })

    return response.data.items || []
  } catch (error) {
    console.error("Error fetching calendar events:", error)
    throw error
  }
}
