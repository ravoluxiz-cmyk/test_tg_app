import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/telegram"

export async function GET(req: NextRequest) {
  try {
    const adminUser = requireAdmin(req.headers)
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("Admin check failed:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}