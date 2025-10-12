"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import ChessBackground from "@/components/ChessBackground"

type Match = {
  id: number
  round_id: number
  white_participant_id: number | null
  black_participant_id: number | null
  board_no?: number | null
  result: string
  score_white: number
  score_black: number
  white_nickname?: string | null
  black_nickname?: string | null
}

export default function TourManagePage() {
  const params = useParams<{ id: string; tourId: string }>()
  const tournamentId = Number(params.id)
  const tourId = Number(params.tourId)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pairing, setPairing] = useState(false)
  const [saving, setSaving] = useState<number | null>(null)

  const loadMatches = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/tours/${tourId}/matches`)
      if (!res.ok) throw new Error("Не удалось загрузить матчи")
      const data = await res.json()
      setMatches(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка")
    } finally {
      setLoading(false)
    }
  }, [tournamentId, tourId])

  useEffect(() => {
    if (Number.isFinite(tournamentId) && Number.isFinite(tourId)) {
      loadMatches()
    }
  }, [tournamentId, tourId, loadMatches])

  const generatePairings = async () => {
    setPairing(true)
    setError(null)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/tours/${tourId}/pairings`, { method: "POST" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Не удалось сгенерировать пары")
      }
      const data = await res.json()
      setMatches(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка")
    } finally {
      setPairing(false)
    }
  }

  const updateResult = async (matchId: number, result: string) => {
    setSaving(matchId)
    setError(null)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/tours/${tourId}/matches`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, result }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Не удалось сохранить результат")
      }
      const updated = await res.json()
      setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, ...updated } : m)))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка")
    } finally {
      setSaving(null)
    }
  }

  const resultOptions = [
    { value: "not_played", label: "Не сыграно" },
    { value: "white", label: "Победа белых" },
    { value: "black", label: "Победа чёрных" },
    { value: "draw", label: "Ничья" },
    { value: "bye", label: "Бай" },
  ]

  return (
    <ChessBackground>
      <div className="min-h-screen px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-black text_white mb-6">Управление туром #{tourId}</h1>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-white rounded-lg p-4 mb-6">{error}</div>
          )}

          <div className="flex gap-3 mb-6">
            <button
              onClick={generatePairings}
              disabled={pairing}
              className="bg-blue-600 text-white py-2 px-4 rounded-lg font-bold hover:bg-blue-500 disabled:opacity-60"
            >
              {pairing ? "Генерация..." : "Сгенерировать пары"}
            </button>
            <button
              onClick={loadMatches}
              className="bg-white/10 text-white py-2 px-4 rounded-lg hover:bg-white/20"
            >
              Обновить
            </button>
          </div>

          <div className="bg-white/5 rounded-lg overflow-hidden">
            <table className="min-w-full text-white">
              <thead>
                <tr className="bg-white/10">
                  <th className="text-left p-3">Доска</th>
                  <th className="text-left p-3">Белые</th>
                  <th className="text-left p-3">Чёрные</th>
                  <th className="text-left p-3">Результат</th>
                  <th className="text-left p-3">Очки</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <tr key={m.id} className="border-t border-white/10">
                    <td className="p-3">{m.board_no ?? "–"}</td>
                    <td className="p-3">{m.white_nickname ?? "–"}</td>
                    <td className="p-3">{m.black_nickname ?? "–"}</td>
                    <td className="p-3">
                      <select
                        value={m.result}
                        onChange={(e) => updateResult(m.id, e.target.value)}
                        disabled={saving === m.id}
                        className="bg-white/10 text-white p-2 rounded"
                      >
                        {resultOptions.map((o) => (
                          <option key={o.value} value={o.value} className="bg-slate-800 text-white">
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">{m.score_white} : {m.score_black}</td>
                  </tr>
                ))}
                {!loading && matches.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-3 text-white/70">Пары ещё не сгенерированы</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ChessBackground>
  )
}