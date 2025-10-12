import { NextResponse } from "next/server"
import { getAllUsers } from "@/lib/db"

export async function GET() {
  try {
    const users = getAllUsers()
    return NextResponse.json(users)
  } catch (e) {
    console.error("Failed to list users:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}