"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { HoverButton } from "@/components/ui/hover-button"
import ChessBackground from "@/components/ChessBackground"
import { useTelegramWebApp } from "@/hooks/useTelegramWebApp"

const ResultOptions = [
  { value: "white", label: "White wins" },
  { value: "black", label: "Black wins" },
  { value: "draw", label: "Draw" },
  { value: "bye", label: "Bye (auto win)" },
  { value: "forfeit_white", label: "Forfeit (white)" },
  { value: "forfeit_black", label: "Forfeit (black)" },
]

export default function MatchSubmitPage() {
  const router = useRouter()
  const { initData, user } = useTelegramWebApp()
  const [matchId, setMatchId] = useState<number | "">("")
  const [result, setResult] = useState<string>(ResultOptions[0].value)
  const [status, setStatus] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("")

    if (!initData) {
      setStatus("Authorization missing. Please open via Telegram or use dev mock.")
      return
    }

    if (typeof matchId !== "number" || !Number.isFinite(matchId)) {
      setStatus("Please enter a valid matchId.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/match/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${initData}`,
        },
        body: JSON.stringify({ matchId, result }),
      })

      const data = await res.json()
      if (!res.ok) {
        setStatus(data?.error || "Failed to submit match result")
      } else {
        setStatus("Match result submitted successfully.")
      }
    } catch (err) {
      console.error(err)
      setStatus("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ChessBackground>
      <div className="relative z-10 max-w-xl mx-auto p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Submit Match Result</h1>
        <p className="mb-4 text-sm opacity-80">
          Use this simple dev page to submit a match result. In production, results are updated from tour management.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 bg-black/30 p-4 rounded-lg border border-white/10">
          <div>
            <label className="block text-sm mb-1">Match ID</label>
            <input
              type="number"
              value={matchId}
              onChange={(e) => setMatchId(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full px-3 py-2 rounded bg-black/50 border border-white/20 focus:outline-none"
              placeholder="e.g. 123"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Result</label>
            <select
              value={result}
              onChange={(e) => setResult(e.target.value)}
              className="w-full px-3 py-2 rounded bg-black/50 border border-white/20 focus:outline-none"
            >
              {ResultOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <HoverButton type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit"}
            </HoverButton>
            <button
              type="button"
              className="px-3 py-2 rounded bg-white/10 border border-white/20 hover:bg-white/20"
              onClick={() => router.push("/")}
            >
              Home
            </button>
          </div>

          {user ? (
            <p className="text-xs opacity-70">
              Authorized as: {user.first_name} {user.last_name || ""} (@{user.username || "unknown"})
            </p>
          ) : (
            <p className="text-xs opacity-70">Not authorized via Telegram.</p>
          )}

          {status && (
            <p className="mt-2 text-sm">{status}</p>
          )}
        </form>
      </div>
    </ChessBackground>
  )
}