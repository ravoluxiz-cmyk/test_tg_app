"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import ChessBackground from "@/components/ChessBackground"
import ResultSelect from "@/components/ui/result-select"
import { useTelegramWebApp } from "@/hooks/useTelegramWebApp"
import { ArrowLeft } from "lucide-react"

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
  const router = useRouter()
  const { initData } = useTelegramWebApp()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pairing, setPairing] = useState(false)
  const [startingNext, setStartingNext] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [saving, setSaving] = useState<number | null>(null)
  const [roundNumber, setRoundNumber] = useState<number | null>(null)
  const [tournamentMeta, setTournamentMeta] = useState<{ rounds: number; archived: number } | null>(null)
  const [tours, setTours] = useState<Array<{ id: number; number: number; status: string; created_at: string }>>([])

  const loadMatches = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/tours/${tourId}/matches`)
      if (!res.ok) throw new Error("Не удалось загрузить матчи")
      const data = await res.json()
      setMatches(Array.isArray(data) ? data : [])
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

  const loadRoundNumber = useCallback(async () => {
    try {
      const [toursRes, tournamentRes] = await Promise.all([
        fetch(`/api/tournaments/${tournamentId}/tours`),
        fetch(`/api/tournaments/${tournamentId}`),
      ])
      if (!toursRes.ok) return
      const rounds = await toursRes.json()
      if (Array.isArray(rounds)) {
        setTours(rounds)
        const current = rounds.find((r: any) => r.id === tourId)
        if (current && typeof current.number === 'number') {
          setRoundNumber(current.number)
        }
      }
      if (tournamentRes.ok) {
        const t = await tournamentRes.json()
        setTournamentMeta(t && typeof t === 'object' ? { rounds: Number(t.rounds || 0), archived: Number(t.archived || 0) } : null)
      }
    } catch (_) {}
  }, [tournamentId, tourId])

  useEffect(() => {
    if (Number.isFinite(tournamentId) && Number.isFinite(tourId)) {
      loadRoundNumber()
    }
  }, [tournamentId, tourId, loadRoundNumber])

  const generatePairings = async () => {
    setPairing(true)
    setError(null)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/tours/${tourId}/pairings`, {
        method: "POST",
        headers: {
          ...(initData ? { Authorization: `Bearer ${initData}` } : {}),
        },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Не удалось сгенерировать пары")
      }
      const data = await res.json()
      setMatches(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка")
    } finally {
      setPairing(false)
    }
  }

  const startNextTourAndGenerate = async () => {
    const planned = tournamentMeta?.rounds ?? 0
    const archived = tournamentMeta?.archived ?? 0
    const nextNum = (roundNumber ?? 0) + 1
    if (archived === 1) {
      setError("Турнир завершён, запуск новых туров недоступен")
      return
    }
    if (planned > 0 && nextNum > planned) {
      setError(`Достигнут лимит туров (${planned}) — следующий тур №${nextNum} недоступен`)
      return
    }
    setStartingNext(true)
    setError(null)
    try {
      const createRes = await fetch(`/api/tournaments/${tournamentId}/tours`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(initData ? { Authorization: `Bearer ${initData}` } : {}),
        },
        body: JSON.stringify({}),
      })
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}))
        throw new Error(err.error || "Не удалось создать следующий тур")
      }
      const newTour = await createRes.json()

      const pairRes = await fetch(`/api/tournaments/${tournamentId}/tours/${newTour.id}/pairings`, {
        method: "POST",
        headers: {
          ...(initData ? { Authorization: `Bearer ${initData}` } : {}),
        },
      })
      if (!pairRes.ok) {
        const err = await pairRes.json().catch(() => ({}))
        throw new Error(err.error || "Не удалось сгенерировать пары для следующего тура")
      }

      router.push(`/admin/tournaments/${tournamentId}/tours/${newTour.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка")
    } finally {
      setStartingNext(false)
    }
  }

  const updateResult = async (matchId: number, result: string) => {
    setSaving(matchId)
    setError(null)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/tours/${tourId}/matches`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(initData ? { Authorization: `Bearer ${initData}` } : {}),
        },
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

  // Результаты выбираются через удобный выпадающий список ResultSelect

  const finalizeAndGoToResults = async () => {
    if (!Number.isFinite(tournamentId)) return
    setFinalizing(true)
    setError(null)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/finalize`, {
        method: "POST",
        headers: {
          ...(initData ? { Authorization: `Bearer ${initData}` } : {}),
        },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Не удалось завершить турнир")
      }
      router.push(`/admin/tournaments/${tournamentId}/results`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка")
    } finally {
      setFinalizing(false)
    }
  }

  return (
    <ChessBackground>
      <div className="min-h-screen px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-3">
            <button
              className="flex items-center gap-2 text-white/80 hover:text-white"
              onClick={() => router.push(`/admin/tournaments/${tournamentId}/participants`)}
              title="Назад к добавлению участников"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold">Назад</span>
            </button>
          </div>
          <h1 className="text-4xl font-black text-white mb-6">Управление туром №{roundNumber ?? '…'}</h1>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-white rounded-lg p-4 mb-6">{error}</div>
          )}

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
            <button
              onClick={generatePairings}
              disabled={pairing}
              className="w-full sm:w-auto bg-blue-600 text-white py-2 px-4 rounded-lg font-bold hover:bg-blue-500 disabled:opacity-60"
            >
              {pairing ? "Генерация..." : "Сгенерировать пары"}
            </button>
            <button
              onClick={loadMatches}
              className="w-full sm:w-auto bg-white/10 text-white py-2 px-4 rounded-lg hover:bg-white/20"
            >
              Обновить
            </button>
            <button
              onClick={startNextTourAndGenerate}
              disabled={
                startingNext ||
                (tournamentMeta?.archived === 1) ||
                (((tournamentMeta?.rounds ?? 0) > 0) && ((roundNumber ?? 0) + 1 > (tournamentMeta?.rounds ?? 0)))
              }
              className="w-full sm:w-auto bg-emerald-600 text-white py-2 px-4 rounded-lg font-bold hover:bg-emerald-500 disabled:opacity-60"
            >
              {startingNext ? "Запуск следующего тура..." : "Начать следующий тур и сгенерировать пары"}
            </button>
            {Number.isFinite(tournamentId) && (tournamentMeta?.archived !== 1) && ((roundNumber ?? 0) === (tournamentMeta?.rounds ?? 0)) && (
              <button
                onClick={finalizeAndGoToResults}
                disabled={finalizing}
                className="w-full sm:w-auto bg-purple-600 text-white py-2 px-4 rounded-lg font-bold hover:bg-purple-500 disabled:opacity-60"
                title="Завершить турнир и перейти к таблице результатов"
              >
                {finalizing ? "Завершение турнира..." : "Завершить турнир и перейти к таблице результатов"}
              </button>
            )}
            {tournamentMeta?.archived === 1 && (
              <div className="text-white/70">Турнир завершён</div>
            )}
            {(tournamentMeta?.rounds ?? 0) > 0 && ((roundNumber ?? 0) + 1 > (tournamentMeta?.rounds ?? 0)) && (
              <div className="text-white/70">Достигнут лимит туров ({tournamentMeta?.rounds ?? 0})</div>
            )}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {matches.map((m) => (
              <div key={m.id} className="bg-white/5 border border-white/10 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-bold">Доска: {m.board_no ?? "–"}</div>
                  <div className="text-sm text-white/70">Очки: {m.score_white} : {m.score_black}</div>
                </div>
                <div className="mt-2">
                  <div className="text-white/70 text-xs">Белые</div>
                  <div className="text-white">{m.white_nickname ?? "–"}</div>
                </div>
                <div className="mt-2">
                  <div className="text-white/70 text-xs">Чёрные</div>
                  <div className="text-white">{m.black_nickname ?? "–"}</div>
                </div>
                <div className="mt-3">
                  <label className="text-white/70 text-xs block mb-1">Результат</label>
                  <ResultSelect
                    value={m.result}
                    onChange={(val) => updateResult(m.id, val)}
                    disabled={saving === m.id || !m.white_participant_id || !m.black_participant_id}
                    allowBye={m.result === 'bye'}
                    className="w-full"
                  />
                </div>
              </div>
            ))}
            {!loading && matches.length === 0 && (
              <div className="text-white/70">Пары ещё не сгенерированы</div>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white/5 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
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
                        <ResultSelect
                          value={m.result}
                          onChange={(val) => updateResult(m.id, val)}
                          disabled={saving === m.id || !m.white_participant_id || !m.black_participant_id}
                          allowBye={m.result === 'bye'}
                        />
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
      </div>
    </ChessBackground>
  )
}