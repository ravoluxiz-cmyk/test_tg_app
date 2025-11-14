import { google, calendar_v3 } from "googleapis"
type Event = calendar_v3.Schema$Event
type CacheEntry = { data: Event[]; expiresAt: number }
const cache = new Map<string, CacheEntry>()
export const calendarMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  cacheStaleHits: 0,
  apiCalls: 0,
  apiErrors: 0,
  lastApiLatencyMs: 0,
  totalEventsFetched: 0,
  lastErrorAt: 0,
  lastErrorMessage: '',
  lastStatus: 0,
}

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
  const calendar = getCalendarClient()
  const calendarId = process.env.GOOGLE_CALENDAR_ID
  if (!calendarId) {
    throw new Error("GOOGLE_CALENDAR_ID not set in environment variables")
  }
  const key = `${calendarId}|${maxResults}`
  const now = Date.now()
  const ttlMs = Number(process.env.GCAL_CACHE_TTL_MS || 300_000)
  const cached = cache.get(key)
  if (cached && cached.expiresAt > now) {
    calendarMetrics.cacheHits++
    calendarMetrics.totalEventsFetched += cached.data.length
    return cached.data
  }
  calendarMetrics.cacheMisses++
  const started = Date.now()
  try {
    calendarMetrics.apiCalls++
    const response = await calendar.events.list({
      calendarId,
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
    })
    const items = response.data.items || []
    calendarMetrics.lastApiLatencyMs = Date.now() - started
    calendarMetrics.totalEventsFetched += items.length
    cache.set(key, { data: items, expiresAt: now + ttlMs })
    return items
  } catch (error: unknown) {
    calendarMetrics.apiErrors++
    calendarMetrics.lastApiLatencyMs = Date.now() - started
    calendarMetrics.lastErrorAt = Date.now()
    calendarMetrics.lastErrorMessage = String((error as Error)?.message || error)
    const errCode = (error as { code?: number } | null)?.code
    calendarMetrics.lastStatus = Number(errCode || 0)
    if (cached) {
      calendarMetrics.cacheStaleHits++
      return cached.data
    }
    throw error
  }
}
