"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import ChessBackground from "@/components/ChessBackground"
import { useTelegramWebApp } from "@/hooks/useTelegramWebApp"
import { Trash2, ArrowLeft } from "lucide-react"

type DbTournament = {
  id: number
  title: string
  archived: number
  created_at?: string
}

export default function AdminDeleteTournamentPage() {
  const router = useRouter()
  const { initData } = useTelegramWebApp()
  const [tournaments, setTournaments] = useState<DbTournament[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/tournaments")
        if (!res.ok) throw new Error("Не удалось загрузить турниры")
        const data = await res.json()
        setTournaments(data)
        if (data.length > 0) setSelectedId(data[0].id)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Неизвестная ошибка")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleDelete = async () => {
    if (!selectedId) return setError("Выберите турнир")
    if (!initData) return setError("Откройте приложение через Telegram")
    if (!confirm("Удалить выбранный турнир? Это действие необратимо.")) return
    setDeleting(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/tournaments/${selectedId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${initData}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Не удалось удалить турнир")
      }
      setMessage("Турнир удалён")
      setTournaments(prev => prev.filter(t => t.id !== selectedId))
      setSelectedId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <ChessBackground>
      <div className="min-h-screen flex flex-col">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            className="flex items-center gap-2 text-white/80 hover:text-white"
            onClick={() => router.push("/admin")}
            title="Назад к админ‑меню"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">К админ‑меню</span>
          </button>
        </div>

        <div className="px-4">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            Удаление турнира
          </h1>
          <p className="mt-2 text-white/60">Выберите турнир для удаления</p>
        </div>

        <div className="flex-1 px-4 py-6">
          {loading && (
            <div className="text-white/80">Загрузка...</div>
          )}
          {error && (
            <div className="backdrop-blur-lg bg-red-500/10 border border-red-400/30 rounded-2xl p-4 text-red-200 mb-4">
              {error}
            </div>
          )}
          {message && (
            <div className="backdrop-blur-lg bg-emerald-500/10 border border-emerald-400/30 rounded-2xl p-4 text-emerald-200 mb-4">
              {message}
            </div>
          )}

          {!loading && tournaments.length === 0 && (
            <div className="text-white/70">Турниров нет</div>
          )}

          {!loading && tournaments.length > 0 && (
            <div className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-6">
              <label className="block text-white mb-2">Турнир</label>
              <select
                className="w-full bg-black/40 text-white border border-white/20 rounded-lg px-3 py-2"
                value={selectedId ?? ""}
                onChange={(e) => setSelectedId(Number(e.target.value) || null)}
              >
                <option value="" disabled>— выберите турнир —</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} {t.archived ? "(архив)" : ""}
                  </option>
                ))}
              </select>

              <button
                onClick={handleDelete}
                disabled={deleting || !selectedId}
                className="mt-4 inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg disabled:opacity-60"
              >
                <Trash2 className="w-5 h-5" /> Удалить турнир
              </button>
            </div>
          )}
        </div>
      </div>
    </ChessBackground>
  )
}