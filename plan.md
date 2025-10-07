# План разработки Telegram бота с обучающим приложением

## Обзор проекта
Telegram бот с веб-приложением для обучения с темами, подтемами, избранными и завершенными уроками.

**Стек технологий:**
- Frontend: Next.js
- Backend: Node.js + SQLite
- Bot: node-telegram-bot-api / telegraf

---

## Этап 1: Проектирование базы данных (SQLite)

### Таблицы:

#### `users`
- `id` INTEGER PRIMARY KEY
- `telegram_id` BIGINT UNIQUE
- `username` TEXT
- `first_name` TEXT
- `created_at` DATETIME

#### `topics`
- `id` INTEGER PRIMARY KEY
- `title` TEXT
- `description` TEXT
- `order` INTEGER
- `created_at` DATETIME

#### `subtopics`
- `id` INTEGER PRIMARY KEY
- `topic_id` INTEGER (FK → topics)
- `title` TEXT
- `content` TEXT
- `order` INTEGER
- `created_at` DATETIME

#### `user_progress`
- `id` INTEGER PRIMARY KEY
- `user_id` INTEGER (FK → users)
- `subtopic_id` INTEGER (FK → subtopics)
- `is_completed` BOOLEAN
- `is_favorite` BOOLEAN
- `completed_at` DATETIME
- `updated_at` DATETIME

---

## Этап 2: Backend (API)

### Технологии:
- Next.js API Routes или Express.js
- better-sqlite3 или sqlite3

### Endpoints:

#### Темы
- `GET /api/topics` - получить все темы
- `GET /api/topics/:id` - получить тему с подтемами
- `POST /api/topics` - создать тему (admin)

#### Подтемы
- `GET /api/subtopics/:id` - получить подтему
- `POST /api/subtopics` - создать подтему (admin)

#### Прогресс пользователя
- `GET /api/progress/:userId` - получить прогресс пользователя
- `POST /api/progress/complete` - отметить урок как завершенный
- `POST /api/progress/favorite` - добавить/убрать из избранного
- `GET /api/progress/:userId/favorites` - получить избранные
- `GET /api/progress/:userId/completed` - получить завершенные

#### Пользователи
- `POST /api/auth/telegram` - авторизация через Telegram
- `GET /api/users/:telegramId` - получить данные пользователя

---

## Этап 3: Frontend (Next.js)

### Страницы:

1. **Главная (`/`)**
   - Список всех тем
   - Прогресс по каждой теме

2. **Тема (`/topic/[id]`)**
   - Список подтем
   - Статус выполнения каждой подтемы

3. **Урок (`/lesson/[id]`)**
   - Содержимое урока
   - Кнопки: "Завершить", "В избранное"

4. **Избранное (`/favorites`)**
   - Список избранных уроков

5. **Завершенные (`/completed`)**
   - Список завершенных уроков
   - Статистика

### Компоненты:
- `TopicCard` - карточка темы
- `SubtopicList` - список подтем
- `LessonContent` - содержимое урока
- `ProgressBar` - прогресс-бар
- `Navigation` - навигация

### Состояние:
- Context API или Zustand для управления состоянием
- Кэширование с React Query / SWR

---

## Этап 4: Telegram Bot

### Функционал:

1. **Команды:**
   - `/start` - приветствие и регистрация пользователя
   - `/lessons` - открыть веб-приложение
   - `/help` - справка

2. **Inline кнопки:**
   - "Открыть приложение" → открывает Web App
   - "Мой прогресс" → показывает статистику

3. **Web App интеграция:**
   - Запуск Next.js приложения через Telegram WebApp
   - Передача `initData` для авторизации

---

## Этап 5: Разработка по шагам

### Шаг 1: Настройка проекта
- [ ] Инициализировать Next.js проект
- [ ] Установить зависимости (sqlite3, telegram bot)
- [ ] Настроить структуру папок

### Шаг 2: База данных
- [ ] Создать схему БД
- [ ] Написать миграции
- [ ] Создать seed данные (тестовые темы/подтемы)

### Шаг 3: Backend API
- [ ] Реализовать CRUD для тем
- [ ] Реализовать CRUD для подтем
- [ ] Реализовать систему прогресса
- [ ] Реализовать авторизацию через Telegram

### Шаг 4: Frontend
- [ ] Создать layout и навигацию
- [ ] Реализовать страницу со списком тем
- [ ] Реализовать страницу темы с подтемами
- [ ] Реализовать страницу урока
- [ ] Реализовать избранное и завершенные
- [ ] Добавить прогресс-бары и статистику

### Шаг 5: Telegram Bot
- [ ] Создать бота через BotFather
- [ ] Реализовать основные команды
- [ ] Настроить Web App
- [ ] Интегрировать авторизацию

### Шаг 6: Интеграция
- [ ] Связать бота с веб-приложением
- [ ] Реализовать передачу данных между ботом и приложением
- [ ] Тестирование полного цикла

### Шаг 7: Деплой
- [ ] Настроить production build
- [ ] Деплой на Vercel/Railway/VPS
- [ ] Настроить webhook для бота

---

## Структура проекта

```
test_tg_app-1/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API routes
│   │   │   ├── topics/
│   │   │   ├── subtopics/
│   │   │   ├── progress/
│   │   │   └── auth/
│   │   ├── topic/[id]/
│   │   ├── lesson/[id]/
│   │   ├── favorites/
│   │   ├── completed/
│   │   └── page.tsx
│   ├── components/            # React компоненты
│   ├── lib/                   # Утилиты
│   │   ├── db.ts             # SQLite connection
│   │   └── telegram.ts       # Telegram auth
│   └── bot/                   # Telegram bot
│       └── index.ts
├── database/
│   ├── schema.sql
│   ├── migrations/
│   └── seeds/
├── public/
├── package.json
└── next.config.js
```

---

## Технические требования

### Зависимости:
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "better-sqlite3": "^9.0.0",
    "node-telegram-bot-api": "^0.64.0",
    "zustand": "^4.4.0"
  }
}
```

### Переменные окружения (.env.local):
```
TELEGRAM_BOT_TOKEN=your_bot_token
DATABASE_PATH=./database/app.db
NEXT_PUBLIC_BOT_USERNAME=your_bot_username
```

---

## Следующие шаги

1. Начать с создания структуры проекта
2. Настроить базу данных
3. Создать базовый API
4. Реализовать простой UI
5. Добавить Telegram бота
6. Протестировать интеграцию
