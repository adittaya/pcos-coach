const KEY_PREFIX = 'pcos_'

export const db = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(KEY_PREFIX + key)
      return raw ? JSON.parse(raw) : fallback
    } catch { return fallback }
  },
  set(key, value) { localStorage.setItem(KEY_PREFIX + key, JSON.stringify(value)) },
  remove(key) { localStorage.removeItem(KEY_PREFIX + key) },
}

function today() { return new Date().toISOString().split('T')[0] }

// ── User Profile ──
export const profile = {
  get: () => db.get('profile', null),
  save: (p) => db.set('profile', p),
  isOnboarded: () => !!db.get('profile'),
  update: (updates) => {
    const p = profile.get() || {}
    profile.save({ ...p, ...updates })
  }
}

// ── Daily Log ──
export const dailyLog = {
  get: (date = today()) => db.get(`log_${date}`, {
    date, meals: [], water: 0, workouts: [], symptoms: [],
    weight: null, caloriesBurned: 0, sleep: null, supplements: [],
    waterGoal: 8
  }),
  save: (log) => db.set(`log_${log.date}`, log),
  addMeal: (date, meal) => {
    const log = dailyLog.get(date)
    log.meals.push({ ...meal, id: Date.now(), loggedAt: new Date().toISOString() })
    dailyLog.save(log)
    streak.markToday()
    return log
  },
  removeMeal: (date, mealId) => {
    const log = dailyLog.get(date)
    log.meals = log.meals.filter(m => m.id !== mealId)
    dailyLog.save(log)
    return log
  },
  setWater: (date, glasses) => {
    const log = dailyLog.get(date)
    log.water = Math.max(0, Math.min(12, glasses))
    dailyLog.save(log)
    streak.markToday()
    return log
  },
  addWorkout: (date, workout) => {
    const log = dailyLog.get(date)
    log.workouts.push({ ...workout, id: Date.now(), completedAt: new Date().toISOString() })
    log.caloriesBurned = log.workouts.reduce((s, w) => s + (w.calories || 0), 0)
    dailyLog.save(log)
    streak.markToday()
    return log
  },
  setSymptoms: (date, symptoms) => {
    const log = dailyLog.get(date)
    log.symptoms = symptoms
    dailyLog.save(log)
    streak.markToday()
    return log
  },
  setWeight: (date, weight) => {
    const log = dailyLog.get(date)
    log.weight = weight
    dailyLog.save(log)
    return log
  },
  setSleep: (date, sleep) => {
    const log = dailyLog.get(date)
    log.sleep = sleep
    dailyLog.save(log)
    streak.markToday()
    return log
  },
  addSupplement: (date, supp) => {
    const log = dailyLog.get(date)
    log.supplements.push({ ...supp, id: Date.now(), takenAt: new Date().toISOString() })
    dailyLog.save(log)
    return log
  },
  removeSupplement: (date, suppId) => {
    const log = dailyLog.get(date)
    log.supplements = log.supplements.filter(s => s.id !== suppId)
    dailyLog.save(log)
    return log
  },
  getTotals: (date) => {
    const log = dailyLog.get(date)
    const cal = log.meals.reduce((s, m) => s + (m.calories || 0), 0)
    const protein = log.meals.reduce((s, m) => s + (m.protein || 0), 0)
    const carbs = log.meals.reduce((s, m) => s + (m.carbs || 0), 0)
    const fat = log.meals.reduce((s, m) => s + (m.fat || 0), 0)
    return { calories: cal, protein, carbs, fat, water: log.water, burned: log.caloriesBurned }
  },
}

// ── Weight History ──
export const weightHistory = {
  getAll: () => db.get('weight_history', []),
  add: (weight, date = today()) => {
    const history = weightHistory.getAll()
    const existing = history.findIndex(h => h.date === date)
    if (existing >= 0) history[existing].weight = weight
    else history.push({ date, weight })
    history.sort((a, b) => a.date.localeCompare(b.date))
    db.set('weight_history', history)
    return history
  },
  getRecent: (days = 30) => {
    const history = weightHistory.getAll()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return history.filter(h => new Date(h.date) >= cutoff)
  },
}

// ── Body Measurements ──
export const measurements = {
  getAll: () => db.get('measurements', []),
  add: (m, date = today()) => {
    const all = measurements.getAll()
    const existing = all.findIndex(x => x.date === date)
    if (existing >= 0) all[existing] = { ...all[existing], ...m, date }
    else all.push({ ...m, date })
    all.sort((a, b) => a.date.localeCompare(b.date))
    db.set('measurements', all)
    return all
  },
  getLatest: () => {
    const all = measurements.getAll()
    return all.length > 0 ? all[all.length - 1] : null
  },
  getPrevious: () => {
    const all = measurements.getAll()
    return all.length > 1 ? all[all.length - 2] : null
  },
}

// ── Cycle Tracking ──
export const cycle = {
  get: () => db.get('cycle', { lastPeriodStart: null, averageLength: 32, entries: [] }),
  save: (data) => db.set('cycle', data),
  logPeriodStart: (date = today()) => {
    const data = cycle.get()
    data.lastPeriodStart = date
    data.entries.push({ type: 'period_start', date })
    const starts = data.entries.filter(e => e.type === 'period_start').map(e => e.date).sort()
    if (starts.length >= 2) {
      let totalDays = 0
      for (let i = 1; i < starts.length; i++) {
        totalDays += (new Date(starts[i]) - new Date(starts[i - 1])) / (1000 * 60 * 60 * 24)
      }
      data.averageLength = Math.round(totalDays / (starts.length - 1))
    }
    cycle.save(data)
    return data
  },
  getCurrentDay: () => {
    const data = cycle.get()
    if (!data.lastPeriodStart) return null
    const diff = (new Date(today()) - new Date(data.lastPeriodStart)) / (1000 * 60 * 60 * 24)
    return Math.floor(diff) + 1
  },
  getPhase: () => {
    const day = cycle.getCurrentDay()
    if (!day) return 'Unknown'
    const len = cycle.get().averageLength || 32
    if (day <= 5) return 'Menstrual'
    if (day <= 13) return 'Follicular'
    if (day <= 16) return 'Ovulatory'
    return 'Luteal'
  },
}

// ── Sleep Tracking ──
export const sleepHistory = {
  getAll: () => db.get('sleep_history', []),
  add: (hours, quality, date = today()) => {
    const all = sleepHistory.getAll()
    const existing = all.findIndex(x => x.date === date)
    if (existing >= 0) all[existing] = { date, hours, quality }
    else all.push({ date, hours, quality })
    all.sort((a, b) => a.date.localeCompare(b.date))
    db.set('sleep_history', all)
    dailyLog.setSleep(date, { hours, quality })
    return all
  },
  getRecent: (days = 7) => {
    const all = sleepHistory.getAll()
    return all.slice(-days)
  },
}

// ── Workout Library ──
export const WORKOUTS = [
  { id: 1, name: 'PCOS-Friendly Yoga Flow', emoji: '🧘', duration: 30, calories: 150, type: 'Low Impact', desc: 'Reduces cortisol, supports hormone balance', exercises: [
    { name: 'Cat-Cow Stretches', duration: '3 min', seconds: 180 },
    { name: 'Sun Salutation A', duration: '5 min', seconds: 300 },
    { name: 'Warrior I & II Flow', duration: '6 min', seconds: 360 },
    { name: 'Pigeon Pose (each side)', duration: '4 min', seconds: 240 },
    { name: 'Supine Twist', duration: '4 min', seconds: 240 },
    { name: 'Savasana', duration: '5 min', seconds: 300 },
  ]},
  { id: 2, name: 'Strength Training — Full Body', emoji: '💪', duration: 40, calories: 280, type: 'Strength', desc: 'Builds muscle, improves insulin sensitivity', exercises: [
    { name: 'Goblet Squats', sets: '3×12', seconds: 300 },
    { name: 'Dumbbell Rows', sets: '3×10 each', seconds: 300 },
    { name: 'Push-ups (modified ok)', sets: '3×10', seconds: 240 },
    { name: 'Romanian Deadlifts', sets: '3×12', seconds: 300 },
    { name: 'Overhead Press', sets: '3×10', seconds: 240 },
    { name: 'Plank Hold', sets: '3×30s', seconds: 180 },
  ]},
  { id: 3, name: 'Brisk Walking Program', emoji: '🚶‍♀️', duration: 25, calories: 120, type: 'Cardio', desc: 'Low-stress cardio that won\'t spike cortisol', exercises: [
    { name: 'Warm-up Walk', duration: '3 min', seconds: 180 },
    { name: 'Brisk Walk (3.5-4mph)', duration: '18 min', seconds: 1080 },
    { name: 'Cool-down Walk', duration: '4 min', seconds: 240 },
  ]},
  { id: 4, name: 'HIIT — PCOS Modified', emoji: '🔥', duration: 20, calories: 220, type: 'HIIT', desc: 'Short bursts, longer rest — cortisol-friendly', exercises: [
    { name: 'Jump Squats', duration: '20s on / 40s rest ×4', seconds: 240 },
    { name: 'Mountain Climbers', duration: '20s on / 40s rest ×4', seconds: 240 },
    { name: 'Burpees (low impact ok)', duration: '20s on / 40s rest ×4', seconds: 240 },
    { name: 'High Knees', duration: '20s on / 40s rest ×4', seconds: 240 },
  ]},
  { id: 5, name: 'Pilates Core & Flexibility', emoji: '🤸', duration: 35, calories: 180, type: 'Pilates', desc: 'Core strength without high stress', exercises: [
    { name: 'The Hundred', duration: '3 min', seconds: 180 },
    { name: 'Roll-Up', sets: '10 reps', seconds: 120 },
    { name: 'Single Leg Circles', sets: '8 each side', seconds: 180 },
    { name: 'Plank to Pike', sets: '10 reps', seconds: 120 },
    { name: 'Side-Lying Leg Lifts', sets: '12 each', seconds: 180 },
    { name: 'Spine Stretch Forward', duration: '3 min', seconds: 180 },
  ]},
  { id: 6, name: 'Evening Stretch & Relax', emoji: '🌙', duration: 15, calories: 50, type: 'Recovery', desc: 'Promotes better sleep and recovery', exercises: [
    { name: 'Neck Rolls', duration: '2 min', seconds: 120 },
    { name: 'Seated Forward Fold', duration: '3 min', seconds: 180 },
    { name: 'Butterfly Stretch', duration: '3 min', seconds: 180 },
    { name: 'Legs Up The Wall', duration: '5 min', seconds: 300 },
  ]},
]

// ── Meal Library ──
export const MEALS_DB = {
  breakfast: [
    { name: 'Greek Yogurt Bowl', details: 'Berries, chia seeds, walnuts', cal: 320, protein: 22, carbs: 28, fat: 14, emoji: '🌅' },
    { name: 'Veggie Egg Scramble', details: 'Spinach, mushrooms, avocado', cal: 340, protein: 24, carbs: 12, fat: 22, emoji: '🍳' },
    { name: 'Overnight Oats', details: 'Almond milk, flax, berries', cal: 310, protein: 14, carbs: 42, fat: 10, emoji: '🥣' },
    { name: 'Protein Smoothie', details: 'Spinach, banana, protein, almond butter', cal: 350, protein: 28, carbs: 32, fat: 12, emoji: '🥤' },
    { name: 'Avocado Toast (GF)', details: 'Eggs, cherry tomatoes, seeds', cal: 380, protein: 18, carbs: 28, fat: 22, emoji: '🥑' },
  ],
  lunch: [
    { name: 'Salmon & Quinoa Bowl', details: 'Roasted veggies, tahini dressing', cal: 480, protein: 34, carbs: 38, fat: 20, emoji: '🐟' },
    { name: 'Chicken Caesar (No Croutons)', details: 'Romaine, parmesan, light dressing', cal: 390, protein: 36, carbs: 10, fat: 24, emoji: '🥗' },
    { name: 'Turkey Lettuce Wraps', details: 'Avocado, tomato, mustard', cal: 340, protein: 30, carbs: 12, fat: 18, emoji: '🥬' },
    { name: 'Lentil Soup', details: 'Carrots, celery, cumin', cal: 320, protein: 18, carbs: 40, fat: 8, emoji: '🍲' },
    { name: 'Mediterranean Bowl', details: 'Falafel, hummus, tabbouleh', cal: 450, protein: 20, carbs: 42, fat: 22, emoji: '🧆' },
  ],
  dinner: [
    { name: 'Turkey Stir-Fry', details: 'Broccoli, bell peppers, cauliflower rice', cal: 420, protein: 38, carbs: 22, fat: 18, emoji: '🥘' },
    { name: 'Baked Cod with Veggies', details: 'Asparagus, sweet potato, lemon', cal: 380, protein: 32, carbs: 30, fat: 12, emoji: '🐠' },
    { name: 'Chicken & Veggie Curry', details: 'Coconut milk, spinach, chickpeas', cal: 450, protein: 34, carbs: 28, fat: 22, emoji: '🍛' },
    { name: 'Grilled Steak & Salad', details: 'Mixed greens, cherry tomatoes, olive oil', cal: 420, protein: 40, carbs: 10, fat: 24, emoji: '🥩' },
    { name: 'Shrimp Zoodles', details: 'Zucchini noodles, garlic, cherry tomatoes', cal: 310, protein: 28, carbs: 14, fat: 16, emoji: '🍤' },
  ],
  snacks: [
    { name: 'Apple + Almond Butter', details: '1 small apple, 1 tbsp almond butter', cal: 190, protein: 5, carbs: 25, fat: 9, emoji: '🍎' },
    { name: 'Hard Boiled Eggs', details: '2 eggs with everything seasoning', cal: 140, protein: 12, carbs: 1, fat: 10, emoji: '🥚' },
    { name: 'Hummus & Veggies', details: 'Carrots, cucumber, bell pepper', cal: 160, protein: 6, carbs: 18, fat: 8, emoji: '🥕' },
    { name: 'Mixed Nuts', details: '1/4 cup almonds, walnuts, cashews', cal: 180, protein: 6, carbs: 8, fat: 16, emoji: '🥜' },
    { name: 'Dark Chocolate', details: '2 squares 85%+ cacao', cal: 120, protein: 2, carbs: 8, fat: 10, emoji: '🍫' },
  ],
}

// ── Supplements Library ──
export const SUPPLEMENTS = [
  { name: 'Inositol', emoji: '💊', desc: '40:1 myo:d-chiro ratio, helps insulin resistance' },
  { name: 'Vitamin D', emoji: '☀️', desc: 'Most PCOS women are deficient' },
  { name: 'Omega-3', emoji: '🐟', desc: 'Anti-inflammatory, supports hormones' },
  { name: 'Magnesium', emoji: '🧲', desc: 'Helps sleep, cramps, and anxiety' },
  { name: 'Berberine', emoji: '🌿', desc: 'Natural insulin sensitizer' },
  { name: 'B Complex', emoji: '🅱️', desc: 'Energy, mood, and hormone support' },
  { name: 'Zinc', emoji: '⚡', desc: 'Helps acne and hair loss' },
  { name: 'Probiotics', emoji: '🦠', desc: 'Gut health and inflammation' },
]

// ── 7-Day Meal Plan ──
export const MEAL_PLAN = [
  { day: 'Monday', breakfast: 'Greek Yogurt Bowl + Berries', lunch: 'Salmon & Quinoa Bowl', dinner: 'Turkey Stir-Fry with Cauliflower Rice', snack: 'Apple + Almond Butter' },
  { day: 'Tuesday', breakfast: 'Veggie Egg Scramble', lunch: 'Chicken Caesar (No Croutons)', dinner: 'Baked Cod with Veggies', snack: 'Hard Boiled Eggs' },
  { day: 'Wednesday', breakfast: 'Overnight Oats', lunch: 'Lentil Soup + Side Salad', dinner: 'Chicken & Veggie Curry', snack: 'Hummus & Veggies' },
  { day: 'Thursday', breakfast: 'Protein Smoothie', lunch: 'Turkey Lettuce Wraps', dinner: 'Grilled Steak & Salad', snack: 'Mixed Nuts' },
  { day: 'Friday', breakfast: 'Avocado Toast (GF)', lunch: 'Mediterranean Bowl', dinner: 'Shrimp Zoodles', snack: 'Dark Chocolate + Berries' },
  { day: 'Saturday', breakfast: 'Greek Yogurt Bowl + Granola', lunch: 'Salmon Poke Bowl', dinner: 'Turkey Meatballs + Zoodles', snack: 'Apple + Almond Butter' },
  { day: 'Sunday', breakfast: 'Veggie Omelette', lunch: 'Chicken Soup + Veggies', dinner: 'Baked Salmon + Roasted Veggies', snack: 'Mixed Nuts' },
]

// ── Daily Challenges ──
export const CHALLENGES = [
  { title: 'Hydration Hero', desc: 'Drink 8 glasses of water today', icon: '💧', check: (log) => log.water >= 8 },
  { title: 'Protein Power', desc: 'Hit your protein goal (130g)', icon: '💪', check: (log) => log.meals.reduce((s, m) => s + (m.protein || 0), 0) >= 130 },
  { title: 'Move Your Body', desc: 'Complete any workout today', icon: '🏃‍♀️', check: (log) => log.workouts.length > 0 },
  { title: 'Symptom Tracker', desc: 'Log your symptoms today', icon: '📝', check: (log) => log.symptoms.length > 0 },
  { title: 'No Added Sugar', desc: 'Avoid all added sugars today', icon: '🚫', check: () => false },
  { title: '10K Steps', desc: 'Walk 10,000 steps today', icon: '👟', check: () => false },
  { title: 'Meditation', desc: '5 minutes of mindfulness', icon: '🧘', check: () => false },
  { title: 'Sleep Well', desc: 'Get 7+ hours of sleep', icon: '😴', check: (log) => log.sleep && log.sleep.hours >= 7 },
]

// ── Achievements ──
export const ACHIEVEMENTS = [
  { id: 'first_meal', name: 'First Bite', desc: 'Log your first meal', icon: '🍽️', check: () => db.get('active_dates', []).length > 0 },
  { id: 'streak_3', name: 'On a Roll', desc: '3-day streak', icon: '🔥', check: () => streak.get() >= 3 },
  { id: 'streak_7', name: 'Week Warrior', desc: '7-day streak', icon: '⚔️', check: () => streak.get() >= 7 },
  { id: 'streak_30', name: 'Unstoppable', desc: '30-day streak', icon: '🏆', check: () => streak.get() >= 30 },
  { id: 'first_workout', name: 'Sweat Starter', desc: 'Complete your first workout', icon: '💪', check: () => { for (let i = 0; i < 90; i++) { const d = new Date(); d.setDate(d.getDate() - i); if (dailyLog.get(d.toISOString().split('T')[0]).workouts.length > 0) return true } return false } },
  { id: 'water_8', name: 'Hydration Master', desc: 'Drink 8 glasses in a day', icon: '💧', check: () => { for (let i = 0; i < 90; i++) { const d = new Date(); d.setDate(d.getDate() - i); if (dailyLog.get(d.toISOString().split('T')[0]).water >= 8) return true } return false } },
  { id: 'weight_10', name: 'Weigh-In Pro', desc: 'Log weight 10 times', icon: '⚖️', check: () => weightHistory.getAll().length >= 10 },
  { id: 'meals_50', name: 'Meal Logger', desc: 'Log 50 meals total', icon: '📋', check: () => { let c = 0; for (let i = 0; i < 90; i++) { const d = new Date(); d.setDate(d.getDate() - i); c += dailyLog.get(d.toISOString().split('T')[0]).meals.length } return c >= 50 } },
  { id: 'cycle_tracker', name: 'Cycle Savvy', desc: 'Track 2+ cycles', icon: '🌙', check: () => cycle.get().entries.filter(e => e.type === 'period_start').length >= 2 },
  { id: 'symptom_7', name: 'Body Listener', desc: 'Log symptoms for 7 days', icon: '🩺', check: () => { let c = 0; for (let i = 0; i < 90; i++) { const d = new Date(); d.setDate(d.getDate() - i); if (dailyLog.get(d.toISOString().split('T')[0]).symptoms.length > 0) c++ } return c >= 7 } },
]

// ── Goals ──
export const goals = {
  get: () => db.get('goals', { calories: 1800, protein: 130, carbs: 160, fat: 65, water: 8, sleepHours: 8 }),
  save: (g) => db.set('goals', g),
}

// ── Chat History ──
export const chatHistory = {
  get: () => db.get('chat_history', [
    { role: 'bot', text: "Hi! I'm your PCOS AI Coach 🤖 I can help with meal suggestions, workout plans, symptom tracking, and general PCOS management tips. What would you like to know?", ts: new Date().toISOString() }
  ]),
  add: (msg) => {
    const history = chatHistory.get()
    history.push({ ...msg, ts: new Date().toISOString() })
    if (history.length > 100) history.splice(0, history.length - 100)
    db.set('chat_history', history)
    return history
  },
  clear: () => db.set('chat_history', [
    { role: 'bot', text: "Chat cleared! How can I help you today?", ts: new Date().toISOString() }
  ]),
}

// ── Streak ──
export const streak = {
  get: () => {
    const dates = db.get('active_dates', [])
    if (dates.length === 0) return 0
    const sorted = [...dates].sort().reverse()
    let count = 0
    const d = new Date()
    for (let i = 0; i < 365; i++) {
      const dateStr = d.toISOString().split('T')[0]
      if (sorted.includes(dateStr)) { count++; d.setDate(d.getDate() - 1) }
      else break
    }
    return count
  },
  markToday: () => {
    const dates = db.get('active_dates', [])
    const t = today()
    if (!dates.includes(t)) {
      dates.push(t)
      db.set('active_dates', dates)
    }
  },
  getTotalDays: () => db.get('active_dates', []).length,
}

// ── Symptom History ──
export const SYMPTOMS = [
  { emoji: '😤', label: 'Acne' },
  { emoji: '💇‍♀️', label: 'Hair Loss' },
  { emoji: '😴', label: 'Fatigue' },
  { emoji: '😰', label: 'Anxiety' },
  { emoji: '🤕', label: 'Headache' },
  { emoji: '🤢', label: 'Bloating' },
  { emoji: '🌙', label: 'Insomnia' },
  { emoji: '🍫', label: 'Cravings' },
  { emoji: '🔥', label: 'Hot Flashes' },
]

export const symptomHistory = {
  getMostCommon: () => {
    const freq = {}
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const log = dailyLog.get(d.toISOString().split('T')[0])
      log.symptoms.forEach(s => { freq[s] = (freq[s] || 0) + 1 })
    }
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0])
  },
}

// ── Theme ──
export const theme = {
  get: () => db.get('theme', 'light'),
  set: (t) => { db.set('theme', t); document.documentElement.setAttribute('data-theme', t) },
  init: () => { document.documentElement.setAttribute('data-theme', theme.get()) },
}

// ── Settings ──
export const settings = {
  get: () => db.get('settings', { notifications: true, darkMode: false, units: 'lbs' }),
  save: (s) => db.set('settings', s),
}
