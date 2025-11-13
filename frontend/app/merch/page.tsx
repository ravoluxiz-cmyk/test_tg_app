"use client"

import ChessBackground from "@/components/ChessBackground"
import { HoverButton } from "@/components/ui/hover-button"
import { useRouter } from "next/navigation"

export default function MerchPage() {
  const router = useRouter()
  return (
    <ChessBackground>
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 md:px-8 text-center">
        <div className="flex flex-col gap-6 items-center justify-center min-h-screen py-8">
          <h2 className="text-3xl sm:text-4xl font-black text-white">Мерч</h2>
          <p className="text-white/90 text-xl font-bold">Chess Masterpiece Unlocked</p>
          <p className="text-white/80 text-lg">Скоро тут появится магазин нашего мерча. Следите за обновлениями!</p>
          <HoverButton onClick={() => router.push('/')}>На главную</HoverButton>
        </div>
      </div>
    </ChessBackground>
  )
}