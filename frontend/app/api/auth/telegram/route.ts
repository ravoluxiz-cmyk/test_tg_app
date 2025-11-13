import { NextRequest, NextResponse } from "next/server"
import { getTelegramUserFromHeaders, validateTelegramWebAppData, parseTelegramWebAppData } from "@/lib/telegram"

export async function GET(req: NextRequest) {
  try {
    const user = getTelegramUserFromHeaders(req.headers)
    if (user) {
      return NextResponse.json({ ok: true, user })
    }
    // Explicit failure message to aid tests/dev diagnostics
    return NextResponse.json({ ok: false, error: "Authentication Failed: Invalid Telegram Web App initData" }, { status: 400 })
  } catch (e) {
    console.error("Auth telegram GET failed:", e)
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as { initData?: string }
    const initData = body?.initData

    if (!initData) {
      return NextResponse.json({ ok: false, error: "Missing initData" }, { status: 400 })
    }

    const isProd = process.env.NODE_ENV === "production"
    let user = null as ReturnType<typeof parseTelegramWebAppData> | null

    if (isProd) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN || ""
      if (!botToken) {
        return NextResponse.json({ ok: false, error: "Bot token not configured" }, { status: 500 })
      }
      user = validateTelegramWebAppData(initData, botToken)
    } else {
      user = parseTelegramWebAppData(initData)
    }

    if (user) {
      return NextResponse.json({ ok: true, user })
    }
    return NextResponse.json({ ok: false, error: "Authentication Failed: Invalid Telegram Web App initData" }, { status: 400 })
  } catch (e) {
    console.error("Auth telegram POST failed:", e)
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 })
  }
}