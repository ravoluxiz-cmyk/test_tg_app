# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Telegram bot for an educational application (обучающее приложение). The bot integrates with a web application via Telegram's Web App feature. Currently, the project only contains the bot implementation; the Next.js web application is planned but not yet implemented (see [plan.md](plan.md)).

## Development Commands

**Start the bot:**
```bash
npm start
# or
npm run dev
```

Both commands run `node bot.js` which starts the Telegram bot with polling.

## Environment Setup

Required environment variables in `.env`:
- `TELEGRAM_BOT_TOKEN` - Bot token from @BotFather
- `WEB_APP_URL` - URL of the web application (e.g., `http://localhost:3000/` for local dev or production HTTPS URL)

Use [.env.example](.env.example) as a template.

## Architecture

### Current Implementation

**Single-file bot ([bot.js](bot.js)):**
- Uses `node-telegram-bot-api` for Telegram Bot API interaction
- CommonJS module format (`require()`)
- Loads config from `.env` via `dotenv`
- Polling-based (not webhooks)

**Bot commands:**
- `/start` - Main menu with inline keyboard
- `/help` - Command reference
- `/lessons` - Open lessons in Web App

**Inline keyboard features:**
- "📚 Открыть обучающее приложение" - Opens Web App at `WEB_APP_URL`
- "📊 Мой прогресс" - Progress callback (stub implementation)
- "⭐ Избранное" - Favorites callback, opens Web App at `/favorites` route

**Event handlers:**
- `callback_query` - Handles inline button callbacks for progress and favorites
- `web_app_data` - Receives data sent from Web App (currently just logs it)
- `polling_error` - Error logging

### Planned Architecture

See [plan.md](plan.md) for the complete development roadmap. The plan includes:

**Database (SQLite):**
- `users`, `topics`, `subtopics`, `user_progress` tables
- Track completed lessons, favorites, and user progress

**Next.js Web App:**
- Pages: main topic list, topic detail, lesson content, favorites, completed
- API routes for topics, subtopics, progress, and Telegram auth
- State management with Context API or Zustand
- Integration via Telegram Web App `initData` for auth

**Project structure (planned):**
```
src/
├── app/              # Next.js app directory
│   ├── api/         # API routes (topics, subtopics, progress, auth)
│   └── ...pages
├── components/       # React components
├── lib/
│   ├── db.ts        # SQLite connection
│   └── telegram.ts  # Telegram auth
└── bot/             # Telegram bot (move current bot.js here)
```

## Implementation Notes

**When modifying the bot:**
- Text content is in Russian - maintain this language for user-facing strings
- Keep the existing command structure (`/start`, `/help`, `/lessons`)
- The bot expects a web application at `WEB_APP_URL` - stub/placeholder implementations should acknowledge missing features gracefully
- Callback data handlers are in the `callback_query` event listener (currently supports `'progress'` and `'favorites'`)

**When implementing the web app:**
- Follow the database schema in [plan.md](plan.md) lines 16-47
- Implement Telegram Web App authentication using `initData` validation
- The bot sends users to these routes: root (`/`), `/favorites`
- Web App should send data back to bot via Telegram's `web_app_data` mechanism
