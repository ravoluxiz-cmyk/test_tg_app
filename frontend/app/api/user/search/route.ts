import { NextRequest, NextResponse } from "next/server"
import { searchUsersByUsernameFragment } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get("q") || "").trim()
    const limitRaw = searchParams.get("limit")
    const limit = limitRaw ? Math.max(1, Math.min(50, Number(limitRaw))) : 10

    if (!q) {
      return NextResponse.json({ users: [] })
    }

    const users = await searchUsersByUsernameFragment(q, limit)
    return NextResponse.json({ users })
  } catch (e) {
    console.error("User search (alias) failed:", e)
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 })
  }
}