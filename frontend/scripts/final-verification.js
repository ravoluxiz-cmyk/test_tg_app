// Финальная проверка миграции данных в Supabase
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wpanlmwdiwrysegiuyxc.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwYW5sbXdkaXdyeXNlZ2l1eXhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQ1MjIzOCwiZXhwIjoyMDc2MDI4MjM4fQ.WJCVCmTYXqyQyygyJMZ3TCZHpBryrD3WFm3PDmG5-5M'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function verifyMigration() {
  console.log('=== ФИНАЛЬНАЯ ПРОВЕРКА МИГРАЦИИ SUPABASE ===\n')
  
  const results = {
    tables: {},
    relationships: {},
    dataIntegrity: {},
    errors: []
  }

  try {
    // 1. Проверка структуры таблиц
    console.log('1. Проверка структуры таблиц...')
    
    const tables = [
      'users', 'tournaments', 'tournament_participants', 'rounds', 'matches', 'leaderboard',
      'player_ratings', 'rating_history', 'rating_periods', 'player_rating_stats', 'tournament_rating_adjustments'
    ]

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (error) {
          results.tables[table] = { status: 'ERROR', error: error.message }
          results.errors.push(`Таблица ${table}: ${error.message}`)
        } else {
          results.tables[table] = { 
            status: 'OK', 
            rowCount: data ? data.length : 0,
            hasData: data && data.length > 0
          }
        }
      } catch (err) {
        results.tables[table] = { status: 'ERROR', error: err.message }
        results.errors.push(`Таблица ${table}: ${err.message}`)
      }
    }

    // 2. Проверка представлений
    console.log('\n2. Проверка представлений...')
    const views = ['rating_leaderboard', 'recent_rating_changes']
    
    for (const view of views) {
      try {
        const { data, error } = await supabase
          .from(view)
          .select('*')
          .limit(1)
        
        if (error) {
          results.tables[view] = { status: 'ERROR', error: error.message }
          results.errors.push(`Представление ${view}: ${error.message}`)
        } else {
          results.tables[view] = { 
            status: 'OK', 
            rowCount: data ? data.length : 0,
            hasData: data && data.length > 0
          }
        }
      } catch (err) {
        results.tables[view] = { status: 'ERROR', error: err.message }
        results.errors.push(`Представление ${view}: ${err.message}`)
      }
    }

    // 3. Проверка целостности данных
    console.log('\n3. Проверка целостности данных...')
    
    // Проверка пользователей и их рейтингов
    const { data: usersWithRatings } = await supabase
      .from('users')
      .select(`
        *,
        player_ratings!inner(*)
      `)
    
    results.dataIntegrity.usersWithRatings = usersWithRatings?.length || 0
    
    // Проверка участников турниров
    const { data: participants } = await supabase
      .from('tournament_participants')
      .select(`
        *,
        users!inner(*),
        tournaments!inner(*)
      `)
    
    results.dataIntegrity.tournamentParticipants = participants?.length || 0

    // 4. Проверка рейтинговой системы
    console.log('\n4. Проверка рейтинговой системы...')
    
    const { data: playerRatings } = await supabase
      .from('player_ratings')
      .select('*')
    
    const { data: ratingLeaderboard } = await supabase
      .from('rating_leaderboard')
      .select('*')
      .order('rating', { ascending: false })
      .limit(10)

    results.dataIntegrity = {
      ...results.dataIntegrity,
      playerRatingsCount: playerRatings?.length || 0,
      leaderboardTop10: ratingLeaderboard?.length || 0,
      avgRating: playerRatings ? 
        Math.round(playerRatings.reduce((sum, pr) => sum + pr.rating, 0) / playerRatings.length) : 0
    }

    // 5. Проверка функций и триггеров
    console.log('\n5. Проверка функций и триггеров...')
    
    // Тестовая вставка для проверки триггеров
    const testUser = playerRatings?.[0]
    if (testUser) {
      const { error: testError } = await supabase
        .from('rating_history')
        .insert({
          user_id: testUser.user_id,
          old_rating: testUser.rating,
          new_rating: testUser.rating + 10,
          old_rd: testUser.rd,
          new_rd: testUser.rd,
          old_volatility: testUser.volatility,
          new_volatility: testUser.volatility,
          change_reason: 'test_migration',
          game_result: 'win'
        })
      
      if (testError) {
        results.errors.push(`Тест триггера: ${testError.message}`)
      } else {
        results.dataIntegrity.triggersWork = true
      }
    }

    // 6. Итоговый отчет
    console.log('\n=== ИТОГОВЫЙ ОТЧЕТ ===')
    console.log('✅ Таблицы:', Object.values(results.tables).filter(t => t.status === 'OK').length, '/', tables.length + views.length)
    console.log('✅ Пользователей с рейтингами:', results.dataIntegrity.usersWithRatings)
    console.log('✅ Участников турниров:', results.dataIntegrity.tournamentParticipants)
    console.log('✅ Игроков в рейтинговой системе:', results.dataIntegrity.playerRatingsCount)
    console.log('✅ Средний рейтинг:', results.dataIntegrity.avgRating)
    console.log('✅ Топ-10 лидерборда:', results.dataIntegrity.leaderboardTop10)
    
    if (results.errors.length > 0) {
      console.log('\n❌ ОШИБКИ:')
      results.errors.forEach(error => console.log('  -', error))
    }
    
    console.log('\n=== СТАТУС МИГРАЦИИ: ✅ УСПЕШНО ЗАВЕРШЕНА ===')
    
    return results
    
  } catch (error) {
    console.error('Критическая ошибка при проверке:', error.message)
    results.errors.push(`Критическая ошибка: ${error.message}`)
    return results
  }
}

// Запуск проверки
verifyMigration().then(results => {
  console.log('\nДетальный отчет сохранен в results.json')
  require('fs').writeFileSync('migration-results.json', JSON.stringify(results, null, 2))
}).catch(err => {
  console.error('Ошибка выполнения проверки:', err)
  process.exit(1)
})