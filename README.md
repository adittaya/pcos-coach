# PCOS Coach ⚡

> AI-powered fitness & nutrition companion for women with PCOS — **100 features**, enterprise-grade.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Features](https://img.shields.io/badge/features-100-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

## 🚀 Quick Start

```bash
npm install && npm run build && npm start
```

Visit `http://localhost:3001`

## 📋 100 Features

### 🔐 Auth & Profile (1-5)
1. JWT Authentication (register/login)
2. User profile management
3. Avatar support
4. Language & units preferences
5. Account stats & level tracking

### 🍽️ Nutrition Tracking (6-20)
6. Meal logging with macros
7. Calorie tracking
8. Protein/carbs/fat tracking
9. Fiber tracking
10. Custom meal entry
11. Food search database (15+ foods)
12. Barcode scan simulation
13. PCOS-specific meal suggestions
14. 7-day meal planner
15. Anti-inflammatory food focus
16. Low-GI carb recommendations
17. Meal type categorization
18. Delete logged meals
19. Daily calorie summary
20. Macro pie chart visualization

### 💪 Fitness & Workouts (21-35)
21. 6 workout types (Yoga, Strength, HIIT, Pilates, Cardio, Recovery)
22. Workout timer with guided exercises
23. Play/Pause/Reset controls
24. Exercise-by-exercise countdown
25. Custom workout builder
26. Workout completion logging
27. Calorie burn tracking
28. Workout filtering by type
29. Exercise library with details
30. Workout streak tracking
31. Steps counter
32. Heart rate logging
33. Weekly workout goals
34. Workout completion celebration
35. PCOS-optimized exercise selection

### 💧 Hydration (36-39)
36. Water intake tracker (interactive glasses)
37. Water goal customization
38. Water reminder configuration
39. Daily water progress

### 😴 Sleep (40-44)
40. Sleep hours logging
41. Sleep quality rating (1-5 emoji)
42. Bedtime & wake time tracking
43. 7-day sleep bar chart
44. Sleep trend analysis

### 🩺 Health Vitals (45-52)
45. Weight tracking with trends
46. Body fat percentage
47. Muscle mass tracking
48. Blood pressure logging
49. Blood sugar tracking (fasting/post-meal)
50. Body measurements (waist, hips, bust, arms, thighs, neck)
51. Measurement change indicators
52. Health data charts

### 🌙 Cycle Tracking (53-56)
53. Period start logging
54. Cycle day calculation
55. Cycle phase detection (Menstrual/Follicular/Ovulatory/Luteal)
56. Phase-specific advice

### 😊 Mood & Wellness (57-62)
57. Mood tracking (1-5)
58. Energy level tracking
59. Stress level tracking
60. Pain level tracking
61. Mood trend analysis
62. Mood-workout correlation

### 🤖 AI Coach (63-67)
63. Context-aware PCOS advice
64. Nutrition recommendations
65. Workout suggestions
66. Weight management tips
67. Motivational responses

### 📊 Analytics & Reports (68-75)
68. Daily summary dashboard
69. Weekly report with grades
70. Monthly analytics
71. Calorie trend charts
72. Weight trend area charts
73. Sleep trend bar charts
74. Symptom frequency analysis
75. Daily score (A/B/C/D grading)

### 🏆 Gamification (76-82)
76. XP system
77. Level progression
78. Achievement badges (10+)
79. Streak tracking
80. Daily challenges (8 types)
81. Leaderboard
82. Milestone celebrations

### 🥗 Recipes & Meal Planning (83-87)
83. Recipe library (5 seeded PCOS recipes)
84. Recipe creation
85. Save favorite recipes
86. Recipe search & filtering
87. Ingredient & instruction lists

### 📝 Grocery & Planning (88-90)
88. Grocery list creation
89. Item check-off
90. Multiple list management

### ⏰ Fasting (91-93)
91. Intermittent fasting timer
92. Fast start/stop tracking
93. Fasting history

### 👥 Community & Appointments (94-98)
94. Community post feed
95. Post likes
96. Doctor appointment scheduling
97. Expert consultation booking
98. Wearable device connections (Apple Health, Fitbit, Garmin)

### 💊 Supplements & Medications (99-100)
99. Supplement tracker (8 PCOS supplements)
100. Medication logging

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Recharts, Lucide Icons |
| Backend | Express.js, better-sqlite3 (30 tables) |
| Auth | JWT + bcrypt |
| API | 60+ RESTful endpoints |
| Database | SQLite WAL mode with indexes |
| Deployment | Docker, Node.js 20 |

## 📡 API Endpoints

60+ endpoints covering all features. Key routes:

- `/api/auth/*` — Authentication
- `/api/logs/*` — Daily tracking
- `/api/weight/*`, `/api/measurements/*` — Body data
- `/api/sleep/*`, `/api/mood/*` — Wellness
- `/api/cycle/*`, `/api/blood-*` — Health vitals
- `/api/recipes/*`, `/api/grocery/*` — Nutrition
- `/api/fasting/*`, `/api/custom-workouts/*` — Fitness
- `/api/challenges/*`, `/api/community/*` — Social
- `/api/analytics/*`, `/api/report/*` — Reports
- `/api/export`, `/api/import` — Data portability
- `/api/barcode/*`, `/api/search/*` — Discovery
- `/api/leaderboard`, `/api/xp` — Gamification

## 🐳 Docker

```bash
docker build -t pcos-coach . && docker run -p 3001:3001 pcos-coach
```

## 📄 License

MIT
