import { calendar_v3 } from "googleapis"
import { Tournament } from "@/components/tournaments/tournament-card"

/**
 * Parse Google Calendar event to Tournament object
 *
 * Expected event structure:
 * - Summary: Tournament title
 * - Description: Tournament description (optional)
 * - Start: Date and time
 * - Location: Tournament location
 * - Extended properties: participants count
 */
export function parseCalendarEvent(
  event: calendar_v3.Schema$Event
): Tournament | null {
  try {
    if (!event.id || !event.summary) {
      return null
    }

    // Parse date and time
    const start = event.start?.dateTime || event.start?.date
    if (!start) return null

    const startDate = new Date(start)
    const endDate = event.end?.dateTime || event.end?.date
      ? new Date(event.end.dateTime || event.end.date!)
      : null

    // Format date (e.g., "15 октября 2025")
    const formattedDate = startDate.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })

    // Format time (e.g., "18:00 - 21:00")
    let formattedTime = ""
    if (event.start?.dateTime) {
      const startTime = startDate.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      })
      const endTime = endDate
        ? endDate.toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : ""
      formattedTime = endTime ? `${startTime} - ${endTime}` : startTime
    } else {
      formattedTime = "Весь день"
    }

    // Extract participants count from extended properties or description
    let participants: number | undefined
    if (event.extendedProperties?.private?.participants) {
      participants = parseInt(
        event.extendedProperties.private.participants,
        10
      )
    }

    // Parse location
    const location = event.location || "Уточняется"

    return {
      id: event.id,
      title: event.summary,
      date: formattedDate,
      time: formattedTime,
      location,
      participants,
      description: event.description || undefined,
    }
  } catch (error) {
    console.error("Error parsing calendar event:", error)
    return null
  }
}

/**
 * Parse multiple calendar events
 */
export function parseCalendarEvents(
  events: calendar_v3.Schema$Event[]
): Tournament[] {
  return events
    .map(parseCalendarEvent)
    .filter((tournament): tournament is Tournament => tournament !== null)
}
