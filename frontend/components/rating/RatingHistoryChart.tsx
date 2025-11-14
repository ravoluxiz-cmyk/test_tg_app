'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Calendar, Filter } from 'lucide-react';

interface RatingHistoryPoint {
  date: string;
  rating: number;
  rd: number;
  volatility: number;
  matches: number;
  change: number;
}

interface RatingHistoryChartProps {
  userId: string;
  timeControl?: 'blitz' | 'rapid' | 'classical';
  height?: number;
  showStats?: boolean;
  theme?: 'light' | 'dark';
}

export default function RatingHistoryChart({ 
  userId, 
  timeControl = 'blitz', 
  height = 400, 
  showStats = true,
  theme = 'light' 
}: RatingHistoryChartProps) {
  const [history, setHistory] = useState<RatingHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'rating' | 'rd' | 'volatility'>('rating');

  interface RawHistoryPoint {
    created_at?: string;
    date?: string;
    rating?: number;
    rating_after?: number;
    rd?: number;
    rd_after?: number;
    volatility?: number;
    volatility_after?: number;
    matches_played?: number;
  }

  useEffect(() => {
    const processHistoryData = (data: RawHistoryPoint[]): RatingHistoryPoint[] => {
      return data.map((point, index) => ({
        date: new Date(point.created_at || point.date || Date.now()).toLocaleDateString(),
        rating: point.rating || point.rating_after || 1500,
        rd: point.rd || point.rd_after || 200,
        volatility: point.volatility || point.volatility_after || 0.06,
        matches: point.matches_played || 1,
        change: index > 0 ? 
          (point.rating || point.rating_after || 1500) - (data[index - 1].rating || data[index - 1].rating_after || 1500) : 0
      }));
    };

    const generateMockHistory = (): RatingHistoryPoint[] => {
      const data: RatingHistoryPoint[] = [];
      const baseRating = 1500;
      let currentRating = baseRating;
      let currentRd = 200;
      let currentVolatility = 0.06;
      
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : timeRange === '1y' ? 365 : 365;
      
      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Simulate rating changes
        const change = (Math.random() - 0.5) * 30;
        currentRating += change;
        currentRd = Math.max(30, Math.min(350, currentRd + (Math.random() - 0.5) * 10));
        currentVolatility = Math.max(0.04, Math.min(0.1, currentVolatility + (Math.random() - 0.5) * 0.01));
        
        data.push({
          date: date.toISOString().split('T')[0],
          rating: Math.round(currentRating),
          rd: Math.round(currentRd),
          volatility: currentVolatility,
          matches: Math.floor(Math.random() * 3) + 1,
          change: Math.round(change)
        });
      }
      
      return data;
    };

    const fetchRatingHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/rating/history/${userId}?timeControl=${timeControl}&range=${timeRange}`);
        if (!response.ok) throw new Error('Failed to fetch rating history');
        
        const data = await response.json();
        const processedData = processHistoryData(data.history || []);
        setHistory(processedData);
      } catch (error) {
        console.error('Error fetching rating history:', error);
        // Fallback to mock data for development
        setHistory(generateMockHistory());
      } finally {
        setLoading(false);
      }
    };
    
    fetchRatingHistory();
  }, [userId, timeControl, timeRange]);

  const getRatingChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getRatingChangeColor = (change: number) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  const currentStats = history.length > 0 ? history[history.length - 1] : null;
  const previousStats = history.length > 1 ? history[history.length - 2] : null;
  const ratingChange = currentStats && previousStats ? currentStats.rating - previousStats.rating : 0;

  interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
      payload: RatingHistoryPoint;
    }>;
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`p-4 rounded-lg shadow-lg border ${
          theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-200'
        }`}>
          <p className="font-semibold mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm">Рейтинг:</span>
              <span className="font-semibold">{data.rating}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">RD:</span>
              <span className="font-semibold">{data.rd}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Волатильность:</span>
              <span className="font-semibold">{data.volatility}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Матчи:</span>
              <span className="font-semibold">{data.matches}</span>
            </div>
            {data.change !== 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="text-sm">Изменение:</span>
                <div className={`flex items-center space-x-1 font-semibold ${getRatingChangeColor(data.change)}`}>
                  {getRatingChangeIcon(data.change)}
                  <span>{data.change > 0 ? '+' : ''}{data.change}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-300 rounded mb-4"></div>
          <div className="grid grid-cols-4 gap-4">
            <div className="h-12 bg-gray-300 rounded"></div>
            <div className="h-12 bg-gray-300 rounded"></div>
            <div className="h-12 bg-gray-300 rounded"></div>
            <div className="h-12 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-lg shadow-lg ${
        theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span>История рейтинга</span>
        </h3>
        
        {/* Controls */}
        <div className="flex items-center space-x-4">
          {/* Time Range */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d' | '1y' | 'all')}
              className={`px-3 py-1 rounded border text-sm ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="7d">7 дней</option>
              <option value="30d">30 дней</option>
              <option value="90d">90 дней</option>
              <option value="1y">1 год</option>
              <option value="all">Все время</option>
            </select>
          </div>
          
          {/* Metric Selector */}
          <select 
            value={selectedMetric} 
            onChange={(e) => setSelectedMetric(e.target.value as 'rating' | 'rd' | 'volatility')}
            className={`px-3 py-1 rounded border text-sm ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="rating">Рейтинг</option>
            <option value="rd">RD (Надежность)</option>
            <option value="volatility">Волатильность</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      {showStats && currentStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className={`p-4 rounded-lg ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className="text-sm opacity-75 mb-1">Текущий рейтинг</div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold">{currentStats.rating}</span>
              {ratingChange !== 0 && (
                <div className={`flex items-center space-x-1 text-sm ${getRatingChangeColor(ratingChange)}`}>
                  {getRatingChangeIcon(ratingChange)}
                  <span>{ratingChange > 0 ? '+' : ''}{ratingChange}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className="text-sm opacity-75 mb-1">RD (Надежность)</div>
            <div className="text-2xl font-bold">{currentStats.rd}</div>
            <div className="text-xs opacity-60 mt-1">
              {currentStats.rd < 100 ? 'Высокая' : currentStats.rd < 200 ? 'Средняя' : 'Низкая'} надежность
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className="text-sm opacity-75 mb-1">Волатильность</div>
            <div className="text-2xl font-bold">{(currentStats.volatility * 100).toFixed(1)}%</div>
            <div className="text-xs opacity-60 mt-1">
              {currentStats.volatility < 0.05 ? 'Низкая' : currentStats.volatility < 0.08 ? 'Средняя' : 'Высокая'}
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className="text-sm opacity-75 mb-1">Матчи за период</div>
            <div className="text-2xl font-bold">{history.reduce((sum, point) => sum + point.matches, 0)}</div>
            <div className="text-xs opacity-60 mt-1">{currentStats.matches} за последний день</div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="mb-4">
        <ResponsiveContainer width="100%" height={height}>
          {selectedMetric === 'rating' ? (
            <AreaChart data={history}>
              <defs>
                <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
              <XAxis 
                dataKey="date" 
                stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                fontSize={12}
              />
              <YAxis 
                stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                fontSize={12}
                domain={['dataMin - 50', 'dataMax + 50']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="rating" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fill="url(#ratingGradient)"
              />
              {currentStats && (
                <ReferenceLine 
                  y={currentStats.rating} 
                  stroke="#ef4444" 
                  strokeDasharray="5 5" 
                  label={{ value: "Текущий", position: "right" }}
                />
              )}
            </AreaChart>
          ) : selectedMetric === 'rd' ? (
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
              <XAxis 
                dataKey="date" 
                stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                fontSize={12}
              />
              <YAxis 
                stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                fontSize={12}
                domain={[0, 350]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="rd" 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          ) : (
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
              <XAxis 
                dataKey="date" 
                stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                fontSize={12}
              />
              <YAxis 
                stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                fontSize={12}
                domain={[0.04, 0.1]}
                tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className={`p-4 rounded-lg shadow-lg border ${
                        theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-200'
                      }`}>
                        <p className="font-semibold mb-2">{label}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Волатильность:</span>
                          <span className="font-semibold">{(data.volatility * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="volatility" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer Stats */}
      {history.length > 0 && (
        <div className={`pt-4 border-t ${
          theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
        }`}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <div className="opacity-75">Максимум</div>
              <div className="font-semibold">{Math.max(...history.map(h => h.rating))}</div>
            </div>
            <div>
              <div className="opacity-75">Минимум</div>
              <div className="font-semibold">{Math.min(...history.map(h => h.rating))}</div>
            </div>
            <div>
              <div className="opacity-75">Средний</div>
              <div className="font-semibold">{Math.round(history.reduce((sum, h) => sum + h.rating, 0) / history.length)}</div>
            </div>
            <div>
              <div className="opacity-75">Всего матчей</div>
              <div className="font-semibold">{history.reduce((sum, h) => sum + h.matches, 0)}</div>
            </div>
            <div>
              <div className="opacity-75">Изменение</div>
              <div className={`font-semibold ${getRatingChangeColor(history[history.length - 1].rating - history[0].rating)}`}>
                {history[history.length - 1].rating - history[0].rating > 0 ? '+' : ''}
                {history[history.length - 1].rating - history[0].rating}
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}