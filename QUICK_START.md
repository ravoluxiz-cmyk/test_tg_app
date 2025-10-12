# Быстрый старт RepChess

## Предварительные требования

- Node.js 18+
- npm или yarn
- Telegram бот токен от [@BotFather](https://t.me/botfather)

## Шаг 1: Установка зависимостей

### Бот
```bash
npm install
```

### Frontend
```bash
cd frontend
npm install
```

## Шаг 2: Настройка переменных окружения

### Корневая директория (.env)
```bash
cp .env.example .env
```

Отредактируйте `.env`:
```
TELEGRAM_BOT_TOKEN=ваш_токен_от_botfather
WEB_APP_URL=http://localhost:3000/
```

### Frontend директория (frontend/.env.local)
```bash
cd frontend
cp .env.example .env.local
```

Отредактируйте `frontend/.env.local`:
```
TELEGRAM_BOT_TOKEN=ваш_токен_от_botfather
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
GOOGLE_CALENDAR_API_KEY=your-api-key-here
```

> **Примечание:** Для работы личного кабинета достаточно только `TELEGRAM_BOT_TOKEN`. Google Calendar настройки нужны только для страницы турниров.

## Шаг 3: Запуск приложения

### В разработке (development)

**Терминал 1 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend запустится на http://localhost:3000

**Терминал 2 - Bot:**
```bash
npm start
```

## Шаг 4: Тестирование

1. Откройте Telegram
2. Найдите своего бота
3. Отправьте `/start`
4. Нажмите кнопку "♟️ Открыть шахматное приложение"
5. Или отправьте `/profile` для перехода в личный кабинет

## Основные функции

### Личный кабинет
- **Создание профиля:** Перейдите в "Мой профиль" и заполните форму
- **Редактирование:** Нажмите кнопку редактирования в профиле
- **Данные профиля:**
  - Имя и фамилия (обязательно)
  - Рейтинги: FIDE, Chess.com, Lichess
  - Ссылки на профили в шахматных платформах
  - Описание профиля

### Турниры
- Просмотр предстоящих турниров из Google Calendar
- Требует настройки Google Calendar (см. [frontend/GOOGLE_CALENDAR_SETUP.md](frontend/GOOGLE_CALENDAR_SETUP.md))

## База данных

SQLite база данных создаётся автоматически при первом запуске в:
```
frontend/database/repchess.db
```

Для просмотра/редактирования базы можно использовать:
- [DB Browser for SQLite](https://sqlitebrowser.org/)
- [SQLite Viewer](https://inloop.github.io/sqlite-viewer/)
- Командная строка: `sqlite3 frontend/database/repchess.db`

## Деплой

### Frontend (Vercel)

1. Загрузите код на GitHub
2. Подключите репозиторий к Vercel
3. Добавьте переменные окружения в настройках проекта:
   - `TELEGRAM_BOT_TOKEN`
   - `GOOGLE_CALENDAR_ID`
   - `GOOGLE_CALENDAR_API_KEY` или `GOOGLE_SERVICE_ACCOUNT_KEY`
4. Деплойте

### Bot

Запустите бота на сервере (VPS, Railway, Heroku и т.д.):
```bash
npm start
```

Не забудьте обновить `WEB_APP_URL` на production URL вашего frontend.

## Решение проблем

### База данных не создаётся
- Убедитесь, что директория `frontend/database` существует
- Проверьте права доступа к директории

### Ошибка аутентификации Telegram
- Проверьте, что `TELEGRAM_BOT_TOKEN` правильно указан в `.env.local`
- В development режиме используется упрощённая валидация

### Турниры не отображаются
- Проверьте настройки Google Calendar (см. [frontend/GOOGLE_CALENDAR_SETUP.md](frontend/GOOGLE_CALENDAR_SETUP.md))
- Убедитесь, что в календаре есть события в будущем

## Дополнительная документация

- [CLAUDE.md](CLAUDE.md) - Архитектура проекта
- [frontend/PROFILE_SETUP.md](frontend/PROFILE_SETUP.md) - Подробная документация по личному кабинету
- [frontend/GOOGLE_CALENDAR_SETUP.md](frontend/GOOGLE_CALENDAR_SETUP.md) - Настройка Google Calendar
- [plan.md](plan.md) - Изначальный план разработки (частично устарел)

## Поддержка

Для вопросов и проблем создайте issue в репозитории проекта.
