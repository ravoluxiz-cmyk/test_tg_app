import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/telegram"

export async function GET(req: NextRequest) {
  // В dev-окружении разрешаем доступ без проверки, если TESTSTRICT не включен
  const isDev = process.env.NODE_ENV !== "production"
  const testStrict = String(process.env.TESTSTRICT || '').toLowerCase()
  const enforceStrictInDev = isDev && (testStrict === '1' || testStrict === 'true' || testStrict === 'yes')

  if (isDev && !enforceStrictInDev) {
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