/**
 * Скрипт миграции рейтинговой системы пользователей
 * Выполняет унификацию полей рейтинга в таблице users
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Отсутствуют переменные окружения NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

class RatingMigration {
  constructor() {
    this.backup = null
    this.results = {
      startTime: new Date(),
      steps: [],
      errors: [],
      warnings: []
    }
  }

  logStep(step, status, details = '') {
    const timestamp = new Date().toISOString()
    const entry = { timestamp, step, status, details }
    this.results.steps.push(entry)
    console.log(`[${timestamp}] ${step}: ${status} ${details}`)
  }

  logError(error, context) {
    const entry = { timestamp: new Date().toISOString(), error: error.message, context }
    this.results.errors.push(entry)
    console.error(`❌ Ошибка в ${context}:`, error.message)
  }

  logWarning(warning, context) {
    const entry = { timestamp: new Date().toISOString(), warning, context }
    this.results.warnings.push(entry)
    console.warn(`⚠️  Предупреждение в ${context}:`, warning)
  }

  async createBackup() {
    this.logStep('Создание резервной копии', 'Начало')
    
    try {
      // Создаем бэкап текущих данных
      const { data, error } = await supabase
        .from('users')
        .select('id, fide_rating, chesscom_rating, lichess_rating')
        .not('fide_rating', 'is', null)
        .or('chesscom_rating.not.is.null,lichess_rating.not.is.null')

      if (error) throw error

      this.backup = data || []
      this.logStep('Создание резервной копии', 'Успех', `Сохранено ${this.backup.length} записей с рейтингами`)
      
      // Сохраняем бэкап в файл
      const fs = require('fs')
      const backupFile = `rating-backup-${Date.now()}.json`
      fs.writeFileSync(backupFile, JSON.stringify(this.backup, null, 2))
      this.logStep('Сохранение резервной копии', 'Успех', `Файл: ${backupFile}`)
      
    } catch (error) {
      this.logError(error, 'createBackup')
      throw error
    }
  }

  async validateCurrentState() {
    this.logStep('Валидация текущего состояния', 'Начало')
    
    try {
      // Проверяем структуру таблицы
      const { data, error } = await supabase
        .rpc('get_table_structure', { table_name: 'users' })

      if (error) {
        // Если функция не существует, проверяем через information_schema
        const { data: columns, error: colError } = await supabase
          .rpc('get_columns', { 
            sql: `
              SELECT column_name, data_type, is_nullable, column_default
              FROM information_schema.columns 
              WHERE table_name = 'users' 
              AND table_schema = 'public'
              AND column_name IN ('fide_rating', 'chesscom_rating', 'lichess_rating', 'rating')
              ORDER BY ordinal_position
            `
          })

        if (colError) throw colError

        const hasOldColumns = columns.some(col => 
          ['fide_rating', 'chesscom_rating', 'lichess_rating'].includes(col.column_name)
        )
        const hasNewColumn = columns.some(col => col.column_name === 'rating')

        this.logStep('Валидация структуры', 'Успех', 
          `Старые поля: ${hasOldColumns ? 'найдены' : 'отсутствуют'}, Новое поле: ${hasNewColumn ? 'найдено' : 'отсутствует'}`)
        
        return { hasOldColumns, hasNewColumn }
      }

    } catch (error) {
      this.logError(error, 'validateCurrentState')
      throw error
    }
  }

  async analyzeRatingDistribution() {
    this.logStep('Анализ распределения рейтингов', 'Начало')
    
    try {
      // Получаем текущие рейтинги
      const { data, error } = await supabase
        .from('users')
        .select('id, fide_rating, chesscom_rating, lichess_rating, rating')

      if (error) throw error

      const stats = {
        total: data.length,
        hasFide: data.filter(u => u.fide_rating !== null).length,
        hasChesscom: data.filter(u => u.chesscom_rating !== null).length,
        hasLichess: data.filter(u => u.lichess_rating !== null).length,
        hasNewRating: data.filter(u => u.rating !== null && u.rating !== 800).length,
        fideRange: { min: null, max: null },
        chesscomRange: { min: null, max: null },
        lichessRange: { min: null, max: null }
      }

      // Вычисляем диапазоны
      const fideRatings = data.filter(u => u.fide_rating !== null).map(u => u.fide_rating)
      const chesscomRatings = data.filter(u => u.chesscom_rating !== null).map(u => u.chesscom_rating)
      const lichessRatings = data.filter(u => u.lichess_rating !== null).map(u => u.lichess_rating)

      if (fideRatings.length > 0) {
        stats.fideRange = { min: Math.min(...fideRatings), max: Math.max(...fideRatings) }
      }
      if (chesscomRatings.length > 0) {
        stats.chesscomRange = { min: Math.min(...chesscomRatings), max: Math.max(...chesscomRatings) }
      }
      if (lichessRatings.length > 0) {
        stats.lichessRange = { min: Math.min(...lichessRatings), max: Math.max(...lichessRatings) }
      }

      this.logStep('Анализ распределения', 'Успех', 
        `Всего: ${stats.total}, FIDE: ${stats.hasFide}, Chess.com: ${stats.hasChesscom}, Lichess: ${stats.hasLichess}`)
      
      return stats
      
    } catch (error) {
      this.logError(error, 'analyzeRatingDistribution')
      throw error
    }
  }

  async performMigration() {
    this.logStep('Выполнение миграции', 'Начало')
    
    try {
      // Выполняем миграцию поэтапно
      const steps = [
        // Шаг 1: Добавляем новое поле rating если его нет
        `
          ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS rating INTEGER NOT NULL DEFAULT 800 
          CHECK (rating BETWEEN 100 AND 3000);
        `,
        
        // Шаг 2: Мигрируем данные из старых полей
        `
          UPDATE users 
          SET rating = COALESCE(
              fide_rating,
              chesscom_rating, 
              lichess_rating,
              800
          )
          WHERE rating = 800 OR rating IS NULL;
        `,
        
        // Шаг 3: Обновляем представление rating_leaderboard
        `
          CREATE OR REPLACE VIEW rating_leaderboard AS
          SELECT 
              u.id,
              u.username,
              u.first_name,
              u.last_name,
              COALESCE(pr.rating, u.rating) as rating,
              pr.rd,
              pr.volatility,
              pr.games_count,
              pr.wins_count,
              pr.losses_count,
              pr.draws_count,
              pr.last_game_at,
              prs.highest_rating,
              prs.lowest_rating,
              CASE 
                  WHEN pr.games_count > 0 THEN 
                      ROUND((pr.wins_count::NUMERIC / pr.games_count) * 100, 2)
                  ELSE 0::NUMERIC
              END as win_rate,
              RANK() OVER (ORDER BY COALESCE(pr.rating, u.rating) DESC) as global_rank
          FROM users u
          LEFT JOIN player_ratings pr ON u.id = pr.user_id
          LEFT JOIN player_rating_stats prs ON u.id = prs.user_id
          WHERE COALESCE(pr.games_count, 0) > 0 OR u.rating >= 800
          ORDER BY COALESCE(pr.rating, u.rating) DESC;
        `,
        
        // Шаг 4: Удаляем старые поля
        `
          ALTER TABLE users 
          DROP COLUMN IF EXISTS fide_rating,
          DROP COLUMN IF EXISTS chesscom_rating,
          DROP COLUMN IF EXISTS lichess_rating;
        `,
        
        // Шаг 5: Создаем индексы
        `
          CREATE INDEX IF NOT EXISTS idx_users_rating ON users(rating DESC);
          CREATE INDEX IF NOT EXISTS idx_users_rating_range ON users(rating) WHERE rating BETWEEN 100 AND 3000;
        `
      ]

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]
        this.logStep(`Выполнение шага ${i + 1}`, 'Процесс')
        
        const { error } = await supabase.rpc('execute_sql', { sql: step })
        if (error) {
          // Если RPC не работает, выполняем напрямую
          const { error: directError } = await supabase.rpc('direct_execute', { sql: step })
          if (directError) throw directError
        }
        
        this.logStep(`Выполнение шага ${i + 1}`, 'Успех')
      }

      this.logStep('Выполнение миграции', 'Успех', 'Все шаги выполнены')
      
    } catch (error) {
      this.logError(error, 'performMigration')
      throw error
    }
  }

  async validateMigrationResults() {
    this.logStep('Валидация результатов миграции', 'Начало')
    
    try {
      // Проверяем структуру после миграции
      const { data: users, error } = await supabase
        .from('users')
        .select('id, rating')
        .limit(10)

      if (error) throw error

      // Проверяем диапазон рейтингов
      const { data: stats } = await supabase
        .rpc('get_rating_stats', {
          sql: `
            SELECT 
              COUNT(*) as total_users,
              COUNT(CASE WHEN rating BETWEEN 100 AND 3000 THEN 1 END) as valid_ratings,
              MIN(rating) as min_rating,
              MAX(rating) as max_rating,
              AVG(rating) as avg_rating
            FROM users
          `
        })

      this.logStep('Валидация результатов', 'Успех', 
        `Пользователей: ${stats[0].total_users}, Валидных рейтингов: ${stats[0].valid_ratings}`)
      
      return stats[0]
      
    } catch (error) {
      this.logError(error, 'validateMigrationResults')
      throw error
    }
  }

  async rollback() {
    this.logStep('Откат миграции', 'Начало')
    
    if (!this.backup || this.backup.length === 0) {
      this.logWarning('Нет резервной копии для отката', 'rollback')
      return false
    }

    try {
      // Восстанавливаем старые поля
      await supabase.rpc('execute_sql', {
        sql: `
          ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS fide_rating INTEGER,
          ADD COLUMN IF NOT EXISTS chesscom_rating INTEGER,
          ADD COLUMN IF NOT EXISTS lichess_rating INTEGER;
        `
      })

      // Восстанавливаем данные
      for (const userData of this.backup) {
        const { error } = await supabase
          .from('users')
          .update({
            fide_rating: userData.fide_rating,
            chesscom_rating: userData.chesscom_rating,
            lichess_rating: userData.lichess_rating
          })
          .eq('id', userData.id)

        if (error) throw error
      }

      // Удаляем новое поле
      await supabase.rpc('execute_sql', {
        sql: `ALTER TABLE users DROP COLUMN IF EXISTS rating;`
      })

      this.logStep('Откат миграции', 'Успех', `Восстановлено ${this.backup.length} записей`)
      return true
      
    } catch (error) {
      this.logError(error, 'rollback')
      return false
    }
  }

  generateReport() {
    const endTime = new Date()
    const duration = (endTime - this.results.startTime) / 1000 // в секундах
    
    const report = {
      ...this.results,
      endTime,
      duration: `${duration} секунд`,
      status: this.results.errors.length === 0 ? 'SUCCESS' : 'FAILED',
      backupCreated: this.backup !== null,
      backupSize: this.backup ? this.backup.length : 0
    }

    // Сохраняем отчет в файл
    const fs = require('fs')
    const reportFile = `migration-report-${Date.now()}.json`
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2))
    
    console.log(`\n📊 ОТЧЕТ СОХРАНЕН В ФАЙЛ: ${reportFile}`)
    return report
  }
}

// Основная функция выполнения миграции
async function runMigration() {
  const migration = new RatingMigration()
  
  console.log('🚀 НАЧИНАЕМ МИГРАЦИЮ РЕЙТИНГОВОЙ СИСТЕМЫ')
  console.log('=' .repeat(60))
  
  try {
    // Шаг 1: Создаем резервную копию
    await migration.createBackup()
    
    // Шаг 2: Анализируем текущее состояние
    const currentState = await migration.validateCurrentState()
    
    // Шаг 3: Анализируем распределение рейтингов
    const distribution = await migration.analyzeRatingDistribution()
    
    // Шаг 4: Выполняем миграцию
    await migration.performMigration()
    
    // Шаг 5: Проверяем результаты
    const results = await migration.validateMigrationResults()
    
    // Генерируем отчет
    const report = migration.generateReport()
    
    console.log('\n✅ МИГРАЦИЯ УСПЕШНО ЗАВЕРШЕНА!')
    console.log(`📈 Обработано пользователей: ${results.total_users}`)
    console.log(`📊 Средний рейтинг: ${Math.round(results.avg_rating)}`)
    console.log(`🔢 Диапазон рейтингов: ${results.min_rating} - ${results.max_rating}`)
    
  } catch (error) {
    console.error('\n❌ МИГРАЦИЯ ЗАВЕРШИЛАСЬ ОШИБКОЙ:')
    console.error(error.message)
    
    // Пытаемся выполнить откат
    console.log('\n🔄 ПЫТАЕМСЯ ВЫПОЛНИТЬ ОТКАТ...')
    const rollbackSuccess = await migration.rollback()
    
    if (rollbackSuccess) {
      console.log('✅ ОТКАТ ВЫПОЛНЕН УСПЕШНО')
    } else {
      console.log('❌ ОТКАТ НЕ ВОЗМОЖЕН - ТРЕБУЕТСЯ РУЧНОЕ ВМЕШАТЕЛЬСТВО')
    }
    
    // Генерируем отчет об ошибке
    migration.generateReport()
    
    process.exit(1)
  }
}

// Запуск миграции
if (require.main === module) {
  runMigration().catch(error => {
    console.error('Критическая ошибка:', error)
    process.exit(1)
  })
}

module.exports = { RatingMigration }