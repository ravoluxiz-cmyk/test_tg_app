"use client"

import { useEffect, useState } from "react"
import { Trophy, TrendingUp, TrendingDown, Minus, Target, BarChart3, Award } from "lucide-react"
import { motion } from "framer-motion"

interface PlayerRating {
  user_id: number
  rating: number
  rd: number
  volatility: number
  games_played: number
  wins_count: number
  losses_count: number
  draws_count: number
  win_rate: number
  recent_change: number
  rank: number
  time_control: 'classical' | 'rapid' | 'blitz'
  highest_rating?: number
  lowest_rating?: number
  rating_volatility?: number
  last_game_at?: string
}

interface RatingDisplayProps {
  userId: number
  timeControl?: 'blitz' | 'rapid' | 'classical'
  showHistory?: boolean
  showRank?: boolean
  showStats?: boolean
  compact?: boolean
  theme?: 'dark' | 'light'
}

export default function RatingDisplay({ 
  userId, 
  timeControl = 'blitz',
  showHistory = false, 
  showRank = true, 
  showStats = true, 
  compact = false, 
  theme = 'dark' 
}: RatingDisplayProps) {
  const [ratings, setRatings] = useState<PlayerRating[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeControl, setSelectedTimeControl] = useState<'classical' | 'rapid' | 'blitz' | 'all'>('all')

  useEffect(() => {
    async function fetchRatings() {
      try {
        const response = await fetch(`/api/rating/player/${userId}?timeControl=${timeControl}`)
        if (!response.ok) throw new Error("Failed to fetch ratings")
        const data = await response.json()
        setRatings(Array.isArray(data) ? data : [data])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchRatings()
    }
  }, [userId, timeControl])

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-400" />
      case 'down': return <TrendingDown className="w-4 h-4 text-red-400" />
      default: return <Minus className="w-4 h-4 text-gray-400" />
    }
  }

  const getTimeControlLabel = (tc: string) => {
    switch (tc) {
      case 'classical': return 'Классика'
      case 'rapid': return 'Рапид'
      case 'blitz': return 'Блиц'
      default: return 'Все'
    }
  }

  const getRatingCategory = (rating: number, timeControl: string) => {
    const categories = {
      classical: [
        { min: 0, max: 1200, name: 'Новичок', color: 'text-gray-400' },
        { min: 1200, max: 1400, name: 'Ученик', color: 'text-green-400' },
        { min: 1400, max: 1600, name: 'Разрядник', color: 'text-blue-400' },
        { min: 1600, max: 1800, name: 'Кандидат в мастера', color: 'text-purple-400' },
        { min: 1800, max: 2000, name: 'Мастер', color: 'text-orange-400' },
        { min: 2000, max: 2200, name: 'Международный мастер', color: 'text-red-400' },
        { min: 2200, max: 2500, name: 'Гроссмейстер', color: 'text-yellow-400' },
        { min: 2500, max: 3000, name: 'Супергроссмейстер', color: 'text-gold-400' }
      ],
      rapid: [
        { min: 0, max: 1100, name: 'Новичок', color: 'text-gray-400' },
        { min: 1100, max: 1300, name: 'Ученик', color: 'text-green-400' },
        { min: 1300, max: 1500, name: 'Разрядник', color: 'text-blue-400' },
        { min: 1500, max: 1700, name: 'Кандидат в мастера', color: 'text-purple-400' },
        { min: 1700, max: 1900, name: 'Мастер', color: 'text-orange-400' },
        { min: 1900, max: 2100, name: 'Международный мастер', color: 'text-red-400' },
        { min: 2100, max: 2400, name: 'Гроссмейстер', color: 'text-yellow-400' },
        { min: 2400, max: 3000, name: 'Супергроссмейстер', color: 'text-gold-400' }
      ],
      blitz: [
        { min: 0, max: 1000, name: 'Новичок', color: 'text-gray-400' },
        { min: 1000, max: 1200, name: 'Ученик', color: 'text-green-400' },
        { min: 1200, max: 1400, name: 'Разрядник', color: 'text-blue-400' },
        { min: 1400, max: 1600, name: 'Кандидат в мастера', color: 'text-purple-400' },
        { min: 1600, max: 1800, name: 'Мастер', color: 'text-orange-400' },
        { min: 1800, max: 2000, name: 'Международный мастер', color: 'text-red-400' },
        { min: 2000, max: 2300, name: 'Гроссмейстер', color: 'text-yellow-400' },
        { min: 2300, max: 3000, name: 'Супергроссмейстер', color: 'text-gold-400' }
      ]
    }
    
    const timeControlCategories = categories[timeControl as keyof typeof categories] || categories.classical
    return timeControlCategories.find(cat => rating >= cat.min && rating < cat.max) || timeControlCategories[0]
  }

  const getConfidenceLevel = (rd: number) => {
    if (rd < 50) return { level: 'Очень высокая', color: 'text-green-400' }
    if (rd < 100) return { level: 'Высокая', color: 'text-green-300' }
    if (rd < 150) return { level: 'Средняя', color: 'text-yellow-400' }
    if (rd < 200) return { level: 'Низкая', color: 'text-orange-400' }
    return { level: 'Очень низкая', color: 'text-red-400' }
  }

  const formatLastGameDate = (dateString?: string) => {
    if (!dateString) return 'Никогда'
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Сегодня'
    if (diffDays === 1) return 'Вчера'
    if (diffDays < 7) return `${diffDays} дней назад`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} недель назад`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} месяцев назад`
    return `${Math.floor(diffDays / 365)} лет назад`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-white/60">Загрузка рейтинга...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-400 text-sm py-2">
        Ошибка загрузки рейтинга: {error}
      </div>
    )
  }

  if (ratings.length === 0) {
    return (
      <div className="text-white/60 text-center py-4">
        Рейтинг не найден
      </div>
    )
  }

  const filteredRatings = selectedTimeControl === 'all' 
    ? ratings 
    : ratings.filter(r => r.time_control === selectedTimeControl)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`${
        theme === 'dark' 
          ? 'bg-white/10 backdrop-blur-md' 
          : 'bg-gray-50 border border-gray-200'
      } rounded-xl p-6 ${compact ? 'p-4' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-xl font-bold flex items-center gap-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          <Trophy className="w-5 h-5" />
          Рейтинг Glicko-2
        </h3>
        
        {ratings.length > 1 && (
          <select
            value={selectedTimeControl}
            onChange={(e) => setSelectedTimeControl(e.target.value as 'classical' | 'rapid' | 'blitz' | 'all')}
            className={`${
              theme === 'dark' 
                ? 'bg-white/10 text-white border-white/20 focus:border-white/40' 
                : 'bg-white text-gray-900 border-gray-300 focus:border-gray-500'
            } rounded-lg px-3 py-1 text-sm border focus:outline-none`}
          >
            <option value="all">Все</option>
            <option value="classical">Классика</option>
            <option value="rapid">Рапид</option>
            <option value="blitz">Блиц</option>
          </select>
        )}
      </div>

      <div className="space-y-4">
        {filteredRatings.map((rating, index) => {
          const category = getRatingCategory(rating.rating, rating.time_control)
          const confidence = getConfidenceLevel(rating.rd)
          
          return (
            <motion.div
              key={`${rating.time_control}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`${
                theme === 'dark' ? 'bg-white/5' : 'bg-white border border-gray-200'
              } rounded-lg p-4 ${compact ? 'p-3' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {getTimeControlLabel(rating.time_control)}
                </div>
                <div className="flex items-center gap-2">
                  {showRank && rating.rank > 0 && (
                    <div className={`text-sm ${
                      theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                    }`}>
                      #{rating.rank}
                    </div>
                  )}
                  <div className={`text-xs px-2 py-1 rounded-full ${category.color} ${
                    theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'
                  }`}>
                    {category.name}
                  </div>
                </div>
              </div>

              <div className={`grid gap-4 ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
                {/* Main Rating */}
                <div className="text-center lg:text-left">
                  <div className={`text-sm mb-1 ${
                    theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                  }`}>
                    Текущий рейтинг
                  </div>
                  <div className={`text-2xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {Math.round(rating.rating)}
                  </div>
                  <div className={`text-xs ${
                    theme === 'dark' ? 'text-white/40' : 'text-gray-500'
                  }`}>
                    ±{Math.round(rating.rd)} (точность)
                  </div>
                </div>

                {/* Confidence Level */}
                <div className="text-center">
                  <div className={`text-sm mb-1 ${
                    theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                  }`}>
                    Доверие
                  </div>
                  <div className={`text-lg font-semibold ${confidence.color}`}>
                    {confidence.level}
                  </div>
                  <div className={`text-xs ${
                    theme === 'dark' ? 'text-white/40' : 'text-gray-500'
                  }`}>
                    RD: {Math.round(rating.rd)}
                  </div>
                </div>

                {/* Games Statistics */}
                <div className="text-center">
                  <div className={`text-sm mb-1 ${
                    theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                  }`}>
                    Игры
                  </div>
                  <div className={`text-lg font-semibold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {rating.games_played}
                  </div>
                  <div className={`text-xs ${
                    theme === 'dark' ? 'text-white/40' : 'text-gray-500'
                  }`}>
                    {(rating.win_rate * 100).toFixed(1)}% побед
                  </div>
                </div>

                {/* Recent Performance */}
                {rating.recent_change !== 0 && (
                  <div className="text-center lg:text-right">
                    <div className={`text-sm mb-1 ${
                      theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                    }`}>
                      Изменение
                    </div>
                    <div className="flex items-center justify-center lg:justify-end gap-1">
                      {getTrendIcon(
                        rating.recent_change > 0 ? 'up' : 
                        rating.recent_change < 0 ? 'down' : 'stable'
                      )}
                      <span className={`font-semibold ${
                        rating.recent_change > 0 ? 'text-green-400' : 
                        rating.recent_change < 0 ? 'text-red-400' : 
                        theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                      }`}>
                        {rating.recent_change > 0 ? '+' : ''}{rating.recent_change.toFixed(0)}
                      </span>
                    </div>
                    <div className={`text-xs ${
                      theme === 'dark' ? 'text-white/40' : 'text-gray-500'
                    }`}>
                      Последняя игра
                    </div>
                  </div>
                )}
              </div>

              {/* Extended Statistics */}
              {showStats && !compact && (
                <div className={`mt-4 pt-4 border-t ${
                  theme === 'dark' ? 'border-white/10' : 'border-gray-200'
                }`}>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className={`text-xs ${
                        theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                      }`}>
                        Победы
                      </div>
                      <div className={`text-lg font-semibold text-green-400`}>
                        {rating.wins_count}
                      </div>
                    </div>
                    <div>
                      <div className={`text-xs ${
                        theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                      }`}>
                        Поражения
                      </div>
                      <div className={`text-lg font-semibold text-red-400`}>
                        {rating.losses_count}
                      </div>
                    </div>
                    <div>
                      <div className={`text-xs ${
                        theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                      }`}>
                        Ничьи
                      </div>
                      <div className={`text-lg font-semibold text-gray-400`}>
                        {rating.draws_count}
                      </div>
                    </div>
                    <div>
                      <div className={`text-xs ${
                        theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                      }`}>
                        Последняя игра
                      </div>
                      <div className={`text-sm ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {formatLastGameDate(rating.last_game_at)}
                      </div>
                    </div>
                  </div>

                  {/* Rating Range */}
                  {rating.highest_rating && rating.lowest_rating && (
                    <div className="mt-3">
                      <div className={`text-xs text-center mb-2 ${
                        theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                      }`}>
                        Диапазон рейтинга
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-red-400">▼ {rating.lowest_rating}</div>
                        <div className={`${
                          theme === 'dark' ? 'text-white/40' : 'text-gray-500'
                        }`}>
                          Текущий: {Math.round(rating.rating)}
                        </div>
                        <div className="text-green-400">▲ {rating.highest_rating}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className={`flex gap-2 mt-4 ${
                theme === 'dark' ? 'border-white/10' : 'border-gray-200'
              }`}>
                {showHistory && (
                  <button
                    onClick={() => window.location.href = `/rating/history/${rating.user_id}`}
                    className={`flex-1 py-2 rounded-lg transition-colors text-sm ${
                      theme === 'dark'
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 inline mr-2" />
                    История
                  </button>
                )}
                <button
                  onClick={() => window.location.href = `/rating/predict?opponent=${rating.user_id}`}
                  className={`flex-1 py-2 rounded-lg transition-colors text-sm ${
                    theme === 'dark'
                      ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400'
                      : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                  }`}
                >
                  <Target className="w-4 h-4 inline mr-2" />
                  Прогноз
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-6 text-center">
        <a
          href="/rating/leaderboard"
          className={`text-sm underline transition-colors ${
            theme === 'dark'
              ? 'text-white/60 hover:text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Award className="w-4 h-4 inline mr-2" />
          Таблица лидеров
        </a>
      </div>
    </motion.div>
  )
}