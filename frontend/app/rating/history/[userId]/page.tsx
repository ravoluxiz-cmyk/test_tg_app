"use client"

import { useEffect, useState } from "react"
import ChessBackground from "@/components/ChessBackground"
import { BackButton } from "@/components/ui/back-button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp, TrendingDown, Calendar, Trophy } from "lucide-react"
import { motion } from "framer-motion"

interface RatingHistoryPoint {
  date: string
  rating: number
  rd: number
  games_played: number
  change: number
}

interface PlayerRatingInfo {
  user_id: number
  username: string
  first_name: string
  last_name: string
  current_rating: number
  current_rd: number
  current_volatility: number
  total_games: number
  win_rate: number
  recent_form: string // "WWDLW" format
  highest_rating: number
  lowest_rating: number
  rating_trend: 'up' | 'down' | 'stable'
}

interface RatingHistoryPageProps {
  params: { userId: string }
}

export default function RatingHistoryPage({ params }: RatingHistoryPageProps) {
  // router variable will be used for navigation in the future
  const userId = params.userId
  
  const [playerInfo, setPlayerInfo] = useState<PlayerRatingInfo | null>(null)
  const [history, setHistory] = useState<RatingHistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d')

  useEffect(() => {
    async function fetchRatingData() {
      try {
        // Fetch player info
        const playerResponse = await fetch(`/api/rating/player/${userId}`)
        if (!playerResponse.ok) throw new Error("Failed to fetch player info")
        const playerData = await playerResponse.json()
        setPlayerInfo(playerData)

        // Fetch rating history
        const historyParams = new URLSearchParams({
          time_range: timeRange,
          include_games: 'true'
        })
        const historyResponse = await fetch(`/api/rating/history/${userId}?${historyParams}`)
        if (!historyResponse.ok) throw new Error("Failed to fetch rating history")
        const historyData = await historyResponse.json()
        setHistory(historyData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchRatingData()
    }
  }, [userId, timeRange])

  const formatForm = (form: string) => {
    return form.split('').map((result, index) => {
      const color = result === 'W' ? 'text-green-400' : result === 'L' ? 'text-red-400' : 'text-yellow-400'
      return (
        <span key={index} className={`font-bold ${color}`}>
          {result}
        </span>
      )
    })
  }

  const chartData = history.map(point => ({
    date: new Date(point.date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
    rating: Math.round(point.rating),
    rd: Math.round(point.rd),
    games: point.games_played
  }))

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
            <div className="flex justify-start">
              <BackButton />
            </div>

            {playerInfo && (
              <div className="text-center">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-2 uppercase tracking-tight">
                  {playerInfo.first_name} {playerInfo.last_name}
                </h1>
                {playerInfo.username && (
                  <p className="text-xl text-white/60 mb-4">@{playerInfo.username}</p>
                )}
                <div className="flex items-center justify-center gap-2">
                  {playerInfo.rating_trend === 'up' && <TrendingUp className="w-6 h-6 text-green-400" />}
                  {playerInfo.rating_trend === 'down' && <TrendingDown className="w-6 h-6 text-red-400" />}
                  <span className="text-lg text-white/80">
                    {playerInfo.rating_trend === 'up' && 'Рост'}
                    {playerInfo.rating_trend === 'down' && 'Падение'}
                    {playerInfo.rating_trend === 'stable' && 'Стабилен'}
                  </span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Time Range Selector */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="flex justify-center"
          >
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2 flex gap-1">
              {[
                { value: '7d', label: '7 дней' },
                { value: '30d', label: '30 дней' },
                { value: '90d', label: '90 дней' },
                { value: '1y', label: '1 год' },
                { value: 'all', label: 'Все' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimeRange(option.value as '7d' | '30d' | '90d' | '1y' | 'all')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    timeRange === option.value
                      ? 'bg-white/20 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Content */}
          <div className="flex-1 space-y-8">
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="text-white/60 text-lg">Загрузка истории рейтинга...</div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center py-20">
                <div className="text-red-400 text-lg">Ошибка: {error}</div>
              </div>
            )}

            {!loading && !error && playerInfo && (
              <>
                {/* Current Rating Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
                    <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <div className="text-3xl font-bold text-white">
                      {Math.round(playerInfo.current_rating)}
                    </div>
                    <div className="text-white/60">Текущий рейтинг</div>
                    <div className="text-sm text-white/40 mt-1">
                      ±{Math.round(playerInfo.current_rd)}
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-white">
                      {playerInfo.total_games}
                    </div>
                    <div className="text-white/60">Всего игр</div>
                    <div className="text-sm text-white/40 mt-1">
                      {playerInfo.win_rate > 0 ? `${(playerInfo.win_rate * 100).toFixed(1)}% побед` : "Нет данных"}
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-green-400">
                      {Math.round(playerInfo.highest_rating)}
                    </div>
                    <div className="text-white/60">Максимум</div>
                    <div className="text-sm text-white/40 mt-1">
                      Лучший результат
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-white">
                      {formatForm(playerInfo.recent_form)}
                    </div>
                    <div className="text-white/60">Форма (5 игр)</div>
                    <div className="text-sm text-white/40 mt-1">
                      W=Победа, L=Поражение, D=Ничья
                    </div>
                  </div>
                </motion.div>

                {/* Rating Chart */}
                {history.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                    className="bg-white/10 backdrop-blur-md rounded-xl p-6"
                  >
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                      <TrendingUp className="w-6 h-6" />
                      История рейтинга
                    </h2>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis 
                            dataKey="date" 
                            stroke="rgba(255,255,255,0.6)"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="rgba(255,255,255,0.6)"
                            fontSize={12}
                            domain={['dataMin - 50', 'dataMax + 50']}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'rgba(0,0,0,0.8)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '8px',
                              color: 'white'
                            }}
                            formatter={(value: number | string, name: string) => [
                              name === 'rating' ? `${value} рейтинг` : value,
                              name === 'rating' ? 'Рейтинг' : name === 'rd' ? 'Погрешность' : 'Игры'
                            ]}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="rating" 
                            stroke="#fbbf24" 
                            strokeWidth={3}
                            dot={{ fill: '#fbbf24', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, stroke: '#fbbf24', strokeWidth: 2 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="rd" 
                            stroke="#60a5fa" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                )}

                {/* Recent Games */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                  className="bg-white/10 backdrop-blur-md rounded-xl p-6"
                >
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <Calendar className="w-6 h-6" />
                    Недавние игры
                  </h2>
                  <div className="space-y-3">
                    {history.slice(0, 10).map((game, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="text-white/60 text-sm">
                            {new Date(game.date).toLocaleDateString('ru-RU')}
                          </div>
                          <div className="text-white">
                            Рейтинг: {Math.round(game.rating)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {game.change !== 0 && (
                            <span className={`font-semibold ${
                              game.change > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {game.change > 0 ? '+' : ''}{game.change.toFixed(0)}
                            </span>
                          )}
                          <div className="text-white/60 text-sm">
                            {game.games_played} игр
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </div>
    </ChessBackground>
  )
}