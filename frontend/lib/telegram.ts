import crypto from "crypto"

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

/**
 * Validates Telegram Web App initData
 * @param initData - The initData string from Telegram Web App
 * @param botToken - Your Telegram bot token
 * @returns Parsed user data if valid, null if invalid
 */
export function validateTelegramWebAppData(
  initData: string,
  botToken: string
): TelegramUser | null {
  try {
    // Parse the initData string
    const urlParams = new URLSearchParams(initData)
    const hash = urlParams.get("hash")
    const userParam = urlParams.get("user")

    if (!hash || !userParam) {
      return null
    }

    // Remove hash from params for validation
    urlParams.delete("hash")

    // Sort params alphabetically and create data check string
    const dataCheckArr: string[] = []
    urlParams.forEach((value, key) => {
      dataCheckArr.push(`${key}=${value}`)
    })
    dataCheckArr.sort()
    const dataCheckString = dataCheckArr.join("\n")

    // Create secret key
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest()

    // Calculate hash
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex")

    // Verify hash
    if (calculatedHash !== hash) {
      console.error("Telegram WebApp data validation failed: hash mismatch")
      return null
    }

    // Parse user data
    const user: TelegramUser = JSON.parse(userParam)

    // Check if auth_date is not too old (e.g., within 24 hours)
    const authDate = urlParams.get("auth_date")
    if (authDate) {
      const authTimestamp = parseInt(authDate, 10)
      const currentTimestamp = Math.floor(Date.now() / 1000)
      const timeDiff = currentTimestamp - authTimestamp

      // Allow 24 hours
      if (timeDiff > 86400) {
        console.error("Telegram WebApp data validation failed: auth_date too old")
        return null
      }
    }

    return user
  } catch (error) {
    console.error("Error validating Telegram WebApp data:", error)
    return null
  }
}

/**
 * Validates Telegram Web App initData (simplified for development)
 * In development, you can skip validation if needed
 */
export function parseTelegramWebAppData(initData: string): TelegramUser | null {
  try {
    const urlParams = new URLSearchParams(initData)
    const userParam = urlParams.get("user")

    if (!userParam) {
      return null
    }

    const user: TelegramUser = JSON.parse(userParam)
    return user
  } catch (error) {
    console.error("Error parsing Telegram WebApp data:", error)
    return null
  }
}

/**
 * Get Telegram user from request headers
 * Expects initData to be passed in Authorization header
 */
export function getTelegramUserFromHeaders(
  headers: Headers
): TelegramUser | null {
  const authHeader = headers.get("authorization")
  if (!authHeader) {
    console.error("No authorization header found")
    return null
  }

  // Extract initData from "Bearer <initData>" format
  const initData = authHeader.replace("Bearer ", "")

  if (!initData || initData === "Bearer") {
    console.error("initData is empty")
    return null
  }
  console.log("Processing Telegram auth, NODE_ENV:", process.env.NODE_ENV)

  // In production, use full validation
  if (process.env.NODE_ENV === "production") {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      console.error("TELEGRAM_BOT_TOKEN not configured")
      return null
    }

    const user = validateTelegramWebAppData(initData, botToken)
    if (!user) {
      console.error("Failed to validate Telegram data in production")
    }
    return user
  }

  // In development, allow simplified parsing
  const user = parseTelegramWebAppData(initData)
  if (!user) {
    console.error("Failed to parse Telegram data in development")
  } else {
    console.log("Successfully parsed Telegram user:", user.id, user.first_name)
  }
  return user
}

/**
 * Check if Telegram user is an admin based on ADMIN_TELEGRAM_ID
 * ADMIN_TELEGRAM_ID can be:
 * - a numeric Telegram user ID (e.g. 123456789)
 * - a Telegram username prefixed with @ (e.g. @dprilepsky)
 * - a comma-separated list of the above
 */
export function isAdmin(user: TelegramUser | null): boolean {
  if (!user) return false
  const raw = (process.env.ADMIN_TELEGRAM_ID || "").trim()
  if (!raw) return false

  const entries = raw.split(",").map((s) => s.trim()).filter(Boolean)
  const username = (user.username || "").toLowerCase()

  return entries.some((entry) => {
    if (!entry) return false
    if (entry.startsWith("@")) {
      const target = entry.slice(1).toLowerCase()
      return username === target
    }
    const idNum = Number(entry)
    return Number.isFinite(idNum) && idNum === user.id
  })
}

/**
 * Require admin from request headers. Returns user if admin, otherwise null.
 */
export function requireAdmin(headers: Headers): TelegramUser | null {
  const user = getTelegramUserFromHeaders(headers)
  if (!user) return null
  return isAdmin(user) ? user : null
}
