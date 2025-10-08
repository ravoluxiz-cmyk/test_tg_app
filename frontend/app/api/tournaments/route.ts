import { NextResponse } from "next/server"

// Mock data for now - replace with actual Google Calendar API integration
const mockTournaments = [
  {
    id: "1",
    title: "Блиц-турнир RepChess",
    date: "15 октября 2025",
    time: "18:00 - 21:00",
    location: "Шахматный клуб на Невском, 25",
    participants: 24,
    description: "Быстрые партии с контролем времени 5+3. Призовой фонд 50,000₽",
  },
  {
    id: "2",
    title: "Открытый турнир по классике",
    date: "22 октября 2025",
    time: "10:00 - 18:00",
    location: "Центр культуры, ул. Ленина 45",
    participants: 32,
    description: "Классический шахматный турнир с контролем 90+30. Категория открытая.",
  },
  {
    id: "3",
    title: "Детский турнир до 12 лет",
    date: "28 октября 2025",
    time: "14:00 - 17:00",
    location: "Детский центр 'Умка'",
    participants: 18,
    description: "Турнир для юных шахматистов. Призы всем участникам!",
  },
  {
    id: "4",
    title: "Рапид-турнир по средам",
    date: "30 октября 2025",
    time: "19:00 - 22:00",
    location: "Онлайн на chess.com",
    participants: 48,
    description: "Еженедельный онлайн турнир. Контроль времени 15+10.",
  },
]

export async function GET() {
  try {
    // TODO: Replace with actual Google Calendar API integration
    // Example:
    // const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    // const response = await calendar.events.list({
    //   calendarId: process.env.GOOGLE_CALENDAR_ID,
    //   timeMin: new Date().toISOString(),
    //   maxResults: 10,
    //   singleEvents: true,
    //   orderBy: 'startTime',
    // })

    // For now, return mock data
    return NextResponse.json(mockTournaments)
  } catch (error) {
    console.error("Error fetching tournaments:", error)
    return NextResponse.json(
      { error: "Failed to fetch tournaments" },
      { status: 500 }
    )
  }
}
