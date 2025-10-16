"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import ChessBackground from "@/components/ChessBackground"

type Row = { participant_id: number; nickname: string; points: number; rank: number }

export default function TournamentResultsPage() {
  const params = useParams<{ id: string }>()
  const tournamentId = Number(params.id)
  const router = useRouter()
  const [leaderboard, setLeaderboard] = useState<Row[]>([])
  const [title, setTitle] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [lbRes, tRes] = await Promise.all([
          fetch(`/api/tournaments/${tournamentId}/leaderboard`),
          fetch(`/api/tournaments/${tournamentId}`),
        ])
        if (!lbRes.ok) throw new Error("Не удалось загрузить таблицу результатов")
        const lb = await lbRes.json()
        setLeaderboard(Array.isArray(lb) ? lb : [])
        if (tRes.ok) {
          const t = await tRes.json()
          setTitle(t?.title || "")
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Неизвестная ошибка")
      } finally {
        setLoading(false)
      }
    }
    if (Number.isFinite(tournamentId)) load()
  }, [tournamentId])

  return (
    <ChessBackground>
      <div className="min-h-screen px-4 py-10">
        <div className="max-w-4xl mx-auto text-white">
          <div className="mb-3">
            <button
              className="text-white/80 hover:text-white"
              onClick={() => router.push(`/admin`)}
              title="Назад к админ‑меню"
            >
              ← Назад
            </button>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-2">Итоги турнира</h1>
          {title && <div className="text-white/70 mb-6">{title}</div>}

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">{error}</div>
          )}
          {loading && (
            <div className="text-white/80">Загрузка…</div>
          )}

          {!loading && leaderboard.length === 0 && !error && (
            <div className="text-white/80">Таблица результатов пуста</div>
          )}

          {!loading && leaderboard.length > 0 && (
            <div className="overflow-x-auto bg-white/5 border border-white/10 rounded-lg">
              <table className="min-w-full text-left">
                <thead className="text-white/70">
                  <tr>
                    <th className="px-4 py-3">Место</th>
                    <th className="px-4 py-3">Участник</th>
                    <th className="px-4 py-3">Очки</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row) => (
                    <tr key={row.participant_id} className="border-t border-white/10">
                      <td className="px-4 py-3 font-bold">{row.rank}</td>
                      <td className="px-4 py-3">{row.nickname}</td>
                      <td className="px-4 py-3">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ChessBackground>
  )
}