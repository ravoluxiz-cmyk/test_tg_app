import { NextRequest, NextResponse } from "next/server"
import { getTelegramUserFromHeaders } from "@/lib/telegram"
import {
  getUserByTelegramId,
  createUser,
  updateUserProfile,
  type UserProfileData,
} from "@/lib/db"

// GET /api/profile - Get user profile (auto-creates if not exists)
export async function GET(request: NextRequest) {
  try {
    // Get Telegram user from headers
    const telegramUser = getTelegramUserFromHeaders(request.headers)

    if (!telegramUser) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid Telegram authentication" },
        { status: 401 }
      )
    }

    // Get user from database
    let user = getUserByTelegramId(telegramUser.id)

    if (!user) {
      // Auto-create profile with Telegram data
      console.log(`Auto-creating profile for Telegram user ${telegramUser.id}`)
      user = createUser({
        telegram_id: telegramUser.id,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name || "",
        fide_rating: null,
        chesscom_rating: null,
        lichess_rating: null,
        chesscom_url: null,
        lichess_url: null,
        bio: null,
      })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/profile - Create user profile
export async function POST(request: NextRequest) {
  try {
    // Get Telegram user from headers
    const telegramUser = getTelegramUserFromHeaders(request.headers)

    if (!telegramUser) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid Telegram authentication" },
        { status: 401 }
      )
    }

    // Check if user already exists
    const existingUser = getUserByTelegramId(telegramUser.id)
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      first_name,
      last_name,
      fide_rating,
      chesscom_rating,
      lichess_rating,
      chesscom_url,
      lichess_url,
      bio,
    } = body

    // Validate required fields
    if (!first_name || !last_name) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      )
    }

    // Create user
    const newUser = createUser({
      telegram_id: telegramUser.id,
      username: telegramUser.username,
      first_name,
      last_name,
      fide_rating: fide_rating || null,
      chesscom_rating: chesscom_rating || null,
      lichess_rating: lichess_rating || null,
      chesscom_url: chesscom_url || null,
      lichess_url: lichess_url || null,
      bio: bio || null,
    })

    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (error) {
    console.error("Error creating user profile:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    // Get Telegram user from headers
    const telegramUser = getTelegramUserFromHeaders(request.headers)

    if (!telegramUser) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid Telegram authentication" },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      first_name,
      last_name,
      fide_rating,
      chesscom_rating,
      lichess_rating,
      chesscom_url,
      lichess_url,
      bio,
    } = body

    // Validate required fields
    if (!first_name || !last_name) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      )
    }

    // Update user profile
    const profileData: UserProfileData = {
      first_name,
      last_name,
      fide_rating: fide_rating || null,
      chesscom_rating: chesscom_rating || null,
      lichess_rating: lichess_rating || null,
      chesscom_url: chesscom_url || null,
      lichess_url: lichess_url || null,
      bio: bio || null,
    }

    const updated = updateUserProfile(telegramUser.id, profileData)

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get updated user
    const updatedUser = getUserByTelegramId(telegramUser.id)

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error("Error updating user profile:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
