'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingUp, Users, Clock, Target, BarChart3, RefreshCw } from 'lucide-react';
import RatingDisplay from './RatingDisplay';
import RatingLeaderboard from './RatingLeaderboard';
import RatingHistoryChart from './RatingHistoryChart';
import RatingPrediction from './RatingPrediction';

interface UserRating {
  userId: string;
  username: string;
  rating: number;
  rd: number;
  volatility: number;
  matchesPlayed: number;
  lastMatchDate: string;
}

interface DashboardStats {
  totalPlayers: number;
  averageRating: number;
  activeMatches: number;
  ratingChanges: number;
}

interface RatingDashboardProps {
  userId: string;
  theme?: 'light' | 'dark';
  defaultTimeControl?: 'blitz' | 'rapid' | 'classical';
  showPredictions?: boolean;
  showLeaderboard?: boolean;
  showHistory?: boolean;
}

export default function RatingDashboard({ 
  userId, 
  theme = 'light',
  defaultTimeControl = 'blitz'
}: RatingDashboardProps) {
  const [timeControl, setTimeControl] = useState<'blitz' | 'rapid' | 'classical'>(defaultTimeControl);
  // These props are available for conditional rendering but currently unused
  // const { showPredictions, showLeaderboard, showHistory } = { showPredictions, showLeaderboard, showHistory };
  const [userRating, setUserRating] = useState<UserRating | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'history' | 'predictions'>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const generateMockUserRating = useCallback((): UserRating => {
    const baseRating = timeControl === 'blitz' ? 1650 : timeControl === 'rapid' ? 1700 : 1750;
    return {
      userId,
      username: 'Текущий игрок',
      rating: baseRating + Math.floor(Math.random() * 100) - 50,
      rd: 60 + Math.floor(Math.random() * 40),
      volatility: 0.05 + Math.random() * 0.02,
      matchesPlayed: 50 + Math.floor(Math.random() * 100),
      lastMatchDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  }, [userId, timeControl]);

  const generateMockStats = useCallback((): DashboardStats => {
    return {
      totalPlayers: 500 + Math.floor(Math.random() * 200),
      averageRating: 1500 + Math.floor(Math.random() * 100) - 50,
      activeMatches: 20 + Math.floor(Math.random() * 30),
      ratingChanges: 100 + Math.floor(Math.random() * 200)
    };
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch user rating
      const ratingResponse = await fetch(`/api/rating/player/${userId}?timeControl=${timeControl}`);
      if (ratingResponse.ok) {
        const ratingData = await ratingResponse.json();
        setUserRating(ratingData);
      }
      
      // Fetch dashboard stats
      const statsResponse = await fetch(`/api/rating/stats?timeControl=${timeControl}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setDashboardStats(statsData);
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Fallback to mock data
      setUserRating(generateMockUserRating());
      setDashboardStats(generateMockStats());
    } finally {
      setLoading(false);
    }
  }, [userId, timeControl, generateMockUserRating, generateMockStats]);

  useEffect(() => {
    fetchDashboardData();
  }, [userId, timeControl, fetchDashboardData]);

  // Removed unused getTimeControlLabel function

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };



  if (loading) {
    return (
      <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="h-32 bg-gray-300 rounded"></div>
            <div className="h-32 bg-gray-300 rounded"></div>
            <div className="h-32 bg-gray-300 rounded"></div>
            <div className="h-32 bg-gray-300 rounded"></div>
          </div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg shadow-lg overflow-hidden ${
      theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
    }`}>
      {/* Header */}
      <div className={`p-6 border-b ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div>
              <h2 className="text-2xl font-bold">Рейтинговая система</h2>
              <p className="text-sm opacity-75">Glicko-2 алгоритм для точного ранжирования</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Time Control Selector */}
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <select 
                value={timeControl} 
                onChange={(e) => setTimeControl(e.target.value as 'blitz' | 'rapid' | 'classical')}
                className={`px-3 py-2 rounded border text-sm ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="blitz">Блиц</option>
                <option value="rapid">Рапид</option>
                <option value="classical">Классика</option>
              </select>
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-900 disabled:opacity-50'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        {/* Stats Overview */}
        {dashboardStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <div className="flex items-center justify-between">
                <Users className="w-5 h-5 text-blue-500" />
                <span className="text-2xl font-bold">{dashboardStats.totalPlayers}</span>
              </div>
              <p className="text-sm opacity-75 mt-1">Игроков</p>
            </div>
            
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <div className="flex items-center justify-between">
                <BarChart3 className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold">{Math.round(dashboardStats.averageRating)}</span>
              </div>
              <p className="text-sm opacity-75 mt-1">Средний рейтинг</p>
            </div>
            
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <div className="flex items-center justify-between">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="text-2xl font-bold">{dashboardStats.activeMatches}</span>
              </div>
              <p className="text-sm opacity-75 mt-1">Активные матчи</p>
            </div>
            
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <div className="flex items-center justify-between">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <span className="text-2xl font-bold">{dashboardStats.ratingChanges}</span>
              </div>
              <p className="text-sm opacity-75 mt-1">Изменения</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Navigation Tabs */}
      <div className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex space-x-8 px-6">
          {[
            { id: 'overview', label: 'Обзор', icon: BarChart3 },
            { id: 'leaderboard', label: 'Таблица лидеров', icon: Trophy },
            { id: 'history', label: 'История', icon: TrendingUp },
            { id: 'predictions', label: 'Предсказания', icon: Target }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'leaderboard' | 'history' | 'predictions')}
              className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? theme === 'dark'
                    ? 'border-blue-500 text-blue-500'
                    : 'border-blue-500 text-blue-600'
                  : theme === 'dark'
                  ? 'border-transparent text-gray-400 hover:text-gray-300'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'overview' && userRating && (
              <RatingDisplay
                userId={parseInt(userId)}
                timeControl={timeControl}
                theme={theme}
              />
            )}
            
            {activeTab === 'leaderboard' && (
              <RatingLeaderboard
                timeControl={timeControl}
                theme={theme}
              />
            )}
            
            {activeTab === 'history' && (
              <RatingHistoryChart
                userId={userId}
                timeControl={timeControl}
                theme={theme}
              />
            )}
            
            {activeTab === 'predictions' && (
              <RatingPrediction
                player1Id={parseInt(userId)}
                timeControl={timeControl}
                theme={theme}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}