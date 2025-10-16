"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import ChessBackground from "@/components/ChessBackground"
import { useTelegramWebApp } from "@/hooks/useTelegramWebApp"
import { Shield, PlusCircle, ListOrdered, Trash2, Archive, ArrowLeft, List } from "lucide-react"

export default function AdminMainMenuPage() {
  const router = useRouter()
  const { initData } = useTelegramWebApp()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        if (!initData) {
          setAuthorized(false)
          setError("Откройте приложение через Telegram")
          return
        }
        const resp = await fetch("/api/admin/check", {
          headers: { Authorization: `Bearer ${initData}` },
        })
        setAuthorized(resp.ok)
        if (!resp.ok) setError("Доступ запрещён")
      } catch (e) {
        console.error("Admin check failed", e)
        setAuthorized(false)
        setError("Ошибка проверки доступа")
      }
    }
    checkAdmin()
  }, [initData])

  return (
    <ChessBackground>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 backdrop-blur-md bg-black/20 border-b border-white/10">
          <div className="flex items-center justify-between px-3 sm:px-4 py-3 max-w-5xl mx-auto">
            <button
              className="flex items-center gap-2 text-white/80 hover:text-white"
              onClick={() => router.push("/")}
              title="Вернуться в главное меню"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold">Главное меню</span>
            </button>

            <div className="flex items-center gap-2 text-white/80">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold">Админ‑панель</span>
            </div>
          </div>
        </header>

        {/* Title */}
        <div className="px-3 sm:px-4">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white">
              Выберите действие
            </h1>
            <p className="mt-2 text-white/60">Быстрые действия для управления турнирами</p>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 px-3 sm:px-4 py-4 sm:py-6">
          <div className="max-w-5xl mx-auto">
          {authorized === false && (
            <div className="backdrop-blur-lg bg-red-500/10 border border-red-400/30 rounded-2xl p-4 sm:p-6 text-white">
              <div className="font-bold mb-1">Нет доступа</div>
              <div className="text-white/80 mb-4">{error || "Проверка доступа не пройдена"}</div>
              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4" /> На главную
              </button>
            </div>
          )}

          {authorized && (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {/* Create Tournament */}
              <button
                onClick={() => router.push("/admin/tournaments/new")}
                className="w-full backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 text-left hover:bg-white/10 transition-all"
              >
                <div className="flex items-center gap-3 text-white mb-2">
                  <PlusCircle className="w-6 h-6 text-emerald-400" />
                  <span className="text-lg sm:text-xl font-bold">Создать новый турнир</span>
                </div>
                <div className="text-white/70">Открыть форму создания турнира</div>
              </button>

              {/* Unified Tournaments */}
              <button
                onClick={() => router.push("/admin/tournaments")}
                className="w-full backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 text-left hover:bg-white/10 transition-all"
                title="Единый список турниров с переключателем «Все/Мои»"
              >
                <div className="flex items-center gap-3 text-white mb-2">
                  <List className="w-6 h-6 text-violet-400" />
                  <span className="text-lg sm:text-xl font-bold">Турниры</span>
                </div>
                <div className="text-white/70">Откройте список и переключайтесь между «Все» и «Мои»</div>
              </button>

              {/* Delete Tournament */}
              <button
                onClick={() => router.push("/admin/tournaments/delete")}
                className="w-full backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 text-left hover:bg-white/10 transition-all"
              >
                <div className="flex items-center gap-3 text-white mb-2">
                  <Trash2 className="w-6 h-6 text-red-400" />
                  <span className="text-lg sm:text-xl font-bold">Удалить выбранный турнир</span>
                </div>
                <div className="text-white/70">Выберите турнир и удалите его</div>
              </button>

              {/* Archive */}
              <button
                onClick={() => router.push("/admin/tournaments/archive")}
                className="w-full backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 text-left hover:bg-white/10 transition-all"
              >
                <div className="flex items-center gap-3 text-white mb-2">
                  <Archive className="w-6 h-6 text-amber-400" />
                  <span className="text-lg sm:text-xl font-bold">Архив завершённых турниров</span>
                </div>
                <div className="text-white/70">Просмотр архивных турниров</div>
              </button>
            </div>
          )}
          </div>
        </main>
      </div>
    </ChessBackground>
  )
}