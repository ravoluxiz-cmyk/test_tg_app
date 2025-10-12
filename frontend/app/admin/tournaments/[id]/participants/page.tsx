"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import ChessBackground from "@/components/ChessBackground"
import { useTelegramWebApp } from "@/hooks/useTelegramWebApp"

type User = {
  id: number
  telegram_id: string
  username: string | null
  first_name: string | null
  last_name: string | null
}

type Participant = {
  id: number
  tournament_id: number
  user_id: number
  nickname: string
  created_at: string
}

export default function TournamentParticipantsPage() {
  const params = useParams<{ id: string }>()
  const tournamentId = Number(params.id)
  const router = useRouter()
  const { initData } = useTelegramWebApp()

  const [users, setUsers] = useState<User[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [nickname, setNickname] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [usersRes, partsRes] = await Promise.all([
          fetch("/api/users"),
          fetch(`/api/tournaments/${tournamentId}/participants`),
        ])
        if (!usersRes.ok) throw new Error("Не удалось загрузить пользователей")
        if (!partsRes.ok) throw new Error("Не удалось загрузить участников")
        const usersData = await usersRes.json()
        const partsData = await partsRes.json()
        setUsers(usersData)
        setParticipants(partsData)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Неизвестная ошибка")
      } finally {
        setLoading(false)
      }
    }
    if (Number.isFinite(tournamentId)) fetchAll()
  }, [tournamentId])

  const addParticipant = async () => {
    if (!selectedUserId) return setError("Выберите пользователя")
    if (!nickname.trim()) return setError("Введите никнейм")
    setAdding(true)
    setError(null)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedUserId, nickname: nickname.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Не удалось добавить участника")
      }
      const created = await res.json()
      setParticipants((prev) => [...prev, created])
      setNickname("")
      setSelectedUserId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка")
    } finally {
      setAdding(false)
    }
  }

  const startTour = async () => {
    if (!Number.isFinite(tournamentId)) return
    if (participants.length < 2) return setError("Добавьте минимум двух участников")
    setStarting(true)
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
        throw new Error(err.error || "Не удалось создать тур")
      }
      const newTour = await createRes.json()
      // Попытаться сразу сгенерировать пары и отправить скриншот в Telegram
      const pairRes = await fetch(`/api/tournaments/${tournamentId}/tours/${newTour.id}/pairings`, {
        method: "POST",
        headers: {
          ...(initData ? { Authorization: `Bearer ${initData}` } : {}),
        },
      })
      if (!pairRes.ok) {
        const errText = await pairRes.text().catch(() => "")
        console.warn("Не удалось сгенерировать пары:", pairRes.status, errText)
      }
      router.push(`/admin/tournaments/${tournamentId}/tours/${newTour.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка")
    } finally {
      setStarting(false)
    }
  }

  const backToCreate = () => {
    router.push("/admin/tournaments/new")
  }

  return (
    <ChessBackground>
      <div className="min-h-screen px-4 py-10">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-black text-white mb-6">Добавить участников</h1>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-white rounded-lg p-4 mb-6">{error}</div>
          )}

          {/* Форма добавления участника */}
          <div className="space-y-4 bg-white/5 p-4 rounded-lg">
            <div>
              <label className="text-white block mb-2">Выбор пользователя</label>
              <select
                value={selectedUserId ?? ""}
                onChange={(e) => setSelectedUserId(Number(e.target.value))}
                className="w-full bg-white/10 text-white p-3 rounded-lg outline-none"
              >
                <option value="" disabled>
                  {loading ? "Загрузка..." : "Выберите пользователя"}
                </option>
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-slate-800 text-white">
                    @{u.username || u.telegram_id} — {u.first_name ?? ""} {u.last_name ?? ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-white block mb-2">Никнейм в турнире</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full bg-white/10 text-white p-3 rounded-lg outline-none"
                placeholder="Уникальный никнейм"
              />
            </div>

            <button
              onClick={addParticipant}
              disabled={adding}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-500 disabled:opacity-60"
            >
              {adding ? "Добавление..." : "Добавить участника"}
            </button>
          </div>

          {/* Список участников */}
          <div className="mt-8">
            <h2 className="text-white text-xl font-bold mb-3">Участники</h2>
            <div className="bg-white/5 rounded-lg overflow-hidden">
              <table className="min-w-full text-white">
                <thead>
                  <tr className="bg-white/10">
                    <th className="text-left p-3">Ник</th>
                    <th className="text-left p-3">Пользователь</th>
                    <th className="text-left p-3">Добавлен</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => {
                    const user = users.find((u) => u.id === p.user_id)
                    return (
                      <tr key={p.id} className="border-t border-white/10">
                        <td className="p-3">{p.nickname}</td>
                        <td className="p-3">@{user?.username || user?.telegram_id}</td>
                        <td className="p-3">{new Date(p.created_at).toLocaleString()}</td>
                      </tr>
                    )
                  })}
                  {participants.length === 0 && !loading && (
                    <tr>
                      <td colSpan={3} className="p-3 text-white/70">
                        Пока нет участников
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Панель действий после ввода участников */}
            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                onClick={backToCreate}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold"
              >
                Назад к созданию турнира
              </button>
              <button
                onClick={startTour}
                disabled={starting || participants.length < 2}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-60"
                title={participants.length < 2 ? "Добавьте минимум двух участников" : "Начать тур"}
              >
                {starting ? "Запуск тура..." : "Начать тур"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ChessBackground>
  )
}