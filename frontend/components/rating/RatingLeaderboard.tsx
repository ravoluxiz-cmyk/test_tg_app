"use client"

import { useEffect, useState } from "react"
import { Trophy, TrendingUp, TrendingDown, Minus, Search, Medal, Crown } from "lucide-react"
import { motion } from "framer-motion"

interface LeaderboardEntry {
  id: number
  username: string | null
  first_name: string
  last_name: string
  rating: number
  rd: number
  volatility: number
  games_count: number
  wins_count: number
  losses_count: number
  draws_count: number
  last_game_at?: string | null
  highest_rating?: number
  lowest_rating?: number
  win_rate: number
  global_rank: number
  time_control: 'classical' | 'rapid' | 'blitz'
  recent_trend?: 'up' | 'down' | 'stable'
  rating_change_7d?: number
  rating_change_30d?: number
}

interface RatingLeaderboardProps {
  timeControl?: 'all' | 'classical' | 'rapid' | 'blitz'
  maxEntries?: number
  showFilters?: boolean
  compact?: boolean
  theme?: 'dark' | 'light'
}

export default function RatingLeaderboard({ 
  timeControl = 'all', 
  maxEntries = 50, 
  showFilters = true,
  theme = 'dark' 
}: RatingLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeControl, setSelectedTimeControl] = useState(timeControl)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'rating' | 'games' | 'win_rate' | 'recent'>('rating')

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const response = await fetch(`/api/rating/leaderboard?timeControl=${selectedTimeControl}&limit=${maxEntries}`)
        if (!response.ok) throw new Error("Failed to fetch leaderboard")
        const data = await response.json()
        setLeaderboard(data.leaderboard || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [selectedTimeControl, maxEntries])

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-green-400" />
      case 'down': return <TrendingDown className="w-3 h-3 text-red-400" />
      default: return <Minus className="w-3 h-3 text-gray-400" />
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-4 h-4 text-yellow-400" />
    if (rank === 2) return <Medal className="w-4 h-4 text-gray-300" />
    if (rank === 3) return <Medal className="w-4 h-4 text-orange-400" />
    return null
  }

  const getRatingCategory = (rating: number, timeControl: string) => {
    const categories = {
      classical: [
        { min: 0, max: 1200, name: 'Новичок', color: 'text-gray-400' },
        { min: 1200, max: 1400, name: 'Ученик', color: 'text-green-400' },
        { min: 1400, max: 1600, name: 'Разрядник', color: 'text-blue-400' },
        { min: 1600, max: 1800, name: 'Кандидат', color: 'text-purple-400' },
        { min: 1800, max: 2000, name: 'Мастер', color: 'text-orange-400' },
        { min: 2000, max: 2200, name: 'IM', color: 'text-red-400' },
        { min: 2200, max: 2500, name: 'GM', color: 'text-yellow-400' },
        { min: 2500, max: 3000, name: 'Супер-GM', color: 'text-gold-400' }
      ],
      rapid: [
        { min: 0, max: 1100, name: 'Новичок', color: 'text-gray-400' },
        { min: 1100, max: 1300, name: 'Ученик', color: 'text-green-400' },
        { min: 1300, max: 1500, name: 'Разрядник', color: 'text-blue-400' },
        { min: 1500, max: 1700, name: 'Кандидат', color: 'text-purple-400' },
        { min: 1700, max: 1900, name: 'Мастер', color: 'text-orange-400' },
        { min: 1900, max: 2100, name: 'IM', color: 'text-red-400' },
        { min: 2100, max: 2400, name: 'GM', color: 'text-yellow-400' },
        { min: 2400, max: 3000, name: 'Супер-GM', color: 'text-gold-400' }
      ],
      blitz: [
        { min: 0, max: 1000, name: 'Новичок', color: 'text-gray-400' },
        { min: 1000, max: 1200, name: 'Ученик', color: 'text-green-400' },
        { min: 1200, max: 1400, name: 'Разрядник', color: 'text-blue-400' },
        { min: 1400, max: 1600, name: 'Кандидат', color: 'text-purple-400' },
        { min: 1600, max: 1800, name: 'Мастер', color: 'text-orange-400' },
        { min: 1800, max: 2000, name: 'IM', color: 'text-red-400' },
        { min: 2000, max: 2300, name: 'GM', color: 'text-yellow-400' },
        { min: 2300, max: 3000, name: 'Супер-GM', color: 'text-gold-400' }
      ]
    }
    
    const timeControlCategories = categories[timeControl as keyof typeof categories] || categories.classical
    return timeControlCategories.find(cat => rating >= cat.min && rating < cat.max) || timeControlCategories[0]
  }

  const filteredAndSortedLeaderboard = leaderboard
    .filter(entry => {
      if (selectedTimeControl !== 'all' && entry.time_control !== selectedTimeControl) return false
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        return (
          entry.username?.toLowerCase().includes(searchLower) ||
          entry.first_name.toLowerCase().includes(searchLower) ||
          entry.last_name.toLowerCase().includes(searchLower)
        )
      }
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'games':
          return b.games_count - a.games_count
        case 'win_rate':
          return b.win_rate - a.win_rate
        case 'recent':
          return (b.rating_change_7d || 0) - (a.rating_change_7d || 0)
        case 'rating':
        default:
          return b.rating - a.rating
      }
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className={`text-lg ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
          Загрузка таблицы лидеров...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-lg mb-2">Ошибка загрузки</div>
        <div className={theme === 'dark' ? 'text-white/60' : 'text-gray-600'}>{error}</div>
      </div>
    )
  }

  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-8">
        <Trophy className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-white/40' : 'text-gray-400'}`} />
        <div className={`text-lg ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
          Таблица лидеров пуста
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`${
        theme === 'dark' 
          ? 'bg-white/10 backdrop-blur-md' 
          : 'bg-white border border-gray-200'
      } rounded-xl p-6`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <h2 className={`text-2xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Таблица лидеров
          </h2>
          {selectedTimeControl !== 'all' && (
            <span className={`text-sm px-2 py-1 rounded-full ${
              theme === 'dark' ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
              {selectedTimeControl === 'classical' ? 'Классика' : 
               selectedTimeControl === 'rapid' ? 'Рапид' : 'Блиц'}
            </span>
          )}
        </div>
        
        {showFilters && (
          <div className="flex items-center gap-2">
            <select
              value={selectedTimeControl}
              onChange={(e) => setSelectedTimeControl(e.target.value as 'all' | 'classical' | 'rapid' | 'blitz')}
              className={`px-3 py-2 rounded-lg border text-sm ${
                theme === 'dark'
                  ? 'bg-white/10 text-white border-white/20'
                  : 'bg-white text-gray-900 border-gray-300'
              }`}
            >
              <option value="all">Все контроли</option>
              <option value="classical">Классика</option>
              <option value="rapid">Рапид</option>
              <option value="blitz">Блиц</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'rating' | 'games' | 'win_rate' | 'recent')}
              className={`px-3 py-2 rounded-lg border text-sm ${
                theme === 'dark'
                  ? 'bg-white/10 text-white border-white/20'
                  : 'bg-white text-gray-900 border-gray-300'
              }`}
            >
              <option value="rating">По рейтингу</option>
              <option value="games">По играм</option>
              <option value="win_rate">По проценту побед</option>
              <option value="recent">По активности</option>
            </select>
          </div>
        )}
      </div>

      {/* Search */}
      {showFilters && (
        <div className="mb-6">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
              theme === 'dark' ? 'text-white/40' : 'text-gray-400'
            }`} />
            <input
              type="text"
              placeholder="Поиск игрока..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-white/10 text-white border-white/20 placeholder-white/40'
                  : 'bg-white text-gray-900 border-gray-300 placeholder-gray-400'
              }`}
            />
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`border-b ${
              theme === 'dark' ? 'border-white/10' : 'border-gray-200'
            }`}>
              <th className={`text-left py-3 px-2 ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`}>#</th>
              <th className={`text-left py-3 px-2 ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`}>Игрок</th>
              <th className={`text-center py-3 px-2 ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`}>Рейтинг</th>
              <th className={`text-center py-3 px-2 ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`}>Категория</th>
              <th className={`text-center py-3 px-2 ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`}>Игры</th>
              <th className={`text-center py-3 px-2 ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`}>Победы</th>
              <th className={`text-center py-3 px-2 ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`}>Win Rate</th>
              <th className={`text-center py-3 px-2 ${
                theme === 'dark' ? 'text-white/60' : 'text-gray-600'
              }`}>Тренд</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedLeaderboard.map((entry, index) => {
              const category = getRatingCategory(entry.rating, entry.time_control)
              
              return (
                <motion.tr
                  key={`${entry.id}-${entry.time_control}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`border-b ${
                    theme === 'dark' ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {entry.global_rank}
                      </span>
                      {getRankIcon(entry.global_rank)}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        theme === 'dark' ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {entry.first_name[0]}{entry.last_name[0]}
                      </div>
                      <div>
                        <div className={`font-semibold ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {entry.first_name} {entry.last_name}
                        </div>
                        {entry.username && (
                          <div className={`text-sm ${
                            theme === 'dark' ? 'text-white/60' : 'text-gray-600'
                          }`}>
                            @{entry.username}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className={`font-bold text-lg ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {Math.round(entry.rating)}
                    </div>
                    <div className={`text-xs ${
                      theme === 'dark' ? 'text-white/40' : 'text-gray-500'
                    }`}>
                      ±{Math.round(entry.rd)}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${category.color} ${
                      theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'
                    }`}>
                      {category.name}
                    </span>
                  </td>
                  <td className={`py-3 px-2 text-center ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {entry.games_count}
                  </td>
                  <td className={`py-3 px-2 text-center text-green-400 font-semibold`}>
                    {entry.wins_count}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className={`font-semibold ${
                      entry.win_rate > 0.6 ? 'text-green-400' : 
                      entry.win_rate > 0.5 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {(entry.win_rate * 100).toFixed(1)}%
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {getTrendIcon(entry.recent_trend)}
                      {entry.rating_change_7d && entry.rating_change_7d !== 0 && (
                        <span className={`text-xs ${
                          entry.rating_change_7d > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {entry.rating_change_7d > 0 ? '+' : ''}{entry.rating_change_7d.toFixed(0)}
                        </span>
                      )}
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filteredAndSortedLeaderboard.length === 0 && (
        <div className="text-center py-8">
          <div className={`text-lg ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
            Игроки не найдены
          </div>
        </div>
      )}
    </motion.div>
  )
}