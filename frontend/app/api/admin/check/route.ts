import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/telegram"

export async function GET(req: NextRequest) {
  // В dev-окружении разрешаем доступ без проверки
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({ ok: true })
  }
  try {
    const adminUser = await requireAdmin(req.headers)
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("Admin check failed:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}