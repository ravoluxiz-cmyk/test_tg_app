"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { HoverButton } from "./hover-button"

interface BackButtonProps {
  href?: string
  label?: string
  className?: string
}

export function BackButton({ href, label = "Назад", className }: BackButtonProps) {
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
      className={`flex items-center gap-2 w-fit text-white ${className}`}
    >
      <ArrowLeft className="w-5 h-5 text-white" />
      <span className="text-white">{label}</span>
    </HoverButton>
  )
}
