"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import ChessBackground from "@/components/ChessBackground"
import { useTelegramWebApp } from "@/hooks/useTelegramWebApp"
import { ArrowLeft, List, CalendarDays, Archive, ArchiveRestore, Trash2 } from "lucide-react"

type DbTournament = {
  id: number
  title: string
  format: string
  rounds: number
  archived: number
  created_at: string
}

export default function AdminAllTournamentsPage() {
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
        const res = await fetch("/api/tournaments")
        if (!res.ok) throw new Error("Не удалось загрузить турниры")
        const data = await res.json()
        setTournaments(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Неизвестная ошибка")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleArchiveToggle(t: DbTournament, makeArchived: boolean) {
    try {
      const res = await fetch(`/api/tournaments/${t.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(initData ? { Authorization: `Bearer ${initData}` } : {}),
        },
        body: JSON.stringify({ archived: makeArchived ? 1 : 0 }),
      })
      if (!res.ok) throw new Error("Не удалось обновить статус")
      setTournaments(prev => prev.map(it => it.id === t.id ? { ...it, archived: makeArchived ? 1 : 0 } : it))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка выполнения")
    }
  }

  async function handleDelete(t: DbTournament) {
    if (!confirm(`Удалить турнир «${t.title}»? Действие необратимо.`)) return
    try {
      const res = await fetch(`/api/tournaments/${t.id}`, {
        method: "DELETE",
        headers: initData ? { Authorization: `Bearer ${initData}` } : undefined,
      })
      if (!res.ok) throw new Error("Не удалось удалить турнир")
      setTournaments(prev => prev.filter(it => it.id !== t.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка выполнения")
    }
  }

  return (
    <ChessBackground>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
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

        {/* Title */}
        <div className="px-4">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white flex items-center gap-3">
            <List className="w-8 h-8 text-violet-400" /> Турниры
          </h1>
          <p className="mt-2 text-white/60">Список турниров с действиями управления</p>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-6">
          {loading && (
            <div className="text-white/80">Загрузка...</div>
          )}

          {error && (
            <div className="backdrop-blur-lg bg-red-500/10 border border-red-400/30 rounded-2xl p-4 text-red-200 mb-4">
              {error}
            </div>
          )}

          {!loading && tournaments.length === 0 && !error && (
            <div className="text-white/70">Турниров нет</div>
          )}

          {!loading && tournaments.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((t) => (
                <div key={t.id} className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-6 text-white max-w-full overflow-hidden">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div className="text-xl font-bold truncate min-w-0 pr-2">{t.title}</div>
                    {Number(t.archived) === 1 && (
                      <span className="flex-shrink-0 text-xs px-2 py-1 rounded bg-amber-500/20 border border-amber-500/40">Архив</span>
                    )}
                  </div>
                  <div className="text-white/70 text-sm">Формат: {t.format}, Раундов: {t.rounds}</div>
                  <div className="text-white/70 text-xs flex items-center gap-2 mt-1 min-w-0">
                    <CalendarDays className="w-3 h-3 text-white/60" />
                    <span className="truncate">{new Date(t.created_at).toLocaleString()}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => router.push(`/admin/tournaments/${t.id}/participants`)}
                      className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg w-full sm:w-auto"
                    >
                      Открыть
                    </button>
                    {Number(t.archived) === 0 ? (
                      <button
                        onClick={() => handleArchiveToggle(t, true)}
                        className="inline-flex items-center justify-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 px-3 py-2 rounded-lg border border-amber-400/30 w-full sm:w-auto"
                        title="Переместить в архив"
                      >
                        <Archive className="w-4 h-4" /> Архивировать
                      </button>
                    ) : (
                      <button
                        onClick={() => handleArchiveToggle(t, false)}
                        className="inline-flex items-center justify-center gap-2 bg-green-500/20 hover:bg-green-500/30 text-green-100 px-3 py-2 rounded-lg border border-green-400/30 w-full sm:w-auto"
                        title="Вернуть из архива"
                      >
                        <ArchiveRestore className="w-4 h-4" /> Разархивировать
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(t)}
                      className="inline-flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-100 px-3 py-2 rounded-lg border border-red-400/30 w-full sm:w-auto"
                      title="Удалить турнир"
                    >
                      <Trash2 className="w-4 h-4" /> Удалить
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