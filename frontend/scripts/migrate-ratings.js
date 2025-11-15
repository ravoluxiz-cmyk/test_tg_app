/* eslint-disable no-console */
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('[migrate-ratings] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

function initialFromUser(u) {
  if (u.fide_rating) return { rating: u.fide_rating, rd: 100, volatility: 0.06 }
  if (u.chesscom_rating) return { rating: u.chesscom_rating, rd: 150, volatility: 0.06 }
  if (u.lichess_rating) return { rating: u.lichess_rating, rd: 150, volatility: 0.06 }
  return { rating: 1500, rd: 350, volatility: 0.06 }
}

async function run() {
  console.log('[migrate-ratings] Starting backfill...')

  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, first_name, last_name, username, fide_rating, chesscom_rating, lichess_rating')
  if (usersErr) throw usersErr

  let created = 0
  let skipped = 0

  for (const u of users || []) {
    const { data: existing, error: existsErr } = await supabase
      .from('player_ratings')
      .select('id')
      .eq('user_id', u.id)
      .single()

    if (existsErr && existsErr.code !== 'PGRST116') throw existsErr
    if (existing) { skipped++; continue }

    const init = initialFromUser(u)
    const { error: insertErr } = await supabase
      .from('player_ratings')
      .insert({
        user_id: u.id,
        rating: init.rating,
        rd: init.rd,
        volatility: init.volatility,
        games_count: 0,
        wins_count: 0,
        losses_count: 0,
        draws_count: 0,
        rating_period_start: new Date().toISOString()
      })
    if (insertErr) throw insertErr
    created++
  }

  console.log(`[migrate-ratings] Done. Created: ${created}, Skipped (already exists): ${skipped}`)
}

run().catch((e) => {
  console.error('[migrate-ratings] Failed:', e)
  process.exit(1)
})

