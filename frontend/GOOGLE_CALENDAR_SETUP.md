# Google Calendar Integration Setup

## Overview

This application fetches tournament data from Google Calendar automatically. Events are parsed and displayed on the tournaments page.

## Setup Instructions

### Option 1: Public Calendar with API Key (Easiest)

1. **Enable Google Calendar API**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable "Google Calendar API"

2. **Create API Key**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the API key

3. **Make Calendar Public**
   - Open Google Calendar
   - Click settings (⚙️) → "Settings for my calendars"
   - Select your calendar → "Access permissions"
   - Check "Make available to public"

4. **Get Calendar ID**
   - In calendar settings → "Integrate calendar"
   - Copy "Calendar ID" (looks like: `example@group.calendar.google.com`)

5. **Configure Environment Variables**
   ```bash
   cd frontend
   cp .env.example .env.local
   ```
   Edit `.env.local`:
   ```
   GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
   GOOGLE_CALENDAR_API_KEY=your-api-key-here
   ```

### Option 2: Private Calendar with Service Account (Recommended)

1. **Enable Google Calendar API** (same as Option 1)

2. **Create Service Account**
   - Go to "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Name it (e.g., "chess-tournament-bot")
   - Click "Create and Continue"
   - Skip role assignment (click "Continue")
   - Click "Done"

3. **Generate Key**
   - Click on created service account
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Choose "JSON" format
   - Download the JSON file

4. **Share Calendar with Service Account**
   - Open Google Calendar
   - Click settings (⚙️) → "Settings for my calendars"
   - Select your calendar → "Share with specific people"
   - Click "Add people"
   - Enter service account email (from JSON file: `client_email`)
   - Set permission to "See all event details"
   - Click "Send"

5. **Configure Environment Variables**
   ```bash
   cd frontend
   cp .env.example .env.local
   ```
   Edit `.env.local`:
   ```
   GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
   GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
   ```
   > **Important**: Paste entire JSON content as single-line string

## Event Format

Create calendar events with this structure for best results:

### Required Fields
- **Summary**: Tournament title (e.g., "Блиц-турнир RepChess")
- **Start/End Time**: Event date and time
- **Location**: Venue address or "Онлайн"

### Optional Fields
- **Description**: Details about the tournament
- **Extended Properties** (optional):
  - Add custom property `participants` with number of participants
  - In Google Calendar API, use `extendedProperties.private.participants`

### Example Event
```
Title: Блиц-турнир RepChess
Date: October 15, 2025
Time: 18:00 - 21:00
Location: Шахматный клуб на Невском, 25
Description: Быстрые партии с контролем времени 5+3. Призовой фонд 50,000₽
```

## Testing

1. Start development server:
   ```bash
   cd frontend
   npm run dev
   ```

2. Open [http://localhost:3000/tournaments](http://localhost:3000/tournaments)

3. Check browser console and server logs for errors

## Troubleshooting

### "Calendar credentials not configured"
- Make sure `.env.local` exists and has correct variables
- Restart dev server after changing `.env.local`

### "Failed to fetch tournaments"
- Check Calendar ID is correct
- For public calendar: verify it's set to public
- For service account: verify calendar is shared with service account email

### No events showing
- Verify events exist in calendar
- Check events are in the future (past events are filtered out)
- Check event has required fields (summary, start time)

## Deployment

For production (Vercel):

1. Go to project settings → Environment Variables
2. Add:
   - `GOOGLE_CALENDAR_ID`
   - `GOOGLE_CALENDAR_API_KEY` or `GOOGLE_SERVICE_ACCOUNT_KEY`
3. Redeploy

## Security Notes

- **Never commit** `.env.local` or credentials to git
- Use Service Account for production (more secure)
- Restrict API key to Calendar API only
- Rotate keys regularly
