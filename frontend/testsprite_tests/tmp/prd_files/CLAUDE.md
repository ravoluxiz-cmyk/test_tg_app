# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

Этот файл содержит рекомендации для Claude Code (claude.ai/code) при работе с кодом в этом репозитории.

## Обзор проекта

Это **RepChess** (Реп Шахматы) - Telegram бот интегрированный с Next.js веб-приложением для шахматного образования и управления турнирами. Проект состоит из:

1. **Telegram бот** ([bot.js](bot.js)) - Точка входа, которая запускает веб-приложение
2. **Next.js веб-приложение** ([frontend/](frontend/)) - Основное приложение с турнирами, личным кабинетом, мерчем и записью на уроки

## Команды разработки

**Бот:**
```bash
npm start
# или
npm run dev
```

**Frontend (Next.js):**
```bash
cd frontend
npm run dev          # Разработка с Turbopack
npm run build        # Production сборка с Turbopack
npm start            # Запуск production сервера
npm run lint         # Запуск ESLint
```

Frontend работает на [http://localhost:3000](http://localhost:3000)

## Настройка окружения

**Корневой `.env` (для бота):**
- `TELEGRAM_BOT_TOKEN` - Токен бота от [@BotFather](https://t.me/botfather)
- `WEB_APP_URL` - URL веб-приложения (например, `http://localhost:3000/` для локальной разработки)

Используйте [.env.example](.env.example) как шаблон.

**Frontend `.env.local`:**
- `TELEGRAM_BOT_TOKEN` - Токен бота (для валидации Telegram Web App данных)
- `NEXT_PUBLIC_SUPABASE_URL` - URL Supabase проекта
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key для серверных операций
- `GOOGLE_CALENDAR_ID` - ID Google Calendar (формат: `example@group.calendar.google.com`)
- Либо:
  - `GOOGLE_CALENDAR_API_KEY` - Для публичных календарей
  - `GOOGLE_SERVICE_ACCOUNT_KEY` - JSON credentials сервисного аккаунта для приватных календарей
- `BBP_BIN_PATH` - (Опционально) Путь к исполняемому файлу BBP Pairings для генерации швейцарских пар

Используйте [frontend/.env.example](frontend/.env.example) как шаблон. См. [frontend/GOOGLE_CALENDAR_SETUP.md](frontend/GOOGLE_CALENDAR_SETUP.md) и [frontend/BBP_INTEGRATION.md](frontend/BBP_INTEGRATION.md) для детальных инструкций.

## Архитектура

### Telegram бот

**Однофайловая реализация ([bot.js](bot.js)):**
- Использует `node-telegram-bot-api` с polling
- Формат CommonJS
- Минимальная логика - только открывает веб-приложение

**Текущий функционал бота:**
- Команда `/start` отображает приветственное сообщение и кнопку для открытия веб-приложения
- Команда `/profile` открывает личный кабинет пользователя
- Весь текст для пользователей на русском языке

### Next.js Frontend

**Технологический стек:**
- Next.js 15 (App Router) с Turbopack
- TypeScript
- Tailwind CSS v4 с PostCSS
- React 19
- Framer Motion для анимаций
- Компоненты Radix UI
- **Supabase (PostgreSQL)** для хранения данных пользователей и турниров
- Интеграция с Google Calendar API через `googleapis`
- Telegram Web App SDK для аутентификации
- BBP Pairings (native binary) для генерации пар по правилам ФИДЕ (предпочтительно)

**Структура проекта:**
```
frontend/
├── app/
│   ├── page.tsx                             # Главная страница с 4 основными кнопками
│   ├── tournaments/page.tsx                 # Страница списка турниров (публичная)
│   ├── profile/
│   │   ├── page.tsx                        # Просмотр профиля
│   │   └── edit/page.tsx                   # Редактирование профиля
│   ├── admin/                               # Админ-панель для управления турнирами
│   │   ├── page.tsx                        # Главная админки
│   │   └── tournaments/
│   │       ├── page.tsx                    # Список всех турниров
│   │       ├── new/page.tsx                # Создание турнира
│   │       ├── mine/page.tsx               # Мои турниры
│   │       ├── archive/page.tsx            # Архив турниров
│   │       ├── delete/page.tsx             # Удаление турниров
│   │       └── [id]/
│   │           ├── participants/page.tsx   # Добавление участников
│   │           ├── results/page.tsx        # Результаты турнира
│   │           └── tours/
│   │               ├── page.tsx            # Список туров
│   │               └── [tourId]/page.tsx   # Управление туром
│   ├── api/
│   │   ├── tournaments/                     # API endpoints для турниров
│   │   ├── profile/route.ts                 # GET, POST, PUT профиля
│   │   └── debug/supabase/route.ts          # Диагностика Supabase
│   ├── layout.tsx                           # Корневой layout (Telegram SDK)
│   └── globals.css                          # Глобальные стили
├── components/
│   ├── ChessBackground.tsx                  # Анимированный фон
│   ├── tournaments/                         # Компоненты турниров
│   └── ui/                                  # Переиспользуемые UI компоненты
├── lib/
│   ├── db.ts                               # Функции работы с Supabase БД
│   ├── supabase.ts                         # Клиент Supabase
│   ├── bbp.ts                           # Интеграция BBP Pairings
│   ├── telegram.ts                         # Telegram Web App аутентификация
│   ├── google-calendar/
│   │   ├── client.ts                       # Google Calendar API
│   │   └── parser.ts                       # Парсинг событий
│   └── utils.ts                            # Утилиты
├── hooks/
│   └── useTelegramWebApp.ts                # React хук для Telegram Web App
└── public/                                  # Статические ресурсы
```

**Текущие страницы:**

**Публичные:**
1. **Главная (`/`)** - Четыре основные кнопки действий
2. **Турниры (`/tournaments`)** - Предстоящие турниры из Google Calendar
3. **Профиль (`/profile`)** - Просмотр профиля с рейтингами (FIDE, Chess.com, Lichess)
4. **Редактирование профиля (`/profile/edit`)** - Форма редактирования данных

**Админ-панель (`/admin`):**
1. **Главная админки** - Кнопки навигации
2. **Управление турнирами:**
   - Создание нового турнира (формат, раунды, очки, тайбрейки)
   - Список всех турниров / Мои турниры / Архив
   - Добавление участников (поиск по username)
   - Создание туров и генерация пар (встроенный алгоритм или BBP Pairings)
   - Ввод результатов матчей
   - Турнирная таблица (standings)
   - Финализация турнира (архивирование + снапшот leaderboard)
3. **Роли пользователей:** admin, moderator, user

**Интеграция с Google Calendar:**
- Турниры автоматически получаются из Google Calendar
- API маршрут: `GET /api/tournaments` получает события и парсит их
- События должны иметь: название, время начала/окончания, местоположение
- См. [frontend/GOOGLE_CALENDAR_SETUP.md](frontend/GOOGLE_CALENDAR_SETUP.md) для деталей конфигурации

**Стилизация:**
- Используется шахматная тема с анимированным фоном из шахматных фигур
- Жирная типографика со шрифтом Arial Black
- Responsive дизайн mobile-first
- Белый текст на темном/шахматном фоне

### База данных и ключевые сущности

**База данных: Supabase (PostgreSQL)**

Основные таблицы:
- `users` - пользователи (telegram_id, username, first_name, last_name, рейтинги, role)
- `tournaments` - турниры (title, format, points_win/draw/loss, bye_points, rounds, tiebreakers, team_mode, флаги allow_*, creator_telegram_id, archived)
- `tournament_participants` - участники турнира (tournament_id, user_id, nickname)
- `rounds` - туры турнира (tournament_id, number, status: planned/paired/locked)
- `matches` - матчи (round_id, white_participant_id, black_participant_id, board_no, result, score_white, score_black, source)
- `leaderboard` - финальные результаты (tournament_id, participant_id, nickname, points, rank)

**Ключевые функции в [frontend/lib/db.ts](frontend/lib/db.ts):**
- Управление пользователями: `getUserByTelegramId`, `createUser`, `updateUserProfile`, `upsertUser`
- Управление турнирами: `createTournament`, `listTournaments`, `listTournamentsByCreator`, `getTournamentById`, `deleteTournament`, `updateTournamentArchived`
- Участники: `addTournamentParticipant`, `listTournamentParticipants`
- Туры: `createRound`, `listRounds`, `getNextRoundNumber`
- Матчи: `listMatches`, `updateMatchResult`
- Standings: `getStandings` (вычисляет турнирную таблицу)
- Финализация: `finalizeTournament`, `finalizeTournamentIfExceeded` (автоматическая при достижении планового количества туров)
- Leaderboard: `listLeaderboard`

**BBP Pairings интеграция ([frontend/lib/bbp.ts](frontend/lib/bbp.ts)):**
- Предпочитаемый движок для генерации пар по правилам ФИДЕ (при наличии бинарника)
- Запускается как нативный бинарник (требует доступный путь к бинарнику)
- Генерирует минимальный TRF(bx) файл, вызывает бинарник BBP, парсит выходные данные
- При ошибке или пустом результате — показывается 502-специфичное сообщение; пар не генерируется (BBP-only, без fallback)

## Заметки по реализации

**При изменении бота:**
- Весь текст для пользователей должен быть на русском языке
- Бот в данный момент только отображает приветственный текст и открывает веб-приложение
- Держите его простым - сложная логика должна быть в Next.js приложении

**При изменении frontend:**
- Поддерживайте шахматную тему и брендинг (RepChess)
- Весь текст для пользователей должен быть на русском языке
- Используйте Turbopack для сборок (он настроен в package.json scripts)
- Приложение стилизовано с Tailwind CSS v4 - синтаксис может отличаться от v3
- Компоненты используют framer-motion для анимаций

**Интеграция с Google Calendar:**
- Клиент календаря в [frontend/lib/google-calendar/client.ts](frontend/lib/google-calendar/client.ts)
- Парсер событий в [frontend/lib/google-calendar/parser.ts](frontend/lib/google-calendar/parser.ts)
- Поддерживает как публичные календари (API ключ), так и приватные календари (сервисный аккаунт)
- События фильтруются для показа только предстоящих турниров

**Интеграция с Telegram Web App:**
- Бот запускает веб-приложение по адресу `WEB_APP_URL`
- Аутентификация реализована через Telegram Web App `initData`
- В production проверяется HMAC подпись с использованием `TELEGRAM_BOT_TOKEN`
- В development используется упрощённая валидация
- Хук `useTelegramWebApp` в [frontend/hooks/useTelegramWebApp.ts](frontend/hooks/useTelegramWebApp.ts) для работы с Telegram SDK
- Модуль аутентификации в [frontend/lib/telegram.ts](frontend/lib/telegram.ts)

**База данных Supabase:**
- Клиент создаётся в [frontend/lib/supabase.ts](frontend/lib/supabase.ts)
- Использует service role key для серверных операций (обходит RLS)
- Модуль работы с БД в [frontend/lib/db.ts](frontend/lib/db.ts)
- API endpoints для профиля: `GET /api/profile`, `POST /api/profile`, `PUT /api/profile`
- См. [frontend/PROFILE_SETUP.md](frontend/PROFILE_SETUP.md) для подробной документации

**Алгоритм генерации пар (BBP Swiss — Dutch/Burstein):**
- Первый тур: пары создаются по порядку регистрации
- Последующие туры: участники сортируются по очкам (standings), затем спариваются сверху вниз
- Нечётное количество участников: последний получает bye (автоматическую победу)
- Поддержка `forbid_repeat_bye` - запрет повторного bye одному участнику
- BBP Pairings engine: предпочтительный алгоритм по правилам ФИДЕ (при наличии бинарника)
- В режиме BBP-only при ошибке/отсутствии бинарника пары не генерируются; UI показывает 502-специфичное сообщение; fallback отсутствует.

**Жизненный цикл турнира:**
1. Создание турнира → status: active, archived: 0
2. Добавление участников
3. Создание тура → status: 'planned'
4. Генерация пар → status: 'paired', paired_at устанавливается
5. Ввод результатов матчей
6. Когда все матчи завершены → status: 'locked', locked_at устанавливается
7. Когда locked туров >= запланированного количества → автофинализация (archived: 1, снапшот в leaderboard)
8. Возможна ручная финализация через API
