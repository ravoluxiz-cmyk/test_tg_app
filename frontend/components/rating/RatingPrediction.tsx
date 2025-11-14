'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Target, Calculator, AlertCircle, TrendingUp } from 'lucide-react';

interface PlayerRating {
  userId: string;
  rating: number;
  rd: number;
  volatility: number;
}

interface PredictionResult {
  expectedScore: number;
  ratingChangeWin: number;
  ratingChangeLoss: number;
  ratingChangeDraw: number;
  confidence: number;
  winProbability: number;
  lossProbability: number;
  drawProbability: number;
}

interface RatingPredictionProps {
  player1Id: number;
  player2Id?: number;
  timeControl?: 'blitz' | 'rapid' | 'classical';
  theme?: 'light' | 'dark';
}

export default function RatingPrediction({ 
  player1Id, 
  player2Id,
  timeControl = 'blitz',
  theme = 'light'
}: RatingPredictionProps) {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [player1, setPlayer1] = useState<PlayerRating | null>(null);
  const [player2, setPlayer2] = useState<PlayerRating | null>(null);

  // Fetch player ratings
  useEffect(() => {
    const fetchPlayerRatings = async () => {
      try {
        setLoading(true);
        
        // Fetch player 1 rating
        const player1Response = await fetch(`/api/rating/player/${player1Id}?timeControl=${timeControl}`);
        if (player1Response.ok) {
          const player1Data = await player1Response.json();
          setPlayer1({
            userId: player1Data.userId,
            rating: player1Data.rating,
            rd: player1Data.rd,
            volatility: player1Data.volatility
          });
        }

        // Fetch player 2 rating if specified
        if (player2Id) {
          const player2Response = await fetch(`/api/rating/player/${player2Id}?timeControl=${timeControl}`);
          if (player2Response.ok) {
            const player2Data = await player2Response.json();
            setPlayer2({
              userId: player2Data.userId,
              rating: player2Data.rating,
              rd: player2Data.rd,
              volatility: player2Data.volatility
            });
          }
        } else {
          // Use default opponent for demo
          setPlayer2({
            userId: 'demo-opponent',
            rating: 1500,
            rd: 200,
            volatility: 0.06
          });
        }
      } catch (error) {
        console.error('Error fetching player ratings:', error);
        // Use demo data as fallback
        setPlayer1({
          userId: 'demo-player',
          rating: 1600,
          rd: 150,
          volatility: 0.05
        });
        setPlayer2({
          userId: 'demo-opponent',
          rating: 1500,
          rd: 200,
          volatility: 0.06
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerRatings();
  }, [player1Id, player2Id, timeControl]);

  const calculateLocalPrediction = useCallback((): PredictionResult => {
    if (!player1 || !player2) {
      return {
        expectedScore: 0.5,
        ratingChangeWin: 0,
        ratingChangeLoss: 0,
        ratingChangeDraw: 0,
        confidence: 0.5,
        winProbability: 50,
        lossProbability: 50,
        drawProbability: 0
      };
    }

    // Simplified Glicko expected score calculation
    const g = 1 / Math.sqrt(1 + (3 * Math.pow(player2.rd, 2)) / Math.pow(Math.PI, 2));
    const e = 1 / (1 + Math.pow(10, -g * (player1.rating - player2.rating) / 400));
    
    // Rating changes (simplified)
    const kFactor = getKFactor(timeControl);
    const ratingChangeWin = Math.round(kFactor * (1 - e));
    const ratingChangeLoss = Math.round(kFactor * (0 - e));
    const ratingChangeDraw = Math.round(kFactor * (0.5 - e));
    
    // Confidence based on RD values
    const avgRd = (player1.rd + player2.rd) / 2;
    const confidence = Math.max(0.1, Math.min(0.9, 1 - (avgRd / 350)));
    
    // Win probabilities (simplified)
    const winProbability = e;
    const lossProbability = 1 - e;
    const drawProbability = 0.1; // Fixed draw probability for simplicity
    
    return {
      expectedScore: Math.round(e * 100) / 100,
      ratingChangeWin,
      ratingChangeLoss,
      ratingChangeDraw,
      confidence,
      winProbability: Math.round(winProbability * 100),
      lossProbability: Math.round(lossProbability * 100),
      drawProbability: Math.round(drawProbability * 100)
    };
  }, [player1, player2, timeControl]);

  // Calculate prediction when players are loaded
  useEffect(() => {
    if (player1 && player2) {
      const prediction = calculateLocalPrediction();
      setPrediction(prediction);
    }
  }, [player1, player2, calculateLocalPrediction]);

  const getKFactor = (timeControl: string): number => {
    switch (timeControl) {
      case 'blitz': return 20;
      case 'rapid': return 15;
      case 'classical': return 10;
      default: return 15;
    }
  };

  const getRatingDifference = (): number => {
    return player1 ? player1.rating - (player2 ? player2.rating : 1500) : 0;
  };

  const getRatingDifferenceColor = (diff: number): string => {
    if (diff > 100) return 'text-green-500';
    if (diff > 50) return 'text-green-400';
    if (diff > -50) return 'text-yellow-500';
    if (diff > -100) return 'text-orange-400';
    return 'text-red-500';
  };

  const getRatingDifferenceText = (diff: number): string => {
    if (diff > 200) return 'Существенное преимущество';
    if (diff > 100) return 'Значительное преимущество';
    if (diff > 50) return 'Преимущество';
    if (diff > -50) return 'Равные шансы';
    if (diff > -100) return 'Небольшое преимущество соперника';
    if (diff > -200) return 'Значительное преимущество соперника';
    return 'Существенное преимущество соперника';
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence > 0.8) return 'text-green-500';
    if (confidence > 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getConfidenceText = (confidence: number): string => {
    if (confidence > 0.8) return 'Высокая';
    if (confidence > 0.6) return 'Средняя';
    return 'Низкая';
  };

  const ratingDiff = getRatingDifference();

  if (loading) {
    return (
      <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="h-20 bg-gray-300 rounded"></div>
            <div className="h-20 bg-gray-300 rounded"></div>
            <div className="h-20 bg-gray-300 rounded"></div>
          </div>
          <div className="h-32 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (!player1 || !player2 || !prediction) {
    return (
      <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-lg font-semibold">Недостаточно данных для прогноза</p>
          <p className="text-sm opacity-75 mt-2">Необходимо больше информации об игроках</p>
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
        <div className="flex items-center space-x-3">
          <Target className="w-6 h-6 text-blue-500" />
          <h3 className="text-xl font-bold">Прогноз матча</h3>
        </div>
        <div className="flex items-center space-x-2">
          <Calculator className="w-4 h-4 opacity-75" />
          <span className="text-sm opacity-75">Glicko-2</span>
        </div>
      </div>

      {/* Players Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className={`p-4 rounded-lg ${
          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
        }`}>
          <h4 className="font-semibold mb-2">Игрок 1</h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm opacity-75">Рейтинг:</span>
              <span className="font-semibold">{player1.rating}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm opacity-75">RD:</span>
              <span className="font-semibold">{player1.rd}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm opacity-75">Волатильность:</span>
              <span className="font-semibold">{(player1.volatility * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-lg ${
          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
        }`}>
          <h4 className="font-semibold mb-2">Игрок 2</h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm opacity-75">Рейтинг:</span>
              <span className="font-semibold">{player2.rating}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm opacity-75">RD:</span>
              <span className="font-semibold">{player2.rd}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm opacity-75">Волатильность:</span>
              <span className="font-semibold">{(player2.volatility * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rating Difference */}
      <div className={`p-4 rounded-lg mb-6 ${
        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm opacity-75">Разница в рейтинге:</span>
          <span className={`font-bold text-lg ${getRatingDifferenceColor(ratingDiff)}`}>
            {ratingDiff > 0 ? '+' : ''}{ratingDiff}
          </span>
        </div>
        <div className="text-sm opacity-75">
          {getRatingDifferenceText(ratingDiff)}
        </div>
      </div>

      {/* Prediction Results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`p-4 rounded-lg text-center ${
          theme === 'dark' ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50 border border-green-200'
        }`}>
          <div className="text-2xl font-bold text-green-500 mb-1">
            {prediction.winProbability}%
          </div>
          <div className="text-sm text-green-600">Шансы на победу</div>
          <div className="text-xs opacity-75 mt-1">
            +{prediction.ratingChangeWin} при победе
          </div>
        </div>

        <div className={`p-4 rounded-lg text-center ${
          theme === 'dark' ? 'bg-yellow-900/20 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="text-2xl font-bold text-yellow-500 mb-1">
            {prediction.drawProbability}%
          </div>
          <div className="text-sm text-yellow-600">Шансы на ничью</div>
          <div className="text-xs opacity-75 mt-1">
            {prediction.ratingChangeDraw > 0 ? '+' : ''}{prediction.ratingChangeDraw} при ничьей
          </div>
        </div>

        <div className={`p-4 rounded-lg text-center ${
          theme === 'dark' ? 'bg-red-900/20 border border-red-500/30' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="text-2xl font-bold text-red-500 mb-1">
            {prediction.lossProbability}%
          </div>
          <div className="text-sm text-red-600">Шансы на поражение</div>
          <div className="text-xs opacity-75 mt-1">
            {prediction.ratingChangeLoss} при поражении
          </div>
        </div>
      </div>

      {/* Confidence and Analysis */}
      <div className="space-y-4">
        <div className={`p-4 rounded-lg ${
          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Уверенность прогноза:</span>
            <span className={`font-bold ${getConfidenceColor(prediction.confidence)}`}>
              {getConfidenceText(prediction.confidence)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                prediction.confidence > 0.8 ? 'bg-green-500' : 
                prediction.confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${prediction.confidence * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <h4 className="font-semibold mb-2 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-green-500" />
              Преимущества
            </h4>
            <ul className="space-y-1 text-sm">
              {player1.rating > player2.rating && (
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Более высокий рейтинг</span>
                </li>
              )}
              {player1.rd < player2.rd && (
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Более стабильный рейтинг</span>
                </li>
              )}
              {player1.volatility < player2.volatility && (
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Меньшая волатильность</span>
                </li>
              )}
            </ul>
          </div>

          <div className={`p-4 rounded-lg ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <h4 className="font-semibold mb-2 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 text-orange-500" />
              Риски
            </h4>
            <ul className="space-y-1 text-sm">
              {player1.rd > 100 && (
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Высокая неопределенность рейтинга (RD &gt; 100)</span>
                </li>
              )}
              {player1.volatility > 0.08 && (
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Высокая волатильность (&gt; 8%)</span>
                </li>
              )}
              {ratingDiff < -50 && (
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Существенное отставание в рейтинге</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}