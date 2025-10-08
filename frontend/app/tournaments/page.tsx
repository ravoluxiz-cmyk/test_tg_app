"use client"

import { useEffect, useState } from "react"
import ChessBackground from "@/components/ChessBackground"
import { BackButton } from "@/components/ui/back-button"
import { TournamentCard, Tournament } from "@/components/tournaments/tournament-card"
import { motion } from "framer-motion"

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTournaments() {
      try {
        const response = await fetch("/api/tournaments")
        if (!response.ok) throw new Error("Failed to fetch tournaments")
        const data = await response.json()
        setTournaments(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchTournaments()
  }, [])

  return (
    <ChessBackground>
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="min-h-screen py-12 flex flex-col gap-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-6"
          >
            <BackButton />

            <div className="text-center">
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white mb-4 uppercase tracking-tight">
                Расписание турниров
              </h1>
              <p className="text-lg text-white/60 max-w-2xl mx-auto">
                Предстоящие шахматные турниры и события
              </p>
            </div>
          </motion.div>

          {/* Content */}
          <div className="flex-1">
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="text-white/60 text-lg">Загрузка турниров...</div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center py-20">
                <div className="text-red-400 text-lg">Ошибка: {error}</div>
              </div>
            )}

            {!loading && !error && tournaments.length === 0 && (
              <div className="flex items-center justify-center py-20">
                <div className="text-white/60 text-lg">Нет предстоящих турниров</div>
              </div>
            )}

            {!loading && !error && tournaments.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                {tournaments.map((tournament, index) => (
                  <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ChessBackground>
  )
}
