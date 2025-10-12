# Настройка личного кабинета пользователя

## Обзор

Личный кабинет позволяет пользователям RepChess управлять своим профилем, добавлять шахматные рейтинги и ссылки на профили в шахматных платформах.

## Функционал

### Данные профиля

**Обязательные поля:**
- Имя
- Фамилия

**Необязательные поля:**
- Рейтинги:
  - FIDE рейтинг
  - Chess.com рейтинг
  - Lichess рейтинг
- Ссылки на профили:
  - Chess.com профиль URL
  - Lichess профиль URL
- Описание профиля (bio)

### Страницы

1. **`/profile`** - Просмотр профиля
   - Показывает информацию о пользователе
   - Отображает рейтинги и ссылки
   - Кнопка редактирования профиля

2. **`/profile/edit`** - Редактирование профиля
   - Форма для создания/обновления профиля
   - Автоматическое заполнение имени/фамилии из Telegram
   - Валидация обязательных полей

### API эндпоинты

- `GET /api/profile` - Получить профиль текущего пользователя
- `POST /api/profile` - Создать новый профиль
- `PUT /api/profile` - Обновить существующий профиль

## Telegram интеграция

### Аутентификация

Приложение использует Telegram Web App `initData` для аутентификации пользователей:
- В production режиме проверяется подпись `initData`
- В development режиме используется упрощённая проверка
- Telegram ID пользователя используется как уникальный идентификатор

### Команды бота

- `/start` - Открыть главное меню (включает упоминание личного кабинета)
- `/profile` - Открыть личный кабинет напрямую

## База данных

### Таблица `users`

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  fide_rating INTEGER,
  chesscom_rating INTEGER,
  lichess_rating INTEGER,
  chesscom_url TEXT,
  lichess_url TEXT,
  bio TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

База данных создаётся автоматически при первом запуске приложения в `frontend/database/repchess.db`.

## Разработка

### Установка

```bash
cd frontend
npm install
```

### Запуск

```bash
npm run dev
```

### Переменные окружения

Требуется `.env.local`:
```
TELEGRAM_BOT_TOKEN=your_bot_token
```

Для production также необходима валидация подписи Telegram.

### Тестирование без Telegram

Для разработки можно тестировать страницы напрямую в браузере:
- В development режиме аутентификация упрощена
- Можно использовать mock данные для `initData`

## Безопасность

- **Валидация Telegram данных**: В production проверяется подпись `initData` с использованием bot token
- **База данных**: SQLite файл не должен коммититься в git (добавлен в `.gitignore`)
- **API безопасность**: Все API маршруты требуют валидный Telegram `initData` в заголовке Authorization

## Структура файлов

```
frontend/
├── app/
│   ├── profile/
│   │   ├── page.tsx           # Страница просмотра профиля
│   │   └── edit/
│   │       └── page.tsx       # Страница редактирования профиля
│   └── api/
│       └── profile/
│           └── route.ts       # API эндпоинты для профиля
├── lib/
│   ├── db.ts                  # Функции работы с базой данных
│   └── telegram.ts            # Telegram WebApp аутентификация
├── hooks/
│   └── useTelegramWebApp.ts   # React хук для Telegram WebApp
└── database/
    ├── schema.sql             # SQL схема базы данных
    └── repchess.db            # SQLite база данных (генерируется)
```

## Возможные улучшения

1. **Загрузка аватара** - Добавить возможность загрузки фото профиля
2. **История игр** - Интеграция с Chess.com/Lichess API для показа последних партий
3. **Статистика** - Графики прогресса рейтинга
4. **Друзья** - Система добавления друзей и сравнения рейтингов
5. **Достижения** - Система ачивок для мотивации пользователей
