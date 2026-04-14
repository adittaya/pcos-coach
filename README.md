# PCOS Coach ⚡

> AI-powered fitness & nutrition companion designed specifically for women with PCOS.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### 🏋️ Fitness
- **PCOS-optimized workouts** — Yoga, Strength, HIIT, Pilates, Cardio, Recovery
- **Workout timer** with guided exercise-by-exercise countdown
- Exercise filtering by type
- Calorie burn tracking

### 🥗 Nutrition
- **Curated meal library** — Low-glycemic, anti-inflammatory meals
- **7-day meal plan** — Full week of PCOS-friendly meals
- Macro tracking (protein, carbs, fat)
- Custom meal logging
- Calorie & macro visualization

### 🤖 AI Coach
- Context-aware PCOS advice
- Weight logging via chat
- Phase-specific recommendations
- Persistent chat history

### 📊 Progress Tracking
- **Weight** — Trend charts, stats, daily logging
- **Body measurements** — Waist, hips, bust, arms, thighs
- **Sleep** — Hours + quality with 7-day bar chart
- **Symptoms** — 9 PCOS symptoms with personalized tips
- **Cycle** — Period tracking with phase insights
- **Achievements** — 10 unlockable badges

### 💊 Health Tools
- Supplement tracker (Inositol, Vitamin D, Omega-3, etc.)
- Water intake tracker
- Daily challenges
- Streak tracking

### ⚙️ Enterprise Features
- JWT authentication (register/login)
- SQLite database with proper schema
- RESTful API with 30+ endpoints
- Data export (JSON)
- Dark mode
- Push notification management
- Analytics dashboard
- Docker deployment

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Recharts, Lucide Icons |
| Backend | Express.js, better-sqlite3 |
| Auth | JWT + bcrypt |
| Database | SQLite (WAL mode) |
| Deployment | Docker, Node.js 20 |

## Quick Start

```bash
# Install dependencies
npm install

# Build frontend
npm run build

# Start server
node server/index.js
```

Visit `http://localhost:3001`

## Docker

```bash
docker build -t pcos-coach .
docker run -p 3001:3001 pcos-coach
```

## API Endpoints

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Sign in
- `GET /api/auth/me` — Get profile
- `PUT /api/auth/profile` — Update profile

### Daily Logs
- `GET /api/logs/:date` — Get daily log
- `GET /api/logs?from=&to=` — Get date range
- `POST /api/logs/:date/meals` — Add meal
- `DELETE /api/logs/:date/meals/:id` — Remove meal
- `PUT /api/logs/:date/water` — Update water
- `POST /api/logs/:date/workouts` — Add workout
- `PUT /api/logs/:date/symptoms` — Update symptoms
- `PUT /api/logs/:date/sleep` — Log sleep
- `POST /api/logs/:date/supplements` — Add supplement

### Weight
- `GET /api/weight?days=30` — Weight history
- `POST /api/weight` — Log weight

### Measurements
- `GET /api/measurements` — Body measurements
- `POST /api/measurements` — Add measurement

### Cycle
- `GET /api/cycle` — Cycle data
- `POST /api/cycle/period` — Log period start

### Goals
- `GET /api/goals` — Get goals
- `PUT /api/goals` — Update goals

### Chat
- `GET /api/chat` — Chat history
- `POST /api/chat` — Add message
- `DELETE /api/chat` — Clear chat

### Notifications
- `GET /api/notifications` — List reminders
- `POST /api/notifications` — Create reminder
- `PUT /api/notifications/:id` — Toggle reminder
- `DELETE /api/notifications/:id` — Delete reminder

### Analytics
- `GET /api/analytics/summary?days=30` — Dashboard summary
- `GET /api/analytics/trends?days=30` — Daily trends

### Other
- `GET /api/streak` — Current streak
- `GET /api/achievements` — Earned badges
- `POST /api/achievements` — Earn badge
- `GET /api/export` — Full data export
- `GET /api/health` — Health check

## Database Schema

- `users` — User accounts & profiles
- `daily_logs` — Daily food, water, workouts, symptoms, sleep
- `weight_history` — Weight tracking over time
- `measurements` — Body measurements
- `cycle_data` — Menstrual cycle tracking
- `sleep_history` — Sleep data
- `chat_history` — AI coach conversation
- `goals` — User health goals
- `notifications` — Reminders & alerts
- `achievements` — Earned badges
- `active_dates` — Streak calculation

## Project Structure

```
pcos-coach/
├── server/
│   ├── index.js          # Express API server
│   └── pcos_coach.db     # SQLite database
├── src/
│   ├── App.jsx           # Main application
│   ├── AuthPage.jsx      # Login/signup
│   ├── api.js            # API client
│   ├── store.js          # Data models
│   ├── aiCoach.js        # AI response engine
│   └── index.css         # Styles
├── dist/                 # Built frontend
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## License

MIT
