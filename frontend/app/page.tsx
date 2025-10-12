"use client"

import { useRouter } from "next/navigation"
import ChessBackground from "@/components/ChessBackground";
import { HoverButton } from "@/components/ui/hover-button";
import { ShoppingBag, Calendar, GraduationCap, User } from "lucide-react";
import { useEffect } from "react"
import { useTelegramWebApp } from "@/hooks/useTelegramWebApp"

export default function Home() {
  const router = useRouter()
  const { webApp, initData, isReady } = useTelegramWebApp()

  // Автосохранение базовых данных пользователя при входе в мини‑приложение
  useEffect(() => {
    if (!isReady) return
    if (!initData) return

    const saveOnEnter = async () => {
      try {
        const response = await fetch("/api/profile", {
          headers: {
            Authorization: `Bearer ${initData}`,
          },
        })

        if (!response.ok) {
          // Не прерываем UX, просто логируем ошибку
          const err = await response.json().catch(() => ({}))
          console.error("Auto-save on enter failed:", response.status, err)
          return
        }

        const data = await response.json()
        console.log("Auto-saved user profile on enter:", data.user?.telegram_id)
      } catch (e) {
        console.error("Auto-save on enter error:", e)
      }
    }

    saveOnEnter()
  }, [isReady, initData])

  // Настройка MainButton «Мой профиль»
  useEffect(() => {
    if (!webApp) return

    webApp.MainButton.setText("Мой профиль")
    webApp.MainButton.show()
    webApp.MainButton.onClick(() => router.push("/profile"))

    return () => {
      webApp.MainButton.hide()
    }
  }, [webApp, router])

  return (
    <ChessBackground>

      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 text-center">
        <div className="flex flex-col gap-6 sm:gap-8 md:gap-10 items-center justify-center min-h-screen py-8">
          {/* Title */}
          <div className="flex flex-col items-center gap-2 mb-8">
            <h1 className="text-7xl xs:text-8xl sm:text-9xl md:text-[10rem] lg:text-[12rem] xl:text-[14rem] font-black tracking-tighter leading-none px-4">
              <span className="text-white uppercase" style={{ fontFamily: 'Arial Black, sans-serif', letterSpacing: '-0.05em' }}>
                REP
              </span>
            </h1>
            <h1 className="text-7xl xs:text-8xl sm:text-9xl md:text-[10rem] lg:text-[12rem] xl:text-[14rem] font-black tracking-tighter leading-none px-4">
              <span className="text-white uppercase" style={{ fontFamily: 'Arial Black, sans-serif', letterSpacing: '-0.05em' }}>
                CHESS
              </span>
            </h1>
          </div>

          {/* Buttons - optimized for mobile */}
          <div className="flex flex-col w-full max-w-xs sm:max-w-md md:max-w-2xl gap-4 px-4">
            <HoverButton
              className="flex items-center justify-center gap-3"
              disabled
            >
              <ShoppingBag className="w-7 h-7 text-white flex-shrink-0" />
              <span className="text-xl sm:text-2xl text-white font-black uppercase tracking-tight" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                Купить мерч
              </span>
            </HoverButton>

            <HoverButton
              className="flex items-center justify-center gap-3"
              onClick={() => router.push('/tournaments')}
            >
              <Calendar className="w-7 h-7 text-white flex-shrink-0" />
              <span className="text-xl sm:text-2xl text-white font-black uppercase tracking-tight" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                Расписание турниров
              </span>
            </HoverButton>

            <HoverButton
              className="flex items-center justify-center gap-3"
              disabled
            >
              <GraduationCap className="w-7 h-7 text-white flex-shrink-0" />
              <span className="text-xl sm:text-2xl text-white font-black uppercase tracking-tight" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                Запись на урок
              </span>
            </HoverButton>

            <HoverButton
              className="flex items-center justify-center gap-3"
              onClick={() => router.push('/profile')}
            >
              <User className="w-7 h-7 text-white flex-shrink-0" />
              <span className="text-xl sm:text-2xl text-white font-black uppercase tracking-tight" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                Мой профиль
              </span>
            </HoverButton>
          </div>
        </div>
      </div>
    </ChessBackground>
  );
}
