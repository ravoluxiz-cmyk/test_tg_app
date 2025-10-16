import { NextRequest, NextResponse } from "next/server"
import { searchUsersByUsernameFragment } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const raw = (url.searchParams.get("q") || "").trim()
    const limitRaw = url.searchParams.get("limit")
    const limit = limitRaw ? Math.min(50, Math.max(1, parseInt(limitRaw, 10))) : 8

    if (!raw) {
      return NextResponse.json([])
    }

    const fragment = raw.startsWith("@") ? raw.slice(1) : raw
    const users = await searchUsersByUsernameFragment(fragment, limit)
    return NextResponse.json(users)
  } catch (e) {
    console.error("Failed to search users:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}