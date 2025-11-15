/* eslint-disable no-console */
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('[verify-ratings] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function run() {
  console.log('[verify-ratings] Verifying rating system tables...')

  const tables = ['player_ratings', 'rating_history', 'player_rating_stats', 'rating_periods']
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1)
    if (error) {
      console.error(`  ✖ Table ${t}: ERROR:`, error.message)
    } else {
      console.log(`  ✔ Table ${t}: OK (${(data || []).length} sample rows)`) 
    }
  }

  const { data: leaderboard, error: leaderErr } = await supabase
    .from('rating_leaderboard')
    .select('*')
    .limit(5)
  if (leaderErr) {
    console.error('  ✖ View rating_leaderboard: ERROR:', leaderErr.message)
  } else {
    console.log(`  ✔ View rating_leaderboard: OK (${(leaderboard || []).length} rows)`) 
  }

  const { data: stats, error: statsErr } = await supabase
    .from('player_ratings')
    .select('count')
  if (statsErr) {
    console.error('  ✖ Count player_ratings: ERROR:', statsErr.message)
  } else {
    console.log('  ✔ player_ratings sample query OK')
  }

  console.log('[verify-ratings] Verification complete.')
}

run().catch((e) => {
  console.error('[verify-ratings] Failed:', e)
  process.exit(1)
})

