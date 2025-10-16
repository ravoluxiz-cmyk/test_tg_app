"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import ChessBackground from "@/components/ChessBackground"
import { ArrowLeft, Archive, ListOrdered } from "lucide-react"

type DbTournament = {
  id: number
  title: string
  archived: number
  created_at?: string
}

export default function AdminArchivePage() {
  const router = useRouter()
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
        setTournaments(data.filter((t: DbTournament) => Number(t.archived) === 1))
      } catch (e) {
        setError(e instanceof Error ? e.message : "Неизвестная ошибка")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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
            Архив турниров
          </h1>
          <p className="mt-2 text-white/60">Все завершённые и архивированные турниры</p>
        </div>

        <div className="flex-1 px-4 py-6">
          {loading && <div className="text-white/80">Загрузка...</div>}
          {error && (
            <div className="backdrop-blur-lg bg-red-500/10 border border-red-400/30 rounded-2xl p-4 text-red-200 mb-4">
              {error}
            </div>
          )}

          {!loading && tournaments.length === 0 && (
            <div className="text-white/70">Архив пуст</div>
          )}

          {!loading && tournaments.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((t) => (
                <div
                  key={t.id}
                  className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-6 text-white"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Archive className="w-5 h-5 text-amber-400" />
                    <div className="text-xl font-bold">{t.title}</div>
                  </div>
                  <div className="text-white/60">ID: {t.id}</div>
                  {t.created_at && (
                    <div className="text-white/60">Создан: {new Date(t.created_at).toLocaleString("ru-RU")}</div>
                  )}
                  <div className="mt-4">
                    <button
                      onClick={() => router.push(`/admin/tournaments/${t.id}/results`)}
                      className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg"
                      title="Перейти к таблице результатов"
                    >
                      <ListOrdered className="w-4 h-4" /> К таблице результатов
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