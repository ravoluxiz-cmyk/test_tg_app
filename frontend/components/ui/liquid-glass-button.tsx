"use client"

import * as React from "react"

export interface LiquidGlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode
  className?: string
}

export const LiquidGlassButton = ({
  children,
  className = "",
  ...props
}: LiquidGlassButtonProps) => {
  return (
    <button
      className={`
        relative group
        px-8 py-4 rounded-2xl
        font-semibold text-base sm:text-lg
        text-white
        overflow-hidden
        transition-all duration-300
        ${className}
      `}
      {...props}
    >
      {/* Glass background with blur */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-md rounded-2xl" />

      {/* Gradient border effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-white/5 to-transparent" />

      {/* Liquid shine effect on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 group-hover:animate-shimmer" />
      </div>

      {/* Inner glow */}
      <div className="absolute inset-[1px] rounded-2xl bg-gradient-to-br from-white/5 to-transparent" />

      {/* Glossy top highlight */}
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-2xl" />

      {/* Content */}
      <span className="relative z-10 drop-shadow-lg">
        {children}
      </span>
    </button>
  )
}

export default LiquidGlassButton
