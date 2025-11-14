"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import ChessBackground from "@/components/ChessBackground"
import { BackButton } from "@/components/ui/back-button"
import { TrendingUp, TrendingDown, Minus, Filter } from "lucide-react"
import { motion } from "framer-motion"

interface RatingLeaderboardEntry {
  user_id: number
  username: string
  first_name: string
  last_name: string
  rating: number
  rd: number
  volatility: number
  games_played: number
  win_rate: number
  recent_change: number
  rank: number
  previous_rank?: number
}

interface LeaderboardFilters {
  time_control: 'all' | 'classical' | 'rapid' | 'blitz'
  period: 'all' | 'month' | 'week' | 'day'
}

export default function RatingLeaderboardPage() {
  const router = useRouter()
  const [leaderboard, setLeaderboard] = useState<RatingLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<LeaderboardFilters>({
    time_control: 'all',
    period: 'all'
  })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const params = new URLSearchParams({
          time_control: filters.time_control,
          period: filters.period,
          limit: '100'
        })

        const response = await fetch(`/api/rating/leaderboard?${params}`)
        if (!response.ok) throw new Error("Failed to fetch leaderboard")
        const data = await response.json()
        setLeaderboard(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [filters])

  const getRankChangeIcon = (current: number, previous?: number) => {
    if (!previous || current === previous) return <Minus className="w-4 h-4 text-gray-400" />
    if (current < previous) return <TrendingUp className="w-4 h-4 text-green-500" />
    return <TrendingDown className="w-4 h-4 text-red-500" />
  }

  const getRankChangeText = (current: number, previous?: number) => {
    if (!previous || current === previous) return ""
    const change = Math.abs(current - previous)
    return current < previous ? `+${change}` : `-${change}`
  }

  return (
    <ChessBackground badge="" title1="" title2="" description="">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="min-h-screen py-12 flex flex-col gap-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-6"
          >
            <div className="flex justify-between items-center">
              <BackButton />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="bg-white/10 backdrop-blur-md text-white p-3 rounded-lg hover:bg-white/20 transition-colors"
              >
                <Filter className="w-6 h-6" />
              </button>
            </div>

            <div className="text-center">
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white mb-4 uppercase tracking-tight">
                Рейтинг
              </h1>
              <p className="text-lg text-white/60 max-w-2xl mx-auto">
                Лидерборд шахматистов по рейтингу Glicko-2
              </p>
            </div>

            {/* Filters */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white/10 backdrop-blur-md rounded-xl p-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white font-semibold mb-2">Контроль времени</label>
                    <select
                      value={filters.time_control}
                      onChange={(e) => setFilters(prev => ({ ...prev, time_control: e.target.value as 'all' | 'classical' | 'rapid' | 'blitz' }))}
                      className="w-full bg-white/10 text-white rounded-lg p-3 border border-white/20 focus:border-white/40 focus:outline-none"
                    >
                      <option value="all">Все</option>
                      <option value="classical">Классика</option>
                      <option value="rapid">Рапид</option>
                      <option value="blitz">Блиц</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white font-semibold mb-2">Период</label>
                    <select
                      value={filters.period}
                      onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value as 'all' | 'month' | 'week' }))}
                      className="w-full bg-white/10 text-white rounded-lg p-3 border border-white/20 focus:border-white/40 focus:outline-none"
                    >
                      <option value="all">Все время</option>
                      <option value="month">За месяц</option>
                      <option value="week">За неделю</option>
                      <option value="day">За день</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Content */}
          <div className="flex-1">
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="text-white/60 text-lg">Загрузка рейтинга...</div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center py-20">
                <div className="text-red-400 text-lg">Ошибка: {error}</div>
              </div>
            )}

            {!loading && !error && leaderboard.length === 0 && (
              <div className="flex items-center justify-center py-20">
                <div className="text-white/60 text-lg">Нет данных о рейтинге</div>
              </div>
            )}

            {!loading && !error && leaderboard.length > 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl overflow-hidden">
                {/* Header */}
                <div className="bg-white/5 px-6 py-4 border-b border-white/10">
                  <div className="grid grid-cols-12 gap-4 text-white font-semibold">
                    <div className="col-span-1">#</div>
                    <div className="col-span-4">Игрок</div>
                    <div className="col-span-2 text-center">Рейтинг</div>
                    <div className="col-span-2 text-center">Игры</div>
                    <div className="col-span-2 text-center">Победы</div>
                    <div className="col-span-1 text-center">±</div>
                  </div>
                </div>

                {/* Leaderboard Entries */}
                <div className="divide-y divide-white/10">
                  {leaderboard.map((entry, index) => (
                    <motion.div
                      key={entry.user_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="px-6 py-4 hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => router.push(`/profile/${entry.username}`)}
                    >
                      <div className="grid grid-cols-12 gap-4 items-center text-white">
                        {/* Rank */}
                        <div className="col-span-1 flex items-center gap-2">
                          <span className="font-bold text-lg">
                            {entry.rank}
                          </span>
                          <div className="flex items-center gap-1">
                            {getRankChangeIcon(entry.rank, entry.previous_rank)}
                            <span className="text-xs">
                              {getRankChangeText(entry.rank, entry.previous_rank)}
                            </span>
                          </div>
                        </div>

                        {/* Player */}
                        <div className="col-span-4">
                          <div className="font-semibold">
                            {entry.first_name} {entry.last_name}
                          </div>
                          {entry.username && (
                            <div className="text-white/60 text-sm">@{entry.username}</div>
                          )}
                        </div>

                        {/* Rating */}
                        <div className="col-span-2 text-center">
                          <div className="font-bold text-xl">{Math.round(entry.rating)}</div>
                          <div className="text-white/60 text-xs">
                            ±{Math.round(entry.rd)}
                          </div>
                        </div>

                        {/* Games */}
                        <div className="col-span-2 text-center">
                          <div className="font-semibold">{entry.games_played}</div>
                        </div>

                        {/* Win Rate */}
                        <div className="col-span-2 text-center">
                          <div className="font-semibold">
                            {entry.win_rate > 0 ? `${(entry.win_rate * 100).toFixed(1)}%` : "—"}
                          </div>
                        </div>

                        {/* Recent Change */}
                        <div className="col-span-1 text-center">
                          {entry.recent_change !== 0 && (
                            <span className={`font-semibold ${
                              entry.recent_change > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {entry.recent_change > 0 ? '+' : ''}{entry.recent_change.toFixed(0)}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ChessBackground>
  )
}