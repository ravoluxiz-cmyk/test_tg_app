"use client"

import * as React from "react"
import { useState } from "react"

export interface CheckerboardButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode
  size?: "sm" | "md" | "lg"
  className?: string
}

export const CheckerboardButton = ({
  children = "Hover Me",
  size = "md",
  className = "",
  ...props
}: CheckerboardButtonProps) => {
  const [isHovered, setIsHovered] = useState(false)

  const sizeStyles = {
    sm: "text-xs px-4 py-2 rounded-md",
    md: "text-sm px-6 py-3 rounded-lg",
    lg: "text-base px-8 py-4 rounded-xl"
  }

  const sizeStyle = sizeStyles[size]

  return (
    <button
      className={`
        relative font-medium select-none
        inline-flex items-center justify-center transition-all duration-300
        bg-black text-white border border-white border-opacity-20
        ${sizeStyle} ${className}
        overflow-hidden
        hover:scale-105
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {/* Checkerboard background with darker gray instead of white */}
      <span
        className={`
          absolute inset-0 transition-opacity duration-300
          ${isHovered ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          backgroundImage: `
            repeating-conic-gradient(
              #1a1a1a 0% 25%,
              #404040 0% 50%
            )`,
          backgroundPosition: '0 0, 10px 10px',
          backgroundSize: '20px 20px'
        }}
      />

      {/* Text with high contrast */}
      <span className="relative z-10 text-white font-semibold">
        {children}
      </span>
    </button>
  )
}

export default CheckerboardButton
