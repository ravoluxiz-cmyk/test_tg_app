"use client"

import { useEffect, useState } from "react"

interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
      photo_url?: string
    }
  }
  ready: () => void
  close: () => void
  expand: () => void
  BackButton: {
    show: () => void
    hide: () => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
  }
  MainButton: {
    text: string
    color: string
    textColor: string
    isVisible: boolean
    isActive: boolean
    isProgressVisible: boolean
    show: () => void
    hide: () => void
    enable: () => void
    disable: () => void
    showProgress: (leaveActive?: boolean) => void
    hideProgress: () => void
    setText: (text: string) => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
  }
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

export function useTelegramWebApp() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Check if Telegram WebApp is available
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      setWebApp(tg)

      // Notify Telegram that the app is ready
      tg.ready()

      // Expand to full height
      tg.expand()

      console.log("Telegram WebApp initialized")
      console.log("initData available:", !!tg.initData)
      console.log("User:", tg.initDataUnsafe?.user)

      setIsReady(true)
    } else {
      // For development/testing outside Telegram
      console.warn("Telegram WebApp is not available - using mock data for development")
      setIsReady(true)
    }
  }, [])

  // For development: create mock initData if not available
  const getMockInitData = () => {
    if (webApp?.initData) return webApp.initData

    // Create mock data for development
    const mockUser = {
      id: 123456789,
      first_name: "Test",
      last_name: "User",
      username: "testuser",
    }

    const userJson = JSON.stringify(mockUser)
    const mockInitData = `user=${encodeURIComponent(userJson)}&auth_date=${Math.floor(Date.now() / 1000)}&hash=mock_hash_for_development`

    console.log("Using mock initData for development")
    return mockInitData
  }

  return {
    webApp,
    isReady,
    user: webApp?.initDataUnsafe?.user,
    initData: process.env.NODE_ENV === "development" ? getMockInitData() : (webApp?.initData || ""),
  }
}