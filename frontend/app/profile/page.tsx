"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { useTelegramWebApp } from "@/hooks/useTelegramWebApp"
import ChessBackground from "@/components/ChessBackground"
import { User, Edit, Link as LinkIcon, ArrowLeft } from "lucide-react"
import { useSearchParams } from "next/navigation"
import RatingDisplay from "@/components/rating/RatingDisplay"

// Success banner component that uses searchParams
function SuccessBanner() {
  const searchParams = useSearchParams()
  
  if (searchParams.get('saved') !== '1') {
    return null
  }
  
  return (
    <div className="mb-6 bg-green-600/80 border border-green-400 text-white rounded-lg p-4 text-center font-bold">
      Chess Ratings Verified Successfully
    </div>
  )
}

interface UserProfile {
  id: number
  telegram_id: number
  username?: string
  first_name: string
  last_name: string
  rating: number
  chesscom_url?: string
  lichess_url?: string
  bio?: string
  created_at: string
  updated_at: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { webApp, initData, isReady } = useTelegramWebApp()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isReady) return
    if (!initData) return

    async function fetchProfile() {
      try {
        console.log("Fetching profile with initData:", initData ? "present" : "missing")

        const response = await fetch("/api/profile", {
          headers: {
            Authorization: `Bearer ${initData}`,
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error("Profile fetch failed:", response.status, errorData)
          throw new Error(errorData.message || `HTTP ${response.status}`)
        }

        const data = await response.json()
        const userProfile = data.user

        console.log("Profile loaded:", userProfile)
        setProfile(userProfile)

        // Check if profile is incomplete (just created) - redirect to edit
        if (userProfile && isProfileIncomplete(userProfile)) {
          console.log("Profile incomplete, redirecting to edit...")
          router.push("/profile/edit")
        }
      } catch (err) {
        console.error("Error fetching profile:", err)
        setError(
          err instanceof Error
            ? `Не удалось загрузить профиль: ${err.message}`
            : "Не удалось загрузить профиль"
        )
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [initData, isReady, router])

  // Check if profile has only basic Telegram data (needs completion)
  function isProfileIncomplete(profile: UserProfile): boolean {
    return (
      !profile.chesscom_url &&
      !profile.lichess_url &&
      !profile.bio
    )
  }

  // Setup back button
  useEffect(() => {
    if (webApp?.BackButton) {
      webApp.BackButton.show()
      webApp.BackButton.onClick(() => router.push("/"))

      return () => {
        webApp.BackButton.hide()
      }
    }
  }, [webApp, router])

  if (loading) {
    return (
      <ChessBackground>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">Загрузка...</div>
        </div>
      </ChessBackground>
    )
  }

  if (error) {
    return (
      <ChessBackground>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-red-500 text-xl">{error}</div>
        </div>
      </ChessBackground>
    )
  }

  // Profile is always created automatically, so this should not happen
  if (!profile) {
    return (
      <ChessBackground>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">Создание профиля...</div>
        </div>
      </ChessBackground>
    )
  }

  return (
    <ChessBackground>
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.push("/")}
              className="bg-white text-black p-3 rounded-lg hover:bg-gray-200 transition-colors"
              aria-label="Назад в меню"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-4xl font-black text-white uppercase" style={{ fontFamily: 'Arial Black, sans-serif' }}>
              Профиль
            </h1>
            <button
              onClick={() => router.push("/profile/edit")}
              className="bg-white text-black p-3 rounded-lg hover:bg-gray-200 transition-colors"
              aria-label="Редактировать профиль"
            >
              <Edit className="w-6 h-6" />
            </button>
          </div>

          {/* Success Banner */}
          <Suspense fallback={null}>
            <SuccessBanner />
          </Suspense>

          {/* Profile Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 space-y-6">
            {/* User Info */}
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-4 rounded-full">
                <User className="w-12 h-12 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {profile.first_name} {profile.last_name}
                </h2>
                {profile.username && (
                  <p className="text-white/70">@{profile.username}</p>
                )}
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="pt-4 border-t border-white/20">
                <p className="text-white text-base leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {/* Glicko2 Rating Display */}
            <div className="pt-4 border-t border-white/20">
              <RatingDisplay 
                userId={profile.id} 
                showHistory={true} 
                showRank={true} 
              />
            </div>

            {/* Social Links */}
            {(profile.chesscom_url || profile.lichess_url) && (
              <div className="pt-4 border-t border-white/20">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  Ссылки
                </h3>
                <div className="space-y-3">
                  {profile.chesscom_url && (
                    <a
                      href={profile.chesscom_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-white hover:text-white/80 transition-colors"
                    >
                      <span className="font-semibold">Chess.com:</span>
                      <span className="underline break-all">{profile.chesscom_url}</span>
                    </a>
                  )}
                  {profile.lichess_url && (
                    <a
                      href={profile.lichess_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-white hover:text-white/80 transition-colors"
                    >
                      <span className="font-semibold">Lichess:</span>
                      <span className="underline break-all">{profile.lichess_url}</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ChessBackground>
  )
}
