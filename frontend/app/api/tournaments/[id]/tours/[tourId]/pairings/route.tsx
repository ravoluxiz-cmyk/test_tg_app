import { NextRequest, NextResponse } from "next/server"
import { ImageResponse } from "next/og"
import { requireAdmin } from "@/lib/telegram"
import { simpleSwissPairings, getStandings, getTournamentById, listTournamentParticipants, listMatches, finalizeTournamentIfExceeded } from "@/lib/db"
import React, { Fragment } from "react"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tourId: string }> }
) {
  try {
    const telegramUser = await requireAdmin(req.headers)
    if (!telegramUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const resolved = await params
    const tournamentId = Number(resolved.id)
    const tourId = Number(resolved.tourId)
    if (!Number.isFinite(tournamentId) || !Number.isFinite(tourId)) {
      return NextResponse.json({ error: "Некорректные параметры" }, { status: 400 })
    }
    const matches = await simpleSwissPairings(tournamentId, tourId)

    // Generate standings screenshot and send to Telegram
    try {
      const tournament = await getTournamentById(tournamentId)
      const standings = await getStandings(tournamentId)
      const participants = await listTournamentParticipants(tournamentId)
      const participantsCount = participants.length

      const title = `Турнир: ${tournament?.title || "Без названия"}`
      const subtitle = `Тур ${tourId} • Участников: ${participantsCount}`

      const image = new ImageResponse(
        React.createElement(
          "div",
          {
            style: {
              width: 1200,
              height: 800,
              display: "flex",
              flexDirection: "column",
              background: "#0f172a",
              color: "#ffffff",
              fontSize: 28,
              padding: 40,
              fontFamily: "Arial, sans-serif",
            },
          },
          [
            React.createElement(
              "div",
              { style: { fontSize: 44, fontWeight: 800, marginBottom: 10 } },
              title
            ),
            React.createElement(
              "div",
              { style: { fontSize: 32, opacity: 0.9, marginBottom: 30 } },
              subtitle
            ),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 } },
              [
                React.createElement("div", { style: { opacity: 0.8 } }, "Участник"),
                React.createElement("div", { style: { opacity: 0.8, textAlign: "right" } }, "Очки"),
                ...standings.slice(0, 25).map((s, i) =>
                  React.createElement(
                    Fragment,
                    { key: `row-${i}-${s.participant_id}` },
                    [
                      React.createElement(
                        "div",
                        {
                          style: {
                            background: i % 2 === 0 ? "#111827" : "#0b1220",
                            padding: "10px 12px",
                            borderRadius: 8,
                          },
                        },
                        `${i + 1}. ${s.nickname}`
                      ),
                      React.createElement(
                        "div",
                        {
                          style: {
                            background: i % 2 === 0 ? "#111827" : "#0b1220",
                            padding: "10px 12px",
                            borderRadius: 8,
                            textAlign: "right",
                          },
                        },
                        s.points.toFixed(2)
                      ),
                    ]
                  )
                ),
              ]
            ),
          ]
        ),
        { width: 1200, height: 800 }
      )

      const pngBuffer = await image.arrayBuffer()
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      if (botToken) {
        const form = new FormData()
        form.append("chat_id", String(telegramUser.id))
        form.append("caption", `Старт тура ${tourId}. Участников: ${participantsCount}.`)
        form.append("photo", new Blob([pngBuffer], { type: "image/png" }), `tour_${tourId}_standings.png`)

        const tgResp = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
          method: "POST",
          body: form,
        })
        if (!tgResp.ok) {
          const errText = await tgResp.text().catch(() => "")
          console.error("Failed to send Telegram photo:", tgResp.status, errText)
        }
      } else {
        console.warn("TELEGRAM_BOT_TOKEN not configured; skipping screenshot send")
      }
    } catch (shotErr) {
      console.error("Screenshot generation/send failed:", shotErr)
    }

    // Auto-finish if played rounds exceed planned and snapshot leaderboard
    try {
      await finalizeTournamentIfExceeded(tournamentId)
    } catch (fErr) {
      console.error("Finalization after pairings failed:", fErr)
    }

    // Return enriched matches including nicknames
    const enriched = await listMatches(tourId)
    return NextResponse.json(enriched, { status: 201 })
  } catch (e) {
    console.error("Failed to generate pairings:", e)
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 })
  }
}