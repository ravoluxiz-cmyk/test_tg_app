# Миграция на Supabase

Это руководство поможет вам перенести базу данных RepChess из SQLite в Supabase.

## Шаг 1: Создайте проект в Supabase

1. Зайдите на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Дождитесь завершения инициализации проекта

## Шаг 2: Выполните миграцию

### Вариант A: Полная миграция (рекомендуется)

**Один файл для схемы + данных**

1. Откройте SQL Editor в вашем проекте Supabase
2. Скопируйте содержимое файла `frontend/database/supabase-full-migration.sql`
3. Вставьте в SQL Editor и выполните запрос
4. Проверьте результат - вы увидите количество импортированных записей

Этот файл создаст все таблицы и импортирует существующие данные одной командой.

### Добавление рейтинговой системы Glicko2

1. Откройте SQL Editor в Supabase
2. Вставьте содержимое `frontend/database/migrations/20241113_add_rating_system.sql`
3. Выполните запрос — будут созданы таблицы: `player_ratings`, `rating_history`, `player_rating_stats`, `rating_periods`, триггеры и представления `rating_leaderboard`, `recent_rating_changes`

#### Бэкфилл начальных рейтингов

После применения схемы выполните бэкфилл начальных рейтингов на основе полей пользователей:

```bash
cd frontend
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \
npm run migrate:ratings
```

Скрипт создаст записи в `player_ratings` для всех пользователей, у кого они отсутствуют, используя приоритет FIDE → Chess.com → Lichess → 1500.

#### Верификация миграции

```bash
cd frontend
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \
npm run verify:ratings
```

Скрипт проверит доступность таблиц/представлений и выполнит выборки.

#### Непрерывность работы

- Миграция добавляет новые объекты и не изменяет существующие таблицы, поэтому даунтайм отсутствует.
- Рекомендуется выполнять SQL в транзакции через Supabase SQL Editor, и сначала включить схемы, затем бэкфилл.

### Вариант B: Раздельная миграция

**Только схема (без данных)**

1. Откройте SQL Editor в вашем проекте Supabase
2. Скопируйте содержимое файла `frontend/database/supabase-migration.sql`
3. Вставьте в SQL Editor и выполните запрос
4. Убедитесь, что все таблицы созданы успешно

**Затем импортируйте данные (опционально):**

1. Скопируйте содержимое файла `frontend/database/export-to-postgres.sql`
2. Вставьте в SQL Editor и выполните запрос

## Шаг 3: Получите credentials

В настройках проекта Supabase найдите:

### Project URL
- Находится в Settings → API → Project URL
- Формат: `https://xxxxxxxxxxxxx.supabase.co`

### Service Role Key
- Находится в Settings → API → Project API keys → service_role
- **ВАЖНО:** Это секретный ключ! Никогда не коммитьте его в git!

## Шаг 4: Настройте переменные окружения

Создайте или обновите файл `frontend/.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Telegram Bot Token (already exists)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Google Calendar (if using)
GOOGLE_CALENDAR_ID=your_calendar_id
GOOGLE_CALENDAR_API_KEY=your_api_key
```

## Шаг 5: Переключитесь на Supabase версию db.ts

У вас есть два варианта:

### Вариант A: Переименовать файлы (рекомендуется)

```bash
cd frontend/lib
mv db.ts db-sqlite.ts.backup
mv db-supabase.ts db.ts
```

### Вариант B: Использовать условную логику

Добавьте в `db.ts` проверку переменной окружения:

```typescript
// В начале файла db.ts
if (process.env.USE_SUPABASE === 'true') {
  export * from './db-supabase'
} else {
  // Текущий SQLite код
}
```

И добавьте в `.env.local`:
```env
USE_SUPABASE=true
```

## Шаг 6: Миграция данных (опционально)

Если у вас уже есть данные в SQLite, которые нужно перенести:

### Вариант A: Использовать готовый скрипт (рекомендуется)

1. Откройте файл `frontend/database/export-to-postgres.sql`
2. Скопируйте содержимое
3. Вставьте в SQL Editor в Supabase и выполните

Этот файл уже содержит преобразованные данные из вашей текущей SQLite базы.

### Вариант B: Экспортировать вручную

1. Экспортируйте данные из SQLite:
```bash
sqlite3 frontend/database/repchess.db .dump > data_export.sql
```

Файл будет создан в корневой директории проекта: `data_export.sql`

2. Преобразуйте SQL для PostgreSQL (основные отличия):
   - `AUTOINCREMENT` → `SERIAL` или `BIGSERIAL`
   - `INTEGER PRIMARY KEY AUTOINCREMENT` → `BIGSERIAL PRIMARY KEY`
   - `DATETIME` → `TIMESTAMPTZ`
   - Удалите `PRAGMA` команды
   - Удалите `BEGIN TRANSACTION` и `COMMIT`

3. Импортируйте в Supabase через SQL Editor

## Шаг 7: Тестирование

1. Запустите приложение:
```bash
cd frontend
npm run dev
```

2. Проверьте основные функции:
   - Регистрация/вход пользователя
   - Создание турнира (через админ панель)
   - Добавление участников
   - Создание туров и пар

3. Проверьте логи на наличие ошибок

## Преимущества Supabase

✅ **Масштабируемость** - автоматическое масштабирование базы данных
✅ **Backup** - автоматические бэкапы каждый день
✅ **Real-time** - возможность добавить real-time обновления в будущем
✅ **Dashboard** - удобный веб-интерфейс для управления данными
✅ **Row Level Security** - встроенная система безопасности на уровне строк
✅ **API** - автоматически генерируемое REST API

## Откат к SQLite

Если что-то пошло не так, вы можете легко вернуться к SQLite:

```bash
cd frontend/lib
mv db.ts db-supabase.ts
mv db-sqlite.ts.backup db.ts
```

И удалите переменные Supabase из `.env.local`.

## Поддержка

Если возникнут проблемы:
1. Проверьте логи в консоли браузера
2. Проверьте логи сервера Next.js
3. Проверьте Logs в Dashboard Supabase
4. Убедитесь, что все переменные окружения установлены правильно

## Важные замечания

⚠️ **Service Role Key** обходит Row Level Security политики - используйте его только на сервере (в API routes)
⚠️ Не коммитьте `.env.local` в git
⚠️ В production используйте переменные окружения вашего хостинга (Vercel, Netlify и т.д.)
