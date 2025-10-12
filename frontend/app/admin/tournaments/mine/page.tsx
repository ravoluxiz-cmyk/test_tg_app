"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import ChessBackground from "@/components/ChessBackground"
import { useTelegramWebApp } from "@/hooks/useTelegramWebApp"
import { ArrowLeft, ListOrdered } from "lucide-react"

type DbTournament = {
  id: number
  title: string
  format: string
  rounds: number
  archived: number
  created_at: string
}

export default function AdminMyTournamentsPage() {
  const router = useRouter()
  const { initData } = useTelegramWebApp()
  const [tournaments, setTournaments] = useState<DbTournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/tournaments/mine", {
          headers: initData ? { Authorization: `Bearer ${initData}` } : undefined,
        })
        if (!res.ok) throw new Error("Не удалось загрузить мои турниры")
        const data = await res.json()
        setTournaments(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Неизвестная ошибка")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [initData])

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
            Мои турниры
          </h1>
          <p className="mt-2 text-white/60">Турниры, которые вы создали и которые есть в базе</p>
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

          {!loading && tournaments.length === 0 && (
            <div className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <ListOrdered className="w-6 h-6 text-blue-400" />
                <span className="text-xl font-bold">Нет ваших турниров</span>
              </div>
              <div className="text-white/70">Создайте новый турнир в админ‑панели.</div>
            </div>
          )}

          {!loading && tournaments.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((t) => (
                <div key={t.id} className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-6 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xl font-bold">{t.title}</div>
                    {Number(t.archived) === 1 && (
                      <span className="text-xs px-2 py-1 rounded bg-amber-500/20 border border-amber-500/40">Архив</span>
                    )}
                  </div>
                  <div className="text-white/70 text-sm">Формат: {t.format}, Раундов: {t.rounds}</div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => router.push(`/admin/tournaments/${t.id}/participants`)}
                      className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg"
                    >
                      Открыть
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ChessBackground>
  )
}