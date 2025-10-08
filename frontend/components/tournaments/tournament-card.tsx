"use client"

import { Calendar, Clock, MapPin, Users } from "lucide-react"
import { motion } from "framer-motion"

export interface Tournament {
  id: string
  title: string
  date: string
  time: string
  location: string
  participants?: number
  description?: string
}

interface TournamentCardProps {
  tournament: Tournament
  index: number
}

export function TournamentCard({ tournament, index }: TournamentCardProps) {
  const fadeUpVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number],
      },
    },
  }

  return (
    <motion.div
      variants={fadeUpVariant}
      initial="hidden"
      animate="visible"
      className="relative backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300"
    >
      {/* Header */}
      <h3 className="text-2xl font-bold text-white mb-4">{tournament.title}</h3>

      {/* Info Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-white/70">
          <Calendar className="w-5 h-5 text-emerald-400" />
          <span className="text-base">{tournament.date}</span>
        </div>

        <div className="flex items-center gap-3 text-white/70">
          <Clock className="w-5 h-5 text-amber-400" />
          <span className="text-base">{tournament.time}</span>
        </div>

        <div className="flex items-center gap-3 text-white/70">
          <MapPin className="w-5 h-5 text-blue-400" />
          <span className="text-base">{tournament.location}</span>
        </div>

        {tournament.participants && (
          <div className="flex items-center gap-3 text-white/70">
            <Users className="w-5 h-5 text-purple-400" />
            <span className="text-base">{tournament.participants} участников</span>
          </div>
        )}
      </div>

      {/* Description */}
      {tournament.description && (
        <p className="mt-4 text-white/60 text-sm leading-relaxed">
          {tournament.description}
        </p>
      )}

      {/* Gradient border effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-purple-500/20 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </motion.div>
  )
}
