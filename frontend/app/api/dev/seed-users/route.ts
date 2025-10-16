import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/telegram"
import { seedTestUsers } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request.headers)
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const result = seedTestUsers(20)
    const { inserted } = await result
    return NextResponse.json({ ok: true, inserted })
  } catch (e) {
    console.error("Failed to seed users:", e)
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 })
  }
}