# Быстрый старт RepChess

Пошаговая инструкция для запуска проекта RepChess локально.

## Предварительные требования

- Node.js 18+ установлен
- npm установлен
- Telegram бот создан через [@BotFather](https://t.me/botfather)

## Шаг 1: Клонирование и установка зависимостей

```bash
# Установка зависимостей для бота
npm install

# Установка зависимостей для frontend
cd frontend
npm install
cd ..
```

## Шаг 2: Настройка переменных окружения

### Корневой `.env` (для бота)

Создайте файл `.env` в корне проекта:

```bash
cp .env.example .env
```

Отредактируйте `.env`:
```env
TELEGRAM_BOT_TOKEN=ваш_токен_от_botfather
WEB_APP_URL=http://localhost:3000/
```

### Frontend `.env.local`

Создайте файл `.env.local` в папке `frontend`:

```bash
cd frontend
cp .env.example .env.local
```

Отредактируйте `frontend/.env.local`:
```env
TELEGRAM_BOT_TOKEN=ваш_токен_от_botfather
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
GOOGLE_CALENDAR_API_KEY=your-api-key  # или используйте GOOGLE_SERVICE_ACCOUNT_KEY
```

> **Примечание**: Для Google Calendar см. [frontend/GOOGLE_CALENDAR_SETUP.md](frontend/GOOGLE_CALENDAR_SETUP.md)

## Шаг 3: Запуск приложения

### Вариант 1: Запуск обоих сервисов (рекомендуется)

В двух отдельных терминалах:

**Терминал 1 - Бот:**
```bash
npm run dev
```

**Терминал 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Вариант 2: Только Frontend (для разработки UI)

```bash
cd frontend
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

## Шаг 4: Настройка Telegram бота

1. Откройте [@BotFather](https://t.me/botfather) в Telegram
2. Отправьте `/mybots`
3. Выберите вашего бота
4. Выберите "Bot Settings" → "Menu Button"
5. Выберите "Edit menu button URL"
6. Введите URL: `http://localhost:3000/` (для локальной разработки)

> **Для production**: Замените на ваш реальный URL (например, `https://yourdomain.com/`)

## Шаг 5: Тестирование

1. Откройте вашего бота в Telegram
2. Отправьте команду `/start`
3. Нажмите кнопку "♟️ Открыть шахматное приложение"
4. Приложение откроется внутри Telegram

### Команды бота

- `/start` - Главное меню
- `/profile` - Открыть личный кабинет

## База данных

База данных SQLite создаётся автоматически при первом запуске в:
```
frontend/database/repchess.db
```

Схема базы данных находится в:
```
frontend/database/schema.sql
```

## Структура проекта

```
test_tg_app-1/
├── bot.js                    # Telegram бот
├── .env                      # Конфигурация бота (не коммитится)
├── frontend/
│   ├── app/                  # Next.js приложение
│   │   ├── page.tsx         # Главная страница
│   │   ├── profile/         # Личный кабинет
│   │   ├── tournaments/     # Турниры
│   │   └── api/             # API endpoints
│   ├── database/            # SQLite база данных
│   ├── .env.local          # Конфигурация frontend (не коммитится)
│   └── ...
└── README.md
```

## Возможные проблемы

### Бот не отвечает

- Проверьте, что `TELEGRAM_BOT_TOKEN` правильно указан в `.env`
- Убедитесь, что бот запущен (`npm run dev` в корневой папке)
- Проверьте логи в терминале

### Web App не открывается

- Убедитесь, что frontend запущен (`npm run dev` в папке `frontend`)
- Проверьте, что `WEB_APP_URL` правильно указан в `.env`
- Убедитесь, что Menu Button URL настроен в BotFather

### База данных не создаётся

- Убедитесь, что папка `frontend/database/` существует
- Проверьте права на запись в эту папку
- Перезапустите frontend сервер

### Профиль не сохраняется

- Убедитесь, что `TELEGRAM_BOT_TOKEN` указан в `frontend/.env.local`
- Проверьте логи в терминале frontend
- Откройте DevTools в браузере и проверьте Network tab

## Дополнительная документация

- [CLAUDE.md](CLAUDE.md) - Полная документация архитектуры
- [frontend/GOOGLE_CALENDAR_SETUP.md](frontend/GOOGLE_CALENDAR_SETUP.md) - Настройка Google Calendar
- [frontend/PROFILE_SETUP.md](frontend/PROFILE_SETUP.md) - Документация личного кабинета

## Production деплой

Для деплоя в production:

1. Соберите frontend:
   ```bash
   cd frontend
   npm run build
   npm start
   ```

2. Обновите `WEB_APP_URL` на ваш production URL

3. Обновите Menu Button URL в BotFather на production URL

4. Настройте webhook для бота (опционально, вместо polling)

## Поддержка

Если возникли проблемы, проверьте:
1. Логи в терминале
2. DevTools в браузере (Console и Network tabs)
3. Документацию в [CLAUDE.md](CLAUDE.md)
