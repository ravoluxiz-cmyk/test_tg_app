"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Chess piece SVG components
function ChessPiece({
  type,
  className,
  delay = 0,
}: {
  type: "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";
  className?: string;
  delay?: number;
}) {
  const pieces = {
    king: "M 50 10 L 45 20 L 40 20 L 40 25 L 35 25 L 35 30 L 30 35 L 30 80 L 70 80 L 70 35 L 65 30 L 65 25 L 60 25 L 60 20 L 55 20 L 50 10 Z M 45 15 L 55 15 L 50 5 Z",
    queen: "M 50 15 L 45 25 L 40 25 L 35 30 L 30 35 L 30 80 L 70 80 L 70 35 L 65 30 L 60 25 L 55 25 L 50 15 Z M 50 10 A 3 3 0 1 1 50 10.01 Z",
    rook: "M 35 20 L 35 30 L 30 35 L 30 80 L 70 80 L 70 35 L 65 30 L 65 20 L 60 20 L 60 25 L 55 25 L 55 20 L 45 20 L 45 25 L 40 25 L 40 20 Z",
    bishop: "M 50 10 L 45 20 L 40 30 L 35 40 L 30 80 L 70 80 L 65 40 L 60 30 L 55 20 L 50 10 Z M 50 15 A 3 3 0 1 1 50 15.01 Z",
    knight: "M 35 80 L 65 80 L 65 50 L 60 45 L 60 35 L 55 30 L 50 25 L 45 25 L 40 30 L 35 35 L 30 45 L 30 50 Z M 55 20 L 60 25 L 55 30 Z",
    pawn: "M 50 20 A 5 5 0 1 1 50 20.01 M 45 25 L 40 35 L 35 45 L 30 80 L 70 80 L 65 45 L 60 35 L 55 25 Z",
  };

  return (
    <motion.div
      initial={{ y: 0, rotate: 0 }}
      className={cn("absolute opacity-15", className)}
    >
      <motion.div
        animate={{
          y: [0, 20, 0],
          rotate: [0, 5, 0],
        }}
        transition={{
          duration: 15,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      >
        <svg
          width="100"
          height="100"
          viewBox="0 0 100 100"
          className="fill-white/20 stroke-white/30 stroke-[1.5]"
        >
          <path d={pieces[type]} />
        </svg>
      </motion.div>
    </motion.div>
  );
}

// Checkered pattern background
function ChessboardPattern() {
  return (
    <div className="absolute inset-0 opacity-10">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="chessboard"
            x="0"
            y="0"
            width="80"
            height="80"
            patternUnits="userSpaceOnUse"
          >
            <rect x="0" y="0" width="40" height="40" fill="#ffffff" />
            <rect x="40" y="0" width="40" height="40" fill="transparent" />
            <rect x="0" y="40" width="40" height="40" fill="transparent" />
            <rect x="40" y="40" width="40" height="40" fill="#ffffff" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#chessboard)" />
      </svg>
    </div>
  );
}

// Floating chess squares
function FloatingSquare({
  delay = 0,
  size = 60,
  className,
}: {
  delay?: number;
  size?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ scale: 1 }}
      className="opacity-100"
      transition={{
        duration: 1.5,
        delay,
        ease: "easeOut",
      }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={{
          y: [0, -30, 0],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 20,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
        style={{ width: size, height: size }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent border border-white/20 backdrop-blur-sm" />
        <div className="absolute inset-[2px] bg-gradient-to-tl from-white/5 to-transparent" />
      </motion.div>
    </motion.div>
  );
}

export default function ChessBackground({
  badge = "Обучающая платформа",
  title1 = "Освойте",
  title2 = "Новые Навыки",
  description = "Каждый урок приближает вас к мастерству. Начните свой путь к знаниям уже сегодня.",
  children,
}: {
  badge?: string;
  title1?: string;
  title2?: string;
  description?: string;
  children?: React.ReactNode;
}) {
  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 0.5 + i * 0.2,
        ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number],
      },
    }),
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] via-transparent to-amber-500/[0.03] blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-tl from-blue-500/[0.02] via-transparent to-purple-500/[0.02] blur-3xl" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 md:px-6">
        {children ? (
          children
        ) : (
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              custom={0}
              variants={fadeUpVariants}
              initial="hidden"
              animate="visible"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.15] mb-8 md:mb-12 backdrop-blur-sm"
            >
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-400 to-amber-400" />
              <span className="text-sm text-white/70 tracking-wide font-medium">
                {badge}
              </span>
            </motion.div>

            <motion.div
              custom={1}
              variants={fadeUpVariants}
              initial="hidden"
              animate="visible"
            >
              <h1 className="text-5xl sm:text-6xl md:text-8xl font-bold mb-6 md:mb-8 tracking-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white/90 to-white/70">
                  {title1}
                </span>
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-white to-amber-300">
                  {title2}
                </span>
              </h1>
            </motion.div>

            <motion.div
              custom={2}
              variants={fadeUpVariants}
              initial="hidden"
              animate="visible"
            >
              <p className="text-base sm:text-lg md:text-xl text-white/50 mb-10 leading-relaxed font-light tracking-wide max-w-2xl mx-auto px-4">
                {description}
              </p>
            </motion.div>

            <motion.div
              custom={3}
              variants={fadeUpVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 rounded-full bg-gradient-to-r from-emerald-500 to-amber-500 text-white font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Начать обучение
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 rounded-full bg-white/[0.05] border border-white/20 text-white font-medium text-sm backdrop-blur-sm hover:bg-white/[0.1] transition-all duration-300"
              >
                Узнать больше
              </motion.button>
            </motion.div>
          </div>
        )}
      </div>

      {/* Vignette effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/80 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/50 via-transparent to-slate-950/50 pointer-events-none" />
    </div>
  );
}
