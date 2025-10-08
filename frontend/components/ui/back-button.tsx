"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { HoverButton } from "./hover-button"

interface BackButtonProps {
  href?: string
  label?: string
  className?: string
}

export function BackButton({ href = "/", label = "Назад", className }: BackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (href) {
      router.push(href)
    } else {
      router.back()
    }
  }

  return (
    <HoverButton
      onClick={handleClick}
      className={`flex items-center gap-2 ${className}`}
    >
      <ArrowLeft className="w-5 h-5" />
      <span>{label}</span>
    </HoverButton>
  )
}
