"use client";

import { motion } from "framer-motion";
import { HoverButton } from "@/components/ui/hover-button";

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

      {/* Checkered pattern */}
      <ChessboardPattern />

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
              <HoverButton>
                Начать обучение
              </HoverButton>
              <HoverButton>
                Узнать больше
              </HoverButton>
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
