import { NextResponse } from "next/server"

export async function GET() {
  // Simulate an upstream Google Calendar failure
  return NextResponse.json({ error: "Simulated Google Calendar failure" }, { status: 500 })
}