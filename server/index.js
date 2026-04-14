import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || uuidv4();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(join(__dirname, '..', 'dist')));

// ══════════════════════════════════════════════
// DATABASE — Full Schema
// ══════════════════════════════════════════════
const db = new Database(join(__dirname, 'pcos_coach.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  -- Users & Auth
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
    name TEXT NOT NULL, avatar TEXT, age INTEGER, start_weight REAL, goal TEXT,
    activity_level TEXT, symptoms TEXT DEFAULT '[]', allergies TEXT DEFAULT '[]',
    dietary_prefs TEXT DEFAULT '[]', language TEXT DEFAULT 'en', units TEXT DEFAULT 'imperial',
    xp INTEGER DEFAULT 0, level INTEGER DEFAULT 1, subscription TEXT DEFAULT 'free',
    onboarding_done INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Daily Logs
  CREATE TABLE IF NOT EXISTS daily_logs (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, date TEXT NOT NULL,
    meals TEXT DEFAULT '[]', water INTEGER DEFAULT 0, workouts TEXT DEFAULT '[]',
    symptoms TEXT DEFAULT '[]', weight REAL, calories_burned INTEGER DEFAULT 0,
    sleep_hours REAL, sleep_quality INTEGER, supplements TEXT DEFAULT '[]',
    medications TEXT DEFAULT '[]', mood INTEGER, energy INTEGER, stress INTEGER,
    pain_level INTEGER, notes TEXT, fasting_start TEXT, fasting_end TEXT,
    step_count INTEGER DEFAULT 0, heart_rate_avg INTEGER,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id), UNIQUE(user_id, date)
  );

  -- Weight History
  CREATE TABLE IF NOT EXISTS weight_history (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, date TEXT NOT NULL, weight REAL NOT NULL,
    body_fat REAL, muscle_mass REAL, created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id), UNIQUE(user_id, date)
  );

  -- Body Measurements
  CREATE TABLE IF NOT EXISTS measurements (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, date TEXT NOT NULL,
    waist REAL, hips REAL, bust REAL, arms REAL, thighs REAL, neck REAL,
    body_fat REAL, created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id), UNIQUE(user_id, date)
  );

  -- Cycle Data
  CREATE TABLE IF NOT EXISTS cycle_data (
    user_id TEXT PRIMARY KEY, last_period_start TEXT, average_length INTEGER DEFAULT 32,
    entries TEXT DEFAULT '[]', updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Sleep History
  CREATE TABLE IF NOT EXISTS sleep_history (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, date TEXT NOT NULL,
    hours REAL NOT NULL, quality INTEGER NOT NULL, bedtime TEXT, waketime TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id), UNIQUE(user_id, date)
  );

  -- Chat History
  CREATE TABLE IF NOT EXISTS chat_history (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Goals
  CREATE TABLE IF NOT EXISTS goals (
    user_id TEXT PRIMARY KEY, calories INTEGER DEFAULT 1800, protein INTEGER DEFAULT 130,
    carbs INTEGER DEFAULT 160, fat INTEGER DEFAULT 65, fiber INTEGER DEFAULT 25,
    water INTEGER DEFAULT 8, sleep_hours REAL DEFAULT 8, steps INTEGER DEFAULT 10000,
    workouts_per_week INTEGER DEFAULT 4, updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Notifications / Reminders
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL,
    body TEXT, time TEXT NOT NULL, enabled INTEGER DEFAULT 1, days TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Achievements
  CREATE TABLE IF NOT EXISTS achievements (
    user_id TEXT NOT NULL, achievement_id TEXT NOT NULL, earned_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, achievement_id), FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Active Dates (streak)
  CREATE TABLE IF NOT EXISTS active_dates (
    user_id TEXT NOT NULL, date TEXT NOT NULL,
    PRIMARY KEY (user_id, date), FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Recipes
  CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY, user_id TEXT, name TEXT NOT NULL, description TEXT,
    category TEXT, prep_time INTEGER, cook_time INTEGER, servings INTEGER DEFAULT 1,
    ingredients TEXT DEFAULT '[]', instructions TEXT DEFAULT '[]',
    calories INTEGER, protein INTEGER, carbs INTEGER, fat INTEGER, fiber INTEGER,
    tags TEXT DEFAULT '[]', image TEXT, is_public INTEGER DEFAULT 0,
    rating REAL DEFAULT 0, rating_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Saved Recipes
  CREATE TABLE IF NOT EXISTS saved_recipes (
    user_id TEXT NOT NULL, recipe_id TEXT NOT NULL,
    PRIMARY KEY (user_id, recipe_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Grocery Lists
  CREATE TABLE IF NOT EXISTS grocery_lists (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT DEFAULT 'Shopping List',
    items TEXT DEFAULT '[]', completed TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Fasting Logs
  CREATE TABLE IF NOT EXISTS fasting_logs (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, start_time TEXT NOT NULL,
    end_time TEXT, duration_hours REAL, type TEXT DEFAULT '16:8',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Custom Workouts
  CREATE TABLE IF NOT EXISTS custom_workouts (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL,
    exercises TEXT DEFAULT '[]', duration INTEGER, calories INTEGER,
    type TEXT, created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Challenges
  CREATE TABLE IF NOT EXISTS challenges (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, type TEXT,
    target INTEGER, unit TEXT, duration_days INTEGER, icon TEXT,
    start_date TEXT, end_date TEXT, is_global INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- User Challenge Progress
  CREATE TABLE IF NOT EXISTS user_challenges (
    user_id TEXT NOT NULL, challenge_id TEXT NOT NULL,
    progress INTEGER DEFAULT 0, completed INTEGER DEFAULT 0,
    joined_at TEXT DEFAULT (datetime('now')), completed_at TEXT,
    PRIMARY KEY (user_id, challenge_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Mood History
  CREATE TABLE IF NOT EXISTS mood_history (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, date TEXT NOT NULL,
    mood INTEGER NOT NULL, energy INTEGER, stress INTEGER,
    notes TEXT, created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id), UNIQUE(user_id, date)
  );

  -- Blood Pressure
  CREATE TABLE IF NOT EXISTS blood_pressure (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, date TEXT NOT NULL,
    systolic INTEGER NOT NULL, diastolic INTEGER NOT NULL, pulse INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Blood Sugar
  CREATE TABLE IF NOT EXISTS blood_sugar (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, date TEXT NOT NULL,
    value REAL NOT NULL, unit TEXT DEFAULT 'mg/dL', timing TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Progress Photos
  CREATE TABLE IF NOT EXISTS progress_photos (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, date TEXT NOT NULL,
    photo_url TEXT NOT NULL, angle TEXT, notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Community Posts
  CREATE TABLE IF NOT EXISTS community_posts (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, content TEXT NOT NULL,
    type TEXT DEFAULT 'post', likes INTEGER DEFAULT 0, comments INTEGER DEFAULT 0,
    is_anonymous INTEGER DEFAULT 0, tags TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Post Likes
  CREATE TABLE IF NOT EXISTS post_likes (
    user_id TEXT NOT NULL, post_id TEXT NOT NULL,
    PRIMARY KEY (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Consultations
  CREATE TABLE IF NOT EXISTS consultations (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, expert_name TEXT NOT NULL,
    expert_type TEXT, scheduled_at TEXT, duration INTEGER DEFAULT 30,
    status TEXT DEFAULT 'scheduled', notes TEXT, rating INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Wearable Connections
  CREATE TABLE IF NOT EXISTS wearable_connections (
    user_id TEXT NOT NULL, provider TEXT NOT NULL, connected INTEGER DEFAULT 1,
    last_sync TEXT, access_token TEXT,
    PRIMARY KEY (user_id, provider),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Appointments
  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
    type TEXT, doctor TEXT, date TEXT NOT NULL, time TEXT, location TEXT,
    notes TEXT, reminder INTEGER DEFAULT 1, completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Water Reminders Log
  CREATE TABLE IF NOT EXISTS water_reminders (
    user_id TEXT PRIMARY KEY, interval_minutes INTEGER DEFAULT 60,
    start_time TEXT DEFAULT '08:00', end_time TEXT DEFAULT '22:00',
    enabled INTEGER DEFAULT 1, FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Daily Reports Cache
  CREATE TABLE IF NOT EXISTS daily_reports (
    user_id TEXT NOT NULL, date TEXT NOT NULL, report TEXT NOT NULL,
    PRIMARY KEY (user_id, date), FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_weight_user_date ON weight_history(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_sleep_user_date ON sleep_history(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_history(user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_mood_user_date ON mood_history(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
  CREATE INDEX IF NOT EXISTS idx_community_created ON community_posts(created_at);
`);

// ══════════════════════════════════════════════
// AUTH MIDDLEWARE
// ══════════════════════════════════════════════
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch { return res.status(401).json({ error: 'Invalid token' }); }
}

function getOrCreateLog(userId, date) {
  let log = db.prepare('SELECT * FROM daily_logs WHERE user_id = ? AND date = ?').get(userId, date);
  if (!log) {
    db.prepare('INSERT INTO daily_logs (id, user_id, date) VALUES (?, ?, ?)').run(uuidv4(), userId, date);
    log = db.prepare('SELECT * FROM daily_logs WHERE user_id = ? AND date = ?').get(userId, date);
  }
  return {
    ...log,
    meals: JSON.parse(log.meals || '[]'), workouts: JSON.parse(log.workouts || '[]'),
    symptoms: JSON.parse(log.symptoms || '[]'), supplements: JSON.parse(log.supplements || '[]'),
    medications: JSON.parse(log.medications || '[]'),
  };
}

function addXP(userId, amount) {
  const user = db.prepare('SELECT xp, level FROM users WHERE id = ?').get(userId);
  const newXP = (user.xp || 0) + amount;
  const newLevel = Math.floor(newXP / 500) + 1;
  db.prepare('UPDATE users SET xp=?, level=? WHERE id=?').run(newXP, newLevel, userId);
  return { xp: newXP, level: newLevel, leveledUp: newLevel > (user.level || 1) };
}

// ══════════════════════════════════════════════
// AUTH ROUTES (1-5)
// ══════════════════════════════════════════════
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, name, age, startWeight, goal, activityLevel, symptoms } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Required fields missing' });
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) return res.status(409).json({ error: 'Email already registered' });
    const id = uuidv4();
    db.prepare(`INSERT INTO users (id, email, password_hash, name, age, start_weight, goal, activity_level, symptoms) VALUES (?,?,?,?,?,?,?,?,?)`).run(id, email, bcrypt.hashSync(password, 10), name, age || null, startWeight || null, goal || null, activityLevel || null, JSON.stringify(symptoms || []));
    db.prepare('INSERT INTO goals (user_id) VALUES (?)').run(id);
    db.prepare('INSERT INTO cycle_data (user_id) VALUES (?)').run(id);
    if (startWeight) {
      const today = new Date().toISOString().split('T')[0];
      db.prepare('INSERT INTO weight_history (id, user_id, date, weight) VALUES (?,?,?,?)').run(uuidv4(), id, today, parseFloat(startWeight));
    }
    const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id, email, name, age, goal, activityLevel, symptoms: symptoms || [], xp: 0, level: 1 } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, age: user.age, goal: user.goal, activityLevel: user.activity_level, symptoms: JSON.parse(user.symptoms), xp: user.xp, level: user.level, subscription: user.subscription } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ ...user, symptoms: JSON.parse(user.symptoms), allergies: JSON.parse(user.allergies), dietary_prefs: JSON.parse(user.dietary_prefs), password_hash: undefined });
});

app.put('/api/auth/profile', auth, (req, res) => {
  const { name, age, goal, activityLevel, symptoms, allergies, dietaryPrefs, language, units, avatar } = req.body;
  db.prepare(`UPDATE users SET name=COALESCE(?,name), age=COALESCE(?,age), goal=COALESCE(?,goal), activity_level=COALESCE(?,activity_level), symptoms=COALESCE(?,symptoms), allergies=COALESCE(?,allergies), dietary_prefs=COALESCE(?,dietary_prefs), language=COALESCE(?,language), units=COALESCE(?,units), avatar=COALESCE(?,avatar), updated_at=datetime('now') WHERE id=?`).run(name, age, goal, activityLevel, symptoms ? JSON.stringify(symptoms) : null, allergies ? JSON.stringify(allergies) : null, dietaryPrefs ? JSON.stringify(dietaryPrefs) : null, language, units, avatar, req.userId);
  res.json({ success: true });
});

app.get('/api/auth/stats', auth, (req, res) => {
  const user = db.prepare('SELECT xp, level, subscription, created_at FROM users WHERE id=?').get(req.userId);
  const streak = db.prepare('SELECT COUNT(*) as c FROM active_dates WHERE user_id=?').get(req.userId);
  const achievements = db.prepare('SELECT COUNT(*) as c FROM achievements WHERE user_id=?').get(req.userId);
  const nextLevelXP = (user.level || 1) * 500;
  res.json({ ...user, totalDays: streak.c, achievements: achievements.c, nextLevelXP, progress: ((user.xp || 0) % 500) / 500 });
});

// ══════════════════════════════════════════════
// DAILY LOG ROUTES (6-15)
// ══════════════════════════════════════════════
app.get('/api/logs/:date', auth, (req, res) => {
  const log = getOrCreateLog(req.userId, req.params.date);
  db.prepare('INSERT OR IGNORE INTO active_dates (user_id, date) VALUES (?, ?)').run(req.userId, req.params.date);
  res.json(log);
});

app.get('/api/logs', auth, (req, res) => {
  const { from, to } = req.query;
  const logs = db.prepare('SELECT * FROM daily_logs WHERE user_id=? AND date>=? AND date<=? ORDER BY date').all(req.userId, from || '2000-01-01', to || '2099-12-31');
  res.json(logs.map(l => ({ ...l, meals: JSON.parse(l.meals), workouts: JSON.parse(l.workouts), symptoms: JSON.parse(l.symptoms), supplements: JSON.parse(l.supplements), medications: JSON.parse(l.medications) })));
});

app.post('/api/logs/:date/meals', auth, (req, res) => {
  const log = getOrCreateLog(req.userId, req.params.date);
  const meal = { ...req.body, id: Date.now(), loggedAt: new Date().toISOString() };
  log.meals.push(meal);
  db.prepare('UPDATE daily_logs SET meals=?, updated_at=datetime(\'now\') WHERE user_id=? AND date=?').run(JSON.stringify(log.meals), req.userId, req.params.date);
  db.prepare('INSERT OR IGNORE INTO active_dates (user_id, date) VALUES (?, ?)').run(req.userId, req.params.date);
  addXP(req.userId, 5);
  res.json(meal);
});

app.delete('/api/logs/:date/meals/:mealId', auth, (req, res) => {
  const log = getOrCreateLog(req.userId, req.params.date);
  log.meals = log.meals.filter(m => m.id !== parseInt(req.params.mealId));
  db.prepare('UPDATE daily_logs SET meals=?, updated_at=datetime(\'now\') WHERE user_id=? AND date=?').run(JSON.stringify(log.meals), req.userId, req.params.date);
  res.json({ success: true });
});

app.put('/api/logs/:date/water', auth, (req, res) => {
  const { glasses } = req.body;
  getOrCreateLog(req.userId, req.params.date);
  db.prepare('UPDATE daily_logs SET water=?, updated_at=datetime(\'now\') WHERE user_id=? AND date=?').run(Math.max(0, Math.min(15, glasses)), req.userId, req.params.date);
  db.prepare('INSERT OR IGNORE INTO active_dates (user_id, date) VALUES (?, ?)').run(req.userId, req.params.date);
  addXP(req.userId, 2);
  res.json({ water: glasses });
});

app.post('/api/logs/:date/workouts', auth, (req, res) => {
  const log = getOrCreateLog(req.userId, req.params.date);
  const workout = { ...req.body, id: Date.now(), completedAt: new Date().toISOString() };
  log.workouts.push(workout);
  const cal = log.workouts.reduce((s, w) => s + (w.calories || 0), 0);
  db.prepare('UPDATE daily_logs SET workouts=?, calories_burned=?, updated_at=datetime(\'now\') WHERE user_id=? AND date=?').run(JSON.stringify(log.workouts), cal, req.userId, req.params.date);
  db.prepare('INSERT OR IGNORE INTO active_dates (user_id, date) VALUES (?, ?)').run(req.userId, req.params.date);
  addXP(req.userId, 20);
  res.json(workout);
});

app.put('/api/logs/:date/symptoms', auth, (req, res) => {
  getOrCreateLog(req.userId, req.params.date);
  db.prepare('UPDATE daily_logs SET symptoms=?, updated_at=datetime(\'now\') WHERE user_id=? AND date=?').run(JSON.stringify(req.body.symptoms), req.userId, req.params.date);
  addXP(req.userId, 3);
  res.json({ success: true });
});

app.put('/api/logs/:date/sleep', auth, (req, res) => {
  const { hours, quality, bedtime, waketime } = req.body;
  getOrCreateLog(req.userId, req.params.date);
  db.prepare('UPDATE daily_logs SET sleep_hours=?, sleep_quality=?, updated_at=datetime(\'now\') WHERE user_id=? AND date=?').run(hours, quality, req.userId, req.params.date);
  db.prepare('INSERT OR REPLACE INTO sleep_history (id, user_id, date, hours, quality, bedtime, waketime) VALUES (COALESCE((SELECT id FROM sleep_history WHERE user_id=? AND date=?),?),?,?,?,?,?,?)').run(req.userId, req.params.date, uuidv4(), req.userId, req.params.date, hours, quality, bedtime || null, waketime || null);
  db.prepare('INSERT OR IGNORE INTO active_dates (user_id, date) VALUES (?, ?)').run(req.userId, req.params.date);
  addXP(req.userId, 5);
  res.json({ success: true });
});

app.post('/api/logs/:date/supplements', auth, (req, res) => {
  const log = getOrCreateLog(req.userId, req.params.date);
  const supp = { ...req.body, id: Date.now(), takenAt: new Date().toISOString() };
  log.supplements.push(supp);
  db.prepare('UPDATE daily_logs SET supplements=?, updated_at=datetime(\'now\') WHERE user_id=? AND date=?').run(JSON.stringify(log.supplements), req.userId, req.params.date);
  addXP(req.userId, 3);
  res.json(supp);
});

app.delete('/api/logs/:date/supplements/:suppId', auth, (req, res) => {
  const log = getOrCreateLog(req.userId, req.params.date);
  log.supplements = log.supplements.filter(s => s.id !== parseInt(req.params.suppId));
  db.prepare('UPDATE daily_logs SET supplements=?, updated_at=datetime(\'now\') WHERE user_id=? AND date=?').run(JSON.stringify(log.supplements), req.userId, req.params.date);
  res.json({ success: true });
});

app.post('/api/logs/:date/medications', auth, (req, res) => {
  const log = getOrCreateLog(req.userId, req.params.date);
  const med = { ...req.body, id: Date.now(), takenAt: new Date().toISOString() };
  log.medications.push(med);
  db.prepare('UPDATE daily_logs SET medications=?, updated_at=datetime(\'now\') WHERE user_id=? AND date=?').run(JSON.stringify(log.medications), req.userId, req.params.date);
  res.json(med);
});

// ══════════════════════════════════════════════
// MOOD / ENERGY / STRESS (16-18)
// ══════════════════════════════════════════════
app.put('/api/logs/:date/mood', auth, (req, res) => {
  const { mood, energy, stress, notes } = req.body;
  getOrCreateLog(req.userId, req.params.date);
  db.prepare('UPDATE daily_logs SET mood=?, energy=?, stress=?, notes=?, updated_at=datetime(\'now\') WHERE user_id=? AND date=?').run(mood, energy, stress, notes || null, req.userId, req.params.date);
  db.prepare('INSERT OR REPLACE INTO mood_history (id, user_id, date, mood, energy, stress, notes) VALUES (COALESCE((SELECT id FROM mood_history WHERE user_id=? AND date=?),?),?,?,?,?,?,?)').run(req.userId, req.params.date, uuidv4(), req.userId, req.params.date, mood, energy || null, stress || null, notes || null);
  db.prepare('INSERT OR IGNORE INTO active_dates (user_id, date) VALUES (?, ?)').run(req.userId, req.params.date);
  addXP(req.userId, 3);
  res.json({ success: true });
});

app.get('/api/mood', auth, (req, res) => {
  const { days } = req.query;
  const data = days
    ? db.prepare('SELECT * FROM mood_history WHERE user_id=? AND date>=date(\'now\',?) ORDER BY date').all(req.userId, `-${days} days`)
    : db.prepare('SELECT * FROM mood_history WHERE user_id=? ORDER BY date DESC LIMIT 90').all(req.userId);
  res.json(data);
});

// ══════════════════════════════════════════════
// WEIGHT (19-20)
// ══════════════════════════════════════════════
app.get('/api/weight', auth, (req, res) => {
  const { days } = req.query;
  const data = days
    ? db.prepare('SELECT * FROM weight_history WHERE user_id=? AND date>=date(\'now\',?) ORDER BY date').all(req.userId, `-${days} days`)
    : db.prepare('SELECT * FROM weight_history WHERE user_id=? ORDER BY date').all(req.userId);
  res.json(data);
});

app.post('/api/weight', auth, (req, res) => {
  const { weight, bodyFat, muscleMass, date } = req.body;
  const d = date || new Date().toISOString().split('T')[0];
  db.prepare('INSERT OR REPLACE INTO weight_history (id, user_id, date, weight, body_fat, muscle_mass) VALUES (COALESCE((SELECT id FROM weight_history WHERE user_id=? AND date=?),?),?,?,?,?,?)').run(req.userId, d, uuidv4(), req.userId, d, weight, bodyFat || null, muscleMass || null);
  getOrCreateLog(req.userId, d);
  db.prepare('UPDATE daily_logs SET weight=?, updated_at=datetime(\'now\') WHERE user_id=? AND date=?').run(weight, req.userId, d);
  addXP(req.userId, 10);
  res.json({ success: true });
});

// ══════════════════════════════════════════════
// MEASUREMENTS (21)
// ══════════════════════════════════════════════
app.get('/api/measurements', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM measurements WHERE user_id=? ORDER BY date DESC').all(req.userId));
});

app.post('/api/measurements', auth, (req, res) => {
  const { date, waist, hips, bust, arms, thighs, neck, bodyFat } = req.body;
  const d = date || new Date().toISOString().split('T')[0];
  db.prepare('INSERT OR REPLACE INTO measurements (id, user_id, date, waist, hips, bust, arms, thighs, neck, body_fat) VALUES (COALESCE((SELECT id FROM measurements WHERE user_id=? AND date=?),?),?,?,?,?,?,?,?,?,?)').run(req.userId, d, uuidv4(), req.userId, d, waist || null, hips || null, bust || null, arms || null, thighs || null, neck || null, bodyFat || null);
  addXP(req.userId, 10);
  res.json({ success: true });
});

// ══════════════════════════════════════════════
// SLEEP (22)
// ══════════════════════════════════════════════
app.get('/api/sleep', auth, (req, res) => {
  const { days } = req.query;
  const data = days
    ? db.prepare('SELECT * FROM sleep_history WHERE user_id=? AND date>=date(\'now\',?) ORDER BY date').all(req.userId, `-${days} days`)
    : db.prepare('SELECT * FROM sleep_history WHERE user_id=? ORDER BY date DESC').all(req.userId);
  res.json(data);
});

// ══════════════════════════════════════════════
// CYCLE (23-24)
// ══════════════════════════════════════════════
app.get('/api/cycle', auth, (req, res) => {
  const data = db.prepare('SELECT * FROM cycle_data WHERE user_id=?').get(req.userId);
  if (!data) return res.json({ lastPeriodStart: null, averageLength: 32, entries: [] });
  res.json({ ...data, entries: JSON.parse(data.entries || '[]') });
});

app.post('/api/cycle/period', auth, (req, res) => {
  const date = req.body.date || new Date().toISOString().split('T')[0];
  const current = db.prepare('SELECT * FROM cycle_data WHERE user_id=?').get(req.userId);
  const entries = current ? JSON.parse(current.entries || '[]') : [];
  entries.push({ type: 'period_start', date });
  const starts = entries.filter(e => e.type === 'period_start').map(e => e.date).sort();
  let avgLength = 32;
  if (starts.length >= 2) {
    let total = 0;
    for (let i = 1; i < starts.length; i++) total += (new Date(starts[i]) - new Date(starts[i - 1])) / (1000 * 60 * 60 * 24);
    avgLength = Math.round(total / (starts.length - 1));
  }
  db.prepare('INSERT OR REPLACE INTO cycle_data (user_id, last_period_start, average_length, entries, updated_at) VALUES (?,?,?,?,datetime(\'now\'))').run(req.userId, date, avgLength, JSON.stringify(entries));
  addXP(req.userId, 15);
  res.json({ lastPeriodStart: date, averageLength: avgLength, entries });
});

// ══════════════════════════════════════════════
// BLOOD PRESSURE (25)
// ══════════════════════════════════════════════
app.get('/api/blood-pressure', auth, (req, res) => {
  const { days } = req.query;
  res.json(days
    ? db.prepare('SELECT * FROM blood_pressure WHERE user_id=? AND date>=date(\'now\',?) ORDER BY date DESC').all(req.userId, `-${days} days`)
    : db.prepare('SELECT * FROM blood_pressure WHERE user_id=? ORDER BY date DESC LIMIT 90').all(req.userId));
});

app.post('/api/blood-pressure', auth, (req, res) => {
  const { systolic, diastolic, pulse, date } = req.body;
  db.prepare('INSERT INTO blood_pressure (id, user_id, date, systolic, diastolic, pulse) VALUES (?,?,?,?,?,?)').run(uuidv4(), req.userId, date || new Date().toISOString().split('T')[0], systolic, diastolic, pulse || null);
  addXP(req.userId, 5);
  res.json({ success: true });
});

// ══════════════════════════════════════════════
// BLOOD SUGAR (26)
// ══════════════════════════════════════════════
app.get('/api/blood-sugar', auth, (req, res) => {
  const { days } = req.query;
  res.json(days
    ? db.prepare('SELECT * FROM blood_sugar WHERE user_id=? AND date>=date(\'now\',?) ORDER BY date DESC').all(req.userId, `-${days} days`)
    : db.prepare('SELECT * FROM blood_sugar WHERE user_id=? ORDER BY date DESC LIMIT 90').all(req.userId));
});

app.post('/api/blood-sugar', auth, (req, res) => {
  const { value, unit, timing, date } = req.body;
  db.prepare('INSERT INTO blood_sugar (id, user_id, date, value, unit, timing) VALUES (?,?,?,?,?,?)').run(uuidv4(), req.userId, date || new Date().toISOString().split('T')[0], value, unit || 'mg/dL', timing || null);
  addXP(req.userId, 5);
  res.json({ success: true });
});

// ══════════════════════════════════════════════
// GOALS (27-28)
// ══════════════════════════════════════════════
app.get('/api/goals', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM goals WHERE user_id=?').get(req.userId) || { calories: 1800, protein: 130, carbs: 160, fat: 65, fiber: 25, water: 8, sleep_hours: 8, steps: 10000, workouts_per_week: 4 });
});

app.put('/api/goals', auth, (req, res) => {
  const g = req.body;
  db.prepare('INSERT OR REPLACE INTO goals (user_id, calories, protein, carbs, fat, fiber, water, sleep_hours, steps, workouts_per_week, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,datetime(\'now\'))').run(req.userId, g.calories || 1800, g.protein || 130, g.carbs || 160, g.fat || 65, g.fiber || 25, g.water || 8, g.sleepHours || 8, g.steps || 10000, g.workoutsPerWeek || 4);
  res.json({ success: true });
});

// ══════════════════════════════════════════════
// CHAT (29-31)
// ══════════════════════════════════════════════
app.get('/api/chat', auth, (req, res) => {
  res.json(db.prepare('SELECT role, content as text, created_at as ts FROM chat_history WHERE user_id=? ORDER BY created_at DESC LIMIT 100').all(req.userId).reverse());
});

app.post('/api/chat', auth, (req, res) => {
  const { role, content } = req.body;
  db.prepare('INSERT INTO chat_history (id, user_id, role, content) VALUES (?,?,?,?)').run(uuidv4(), req.userId, role, content);
  const count = db.prepare('SELECT COUNT(*) as c FROM chat_history WHERE user_id=?').get(req.userId).c;
  if (count > 200) db.prepare('DELETE FROM chat_history WHERE id IN (SELECT id FROM chat_history WHERE user_id=? ORDER BY created_at ASC LIMIT ?)').run(req.userId, count - 200);
  res.json({ success: true });
});

app.delete('/api/chat', auth, (req, res) => {
  db.prepare('DELETE FROM chat_history WHERE user_id=?').run(req.userId);
  res.json({ success: true });
});

// ══════════════════════════════════════════════
// NOTIFICATIONS (32-35)
// ══════════════════════════════════════════════
app.get('/api/notifications', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY time').all(req.userId).map(n => ({ ...n, days: JSON.parse(n.days || '[]'), enabled: !!n.enabled })));
});

app.post('/api/notifications', auth, (req, res) => {
  const { type, title, body, time, days } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO notifications (id, user_id, type, title, body, time, days) VALUES (?,?,?,?,?,?,?)').run(id, req.userId, type, title, body || '', time, JSON.stringify(days || []));
  res.json({ id });
});

app.put('/api/notifications/:id', auth, (req, res) => {
  const { enabled, time, title, body, days } = req.body;
  db.prepare('UPDATE notifications SET enabled=COALESCE(?,enabled), time=COALESCE(?,time), title=COALESCE(?,title), body=COALESCE(?,body), days=COALESCE(?,days) WHERE id=? AND user_id=?').run(enabled != null ? (enabled ? 1 : 0) : null, time, title, body, days ? JSON.stringify(days) : null, req.params.id, req.userId);
  res.json({ success: true });
});

app.delete('/api/notifications/:id', auth, (req, res) => {
  db.prepare('DELETE FROM notifications WHERE id=? AND user_id=?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// ══════════════════════════════════════════════
// ACHIEVEMENTS (36-37)
// ══════════════════════════════════════════════
app.get('/api/achievements', auth, (req, res) => {
  res.json(db.prepare('SELECT achievement_id, earned_at FROM achievements WHERE user_id=?').all(req.userId));
});

app.post('/api/achievements', auth, (req, res) => {
  db.prepare('INSERT OR IGNORE INTO achievements (user_id, achievement_id) VALUES (?,?)').run(req.userId, req.body.achievementId);
  addXP(req.userId, 50);
  res.json({ success: true });
});

// ══════════════════════════════════════════════
// STREAK (38)
// ══════════════════════════════════════════════
app.get('/api/streak', auth, (req, res) => {
  const dates = db.prepare('SELECT date FROM active_dates WHERE user_id=? ORDER BY date DESC').all(req.userId).map(d => d.date);
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const ds = d.toISOString().split('T')[0];
    if (dates.includes(ds)) { streak++; d.setDate(d.getDate() - 1); } else break;
  }
  res.json({ streak, totalDays: dates.length, dates });
});

// ══════════════════════════════════════════════
// RECIPES (39-43)
// ══════════════════════════════════════════════
app.get('/api/recipes', auth, (req, res) => {
  const { category, search, tag } = req.query;
  let query = 'SELECT * FROM recipes WHERE (user_id=? OR is_public=1)';
  const params = [req.userId];
  if (category) { query += ' AND category=?'; params.push(category); }
  if (search) { query += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (tag) { query += ' AND tags LIKE ?'; params.push(`%${tag}%`); }
  query += ' ORDER BY rating DESC, created_at DESC LIMIT 50';
  res.json(db.prepare(query).all(...params).map(r => ({ ...r, ingredients: JSON.parse(r.ingredients), instructions: JSON.parse(r.instructions), tags: JSON.parse(r.tags) })));
});

app.get('/api/recipes/:id', auth, (req, res) => {
  const r = db.prepare('SELECT * FROM recipes WHERE id=?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Recipe not found' });
  res.json({ ...r, ingredients: JSON.parse(r.ingredients), instructions: JSON.parse(r.instructions), tags: JSON.parse(r.tags) });
});

app.post('/api/recipes', auth, (req, res) => {
  const { name, description, category, prepTime, cookTime, servings, ingredients, instructions, calories, protein, carbs, fat, fiber, tags, isPublic } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO recipes (id, user_id, name, description, category, prep_time, cook_time, servings, ingredients, instructions, calories, protein, carbs, fat, fiber, tags, is_public) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id, req.userId, name, description || '', category || 'other', prepTime || 0, cookTime || 0, servings || 1, JSON.stringify(ingredients || []), JSON.stringify(instructions || []), calories || 0, protein || 0, carbs || 0, fat || 0, fiber || 0, JSON.stringify(tags || []), isPublic ? 1 : 0);
  addXP(req.userId, 15);
  res.json({ id });
});

app.post('/api/recipes/:id/save', auth, (req, res) => {
  db.prepare('INSERT OR IGNORE INTO saved_recipes (user_id, recipe_id) VALUES (?,?)').run(req.userId, req.params.id);
  res.json({ success: true });
});

app.get('/api/recipes/saved/list', auth, (req, res) => {
  res.json(db.prepare('SELECT r.* FROM recipes r INNER JOIN saved_recipes sr ON r.id=sr.recipe_id WHERE sr.user_id=? ORDER BY sr.rowid DESC').all(req.userId).map(r => ({ ...r, ingredients: JSON.parse(r.ingredients), instructions: JSON.parse(r.instructions), tags: JSON.parse(r.tags) })));
});

// ══════════════════════════════════════════════
// GROCERY LISTS (44-46)
// ══════════════════════════════════════════════
app.get('/api/grocery', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM grocery_lists WHERE user_id=? ORDER BY updated_at DESC').all(req.userId).map(g => ({ ...g, items: JSON.parse(g.items), completed: JSON.parse(g.completed) })));
});

app.post('/api/grocery', auth, (req, res) => {
  const { name, items } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO grocery_lists (id, user_id, name, items) VALUES (?,?,?,?)').run(id, req.userId, name || 'Shopping List', JSON.stringify(items || []));
  res.json({ id });
});

app.put('/api/grocery/:id', auth, (req, res) => {
  const { items, completed, name } = req.body;
  db.prepare('UPDATE grocery_lists SET items=COALESCE(?,items), completed=COALESCE(?,completed), name=COALESCE(?,name), updated_at=datetime(\'now\') WHERE id=? AND user_id=?').run(items ? JSON.stringify(items) : null, completed ? JSON.stringify(completed) : null, name, req.params.id, req.userId);
  res.json({ success: true });
});

app.delete('/api/grocery/:id', auth, (req, res) => {
  db.prepare('DELETE FROM grocery_lists WHERE id=? AND user_id=?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// ══════════════════════════════════════════════
// FASTING (47-49)
// ══════════════════════════════════════════════
app.get('/api/fasting', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM fasting_logs WHERE user_id=? ORDER BY start_time DESC LIMIT 30').all(req.userId));
});

app.post('/api/fasting/start', auth, (req, res) => {
  const { type } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO fasting_logs (id, user_id, start_time, type) VALUES (?,?,?,?)').run(id, req.userId, new Date().toISOString(), type || '16:8');
  res.json({ id, start_time: new Date().toISOString() });
});

app.post('/api/fasting/:id/stop', auth, (req, res) => {
  const log = db.prepare('SELECT * FROM fasting_logs WHERE id=? AND user_id=?').get(req.params.id, req.userId);
  if (!log) return res.status(404).json({ error: 'Fasting log not found' });
  const endTime = new Date().toISOString();
  const duration = (new Date(endTime) - new Date(log.start_time)) / (1000 * 60 * 60);
  db.prepare('UPDATE fasting_logs SET end_time=?, duration_hours=? WHERE id=?').run(endTime, Math.round(duration * 10) / 10, req.params.id);
  addXP(req.userId, 15);
  res.json({ duration_hours: Math.round(duration * 10) / 10 });
});

// ══════════════════════════════════════════════
// CUSTOM WORKOUTS (50-52)
// ══════════════════════════════════════════════
app.get('/api/custom-workouts', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM custom_workouts WHERE user_id=? ORDER BY created_at DESC').all(req.userId).map(w => ({ ...w, exercises: JSON.parse(w.exercises) })));
});

app.post('/api/custom-workouts', auth, (req, res) => {
  const { name, exercises, duration, calories, type } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO custom_workouts (id, user_id, name, exercises, duration, calories, type) VALUES (?,?,?,?,?,?,?)').run(id, req.userId, name, JSON.stringify(exercises || []), duration || 0, calories || 0, type || 'custom');
  addXP(req.userId, 15);
  res.json({ id });
});

app.delete('/api/custom-workouts/:id', auth, (req, res) => {
  db.prepare('DELETE FROM custom_workouts WHERE id=? AND user_id=?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// ══════════════════════════════════════════════
// CHALLENGES (53-56)
// ══════════════════════════════════════════════
app.get('/api/challenges', auth, (req, res) => {
  const challenges = db.prepare('SELECT * FROM challenges ORDER BY created_at DESC').all();
  const userProgress = db.prepare('SELECT * FROM user_challenges WHERE user_id=?').all(req.userId);
  res.json(challenges.map(c => {
    const up = userProgress.find(u => u.challenge_id === c.id);
    return { ...c, joined: !!up, progress: up?.progress || 0, completed: !!up?.completed };
  }));
});

app.post('/api/challenges/:id/join', auth, (req, res) => {
  db.prepare('INSERT OR IGNORE INTO user_challenges (user_id, challenge_id) VALUES (?,?)').run(req.userId, req.params.id);
  res.json({ success: true });
});

app.put('/api/challenges/:id/progress', auth, (req, res) => {
  const { progress } = req.body;
  const challenge = db.prepare('SELECT * FROM challenges WHERE id=?').get(req.params.id);
  const completed = challenge && progress >= challenge.target;
  db.prepare('UPDATE user_challenges SET progress=?, completed=?, completed_at=? WHERE user_id=? AND challenge_id=?').run(progress, completed ? 1 : 0, completed ? new Date().toISOString() : null, req.userId, req.params.id);
  if (completed) addXP(req.userId, 100);
  res.json({ completed, progress });
});

// ══════════════════════════════════════════════
// COMMUNITY (57-60)
// ══════════════════════════════════════════════
app.get('/api/community', auth, (req, res) => {
  const posts = db.prepare(`SELECT p.*, u.name as author_name, u.avatar as author_avatar,
    EXISTS(SELECT 1 FROM post_likes WHERE user_id=? AND post_id=p.id) as liked
    FROM community_posts p LEFT JOIN users u ON p.user_id=u.id ORDER BY p.created_at DESC LIMIT 50`).all(req.userId);
  res.json(posts.map(p => ({ ...p, tags: JSON.parse(p.tags || '[]') })));
});

app.post('/api/community', auth, (req, res) => {
  const { content, type, isAnonymous, tags } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO community_posts (id, user_id, content, type, is_anonymous, tags) VALUES (?,?,?,?,?,?)').run(id, req.userId, content, type || 'post', isAnonymous ? 1 : 0, JSON.stringify(tags || []));
  addXP(req.userId, 10);
  res.json({ id });
});

app.post('/api/community/:id/like', auth, (req, res) => {
  const existing = db.prepare('SELECT 1 FROM post_likes WHERE user_id=? AND post_id=?').get(req.userId, req.params.id);
  if (existing) {
    db.prepare('DELETE FROM post_likes WHERE user_id=? AND post_id=?').run(req.userId, req.params.id);
    db.prepare('UPDATE community_posts SET likes=likes-1 WHERE id=?').run(req.params.id);
  } else {
    db.prepare('INSERT INTO post_likes (user_id, post_id) VALUES (?,?)').run(req.userId, req.params.id);
    db.prepare('UPDATE community_posts SET likes=likes+1 WHERE id=?').run(req.params.id);
  }
  res.json({ success: true });
});

// ══════════════════════════════════════════════
// APPOINTMENTS (61-63)
// ══════════════════════════════════════════════
app.get('/api/appointments', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM appointments WHERE user_id=? ORDER BY date ASC, time ASC').all(req.userId));
});

app.post('/api/appointments', auth, (req, res) => {
  const { title, type, doctor, date, time, location, notes } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO appointments (id, user_id, title, type, doctor, date, time, location, notes) VALUES (?,?,?,?,?,?,?,?,?)').run(id, req.userId, title, type || 'doctor', doctor || '', date, time || '', location || '', notes || '');
  res.json({ id });
});

app.put('/api/appointments/:id', auth, (req, res) => {
  const { completed } = req.body;
  db.prepare('UPDATE appointments SET completed=? WHERE id=? AND user_id=?').run(completed ? 1 : 0, req.params.id, req.userId);
  res.json({ success: true });
});

app.delete('/api/appointments/:id', auth, (req, res) => {
  db.prepare('DELETE FROM appointments WHERE id=? AND user_id=?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// ══════════════════════════════════════════════
// CONSULTATIONS (64-66)
// ══════════════════════════════════════════════
app.get('/api/consultations', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM consultations WHERE user_id=? ORDER BY scheduled_at DESC').all(req.userId));
});

app.post('/api/consultations', auth, (req, res) => {
  const { expertName, expertType, scheduledAt, duration } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO consultations (id, user_id, expert_name, expert_type, scheduled_at, duration) VALUES (?,?,?,?,?,?)').run(id, req.userId, expertName, expertType || 'nutritionist', scheduledAt, duration || 30);
  res.json({ id });
});

// ══════════════════════════════════════════════
// WEARABLE CONNECTIONS (67-68)
// ══════════════════════════════════════════════
app.get('/api/wearables', auth, (req, res) => {
  res.json(db.prepare('SELECT user_id, provider, connected, last_sync FROM wearable_connections WHERE user_id=?').all(req.userId));
});

app.post('/api/wearables/connect', auth, (req, res) => {
  const { provider } = req.body;
  db.prepare('INSERT OR REPLACE INTO wearable_connections (user_id, provider, connected, last_sync) VALUES (?,?,1,datetime(\'now\'))').run(req.userId, provider);
  res.json({ success: true });
});

app.delete('/api/wearables/:provider', auth, (req, res) => {
  db.prepare('DELETE FROM wearable_connections WHERE user_id=? AND provider=?').run(req.userId, req.params.provider);
  res.json({ success: true });
});

// ══════════════════════════════════════════════
// ANALYTICS (69-72)
// ══════════════════════════════════════════════
app.get('/api/analytics/summary', auth, (req, res) => {
  const d = parseInt(req.query.days) || 30;
  const since = new Date(); since.setDate(since.getDate() - d);
  const sinceStr = since.toISOString().split('T')[0];
  const logs = db.prepare('SELECT * FROM daily_logs WHERE user_id=? AND date>=? ORDER BY date').all(req.userId, sinceStr);
  const totalCal = logs.reduce((s, l) => s + JSON.parse(l.meals || '[]').reduce((ms, m) => ms + (m.calories || 0), 0), 0);
  const totalBurned = logs.reduce((s, l) => s + (l.calories_burned || 0), 0);
  const totalWater = logs.reduce((s, l) => s + (l.water || 0), 0);
  const totalWorkouts = logs.reduce((s, l) => s + JSON.parse(l.workouts || '[]').length, 0);
  const weights = db.prepare('SELECT * FROM weight_history WHERE user_id=? AND date>=? ORDER BY date').all(req.userId, sinceStr);
  const sleep = db.prepare('SELECT AVG(hours) as avgHours, AVG(quality) as avgQuality FROM sleep_history WHERE user_id=? AND date>=?').get(req.userId, sinceStr);
  const mood = db.prepare('SELECT AVG(mood) as avgMood, AVG(energy) as avgEnergy, AVG(stress) as avgStress FROM mood_history WHERE user_id=? AND date>=?').get(req.userId, sinceStr);
  const symptomFreq = {};
  logs.forEach(l => JSON.parse(l.symptoms || '[]').forEach(s => { symptomFreq[s] = (symptomFreq[s] || 0) + 1 }));
  const activeDays = db.prepare('SELECT COUNT(DISTINCT date) as d FROM active_dates WHERE user_id=? AND date>=?').get(req.userId, sinceStr).d;
  res.json({
    period: { from: sinceStr, days: d },
    calories: { total: totalCal, dailyAvg: logs.length ? Math.round(totalCal / logs.length) : 0, burned: totalBurned },
    water: { total: totalWater, dailyAvg: logs.length ? Math.round(totalWater / logs.length * 10) / 10 : 0 },
    workouts: { total: totalWorkouts },
    weight: { change: weights.length >= 2 ? weights[weights.length - 1].weight - weights[0].weight : null, entries: weights.length },
    sleep: { avgHours: sleep?.avgHours ? Math.round(sleep.avgHours * 10) / 10 : null, avgQuality: sleep?.avgQuality ? Math.round(sleep.avgQuality * 10) / 10 : null },
    mood: { avgMood: mood?.avgMood ? Math.round(mood.avgMood * 10) / 10 : null, avgEnergy: mood?.avgEnergy ? Math.round(mood.avgEnergy * 10) / 10 : null, avgStress: mood?.avgStress ? Math.round(mood.avgStress * 10) / 10 : null },
    activeDays, symptomFrequency: Object.entries(symptomFreq).sort((a, b) => b[1] - a[1]),
  });
});

app.get('/api/analytics/trends', auth, (req, res) => {
  const d = parseInt(req.query.days) || 30;
  const since = new Date(); since.setDate(since.getDate() - d);
  const sinceStr = since.toISOString().split('T')[0];
  const logs = db.prepare('SELECT date, meals, water, workouts, calories_burned, sleep_hours, sleep_quality, weight, mood, energy, stress, step_count FROM daily_logs WHERE user_id=? AND date>=? ORDER BY date').all(req.userId, sinceStr);
  res.json({
    daily: logs.map(l => ({
      date: l.date, calories: JSON.parse(l.meals || '[]').reduce((s, m) => s + (m.calories || 0), 0),
      protein: JSON.parse(l.meals || '[]').reduce((s, m) => s + (m.protein || 0), 0),
      carbs: JSON.parse(l.meals || '[]').reduce((s, m) => s + (m.carbs || 0), 0),
      fat: JSON.parse(l.meals || '[]').reduce((s, m) => s + (m.fat || 0), 0),
      water: l.water || 0, workouts: JSON.parse(l.workouts || '[]').length,
      caloriesBurned: l.calories_burned || 0, sleepHours: l.sleep_hours,
      sleepQuality: l.sleep_quality, weight: l.weight, mood: l.mood,
      energy: l.energy, stress: l.stress, steps: l.step_count || 0,
    })),
    weights: db.prepare('SELECT date, weight, body_fat, muscle_mass FROM weight_history WHERE user_id=? AND date>=? ORDER BY date').all(req.userId, sinceStr),
    sleep: db.prepare('SELECT date, hours, quality, bedtime, waketime FROM sleep_history WHERE user_id=? AND date>=? ORDER BY date').all(req.userId, sinceStr),
    mood: db.prepare('SELECT * FROM mood_history WHERE user_id=? AND date>=? ORDER BY date').all(req.userId, sinceStr),
    bloodPressure: db.prepare('SELECT * FROM blood_pressure WHERE user_id=? AND date>=? ORDER BY date').all(req.userId, sinceStr),
    bloodSugar: db.prepare('SELECT * FROM blood_sugar WHERE user_id=? AND date>=? ORDER BY date').all(req.userId, sinceStr),
  });
});

app.get('/api/analytics/weekly-report', auth, (req, res) => {
  const since = new Date(); since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString().split('T')[0];
  const logs = db.prepare('SELECT * FROM daily_logs WHERE user_id=? AND date>=? ORDER BY date').all(req.userId, sinceStr);
  const goals = db.prepare('SELECT * FROM goals WHERE user_id=?').get(req.userId);
  const weekData = {
    daysLogged: logs.length,
    avgCalories: Math.round(logs.reduce((s, l) => s + JSON.parse(l.meals || '[]').reduce((ms, m) => ms + (m.calories || 0), 0), 0) / (logs.length || 1)),
    avgWater: Math.round(logs.reduce((s, l) => s + (l.water || 0), 0) / (logs.length || 1) * 10) / 10,
    totalWorkouts: logs.reduce((s, l) => s + JSON.parse(l.workouts || '[]').length, 0),
    avgSleep: Math.round(logs.reduce((s, l) => s + (l.sleep_hours || 0), 0) / (logs.length || 1) * 10) / 10,
    goalHitRate: {
      calories: logs.filter(l => JSON.parse(l.meals || '[]').reduce((ms, m) => ms + (m.calories || 0), 0) <= (goals?.calories || 1800)).length,
      water: logs.filter(l => (l.water || 0) >= (goals?.water || 8)).length,
      sleep: logs.filter(l => (l.sleep_hours || 0) >= (goals?.sleep_hours || 8)).length,
    },
  };
  res.json(weekData);
});

// ══════════════════════════════════════════════
// EXPORT / IMPORT (73-74)
// ══════════════════════════════════════════════
app.get('/api/export', auth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.userId);
  res.json({
    exportDate: new Date().toISOString(),
    user: { name: user.name, email: user.email, goal: user.goal },
    logs: db.prepare('SELECT * FROM daily_logs WHERE user_id=? ORDER BY date').all(req.userId).map(l => ({ ...l, meals: JSON.parse(l.meals), workouts: JSON.parse(l.workouts), symptoms: JSON.parse(l.symptoms), supplements: JSON.parse(l.supplements) })),
    weights: db.prepare('SELECT * FROM weight_history WHERE user_id=? ORDER BY date').all(req.userId),
    measurements: db.prepare('SELECT * FROM measurements WHERE user_id=? ORDER BY date').all(req.userId),
    sleep: db.prepare('SELECT * FROM sleep_history WHERE user_id=? ORDER BY date').all(req.userId),
    mood: db.prepare('SELECT * FROM mood_history WHERE user_id=? ORDER BY date').all(req.userId),
    cycle: db.prepare('SELECT * FROM cycle_data WHERE user_id=?').get(req.userId),
    goals: db.prepare('SELECT * FROM goals WHERE user_id=?').get(req.userId),
  });
});

app.post('/api/import', auth, (req, res) => {
  const { logs, weights, measurements } = req.body;
  if (logs) logs.forEach(l => {
    db.prepare('INSERT OR REPLACE INTO daily_logs (id, user_id, date, meals, water, workouts, symptoms, weight, calories_burned, sleep_hours, sleep_quality, supplements) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(uuidv4(), req.userId, l.date, JSON.stringify(l.meals || []), l.water || 0, JSON.stringify(l.workouts || []), JSON.stringify(l.symptoms || []), l.weight, l.calories_burned || 0, l.sleep_hours, l.sleep_quality, JSON.stringify(l.supplements || []));
  });
  if (weights) weights.forEach(w => {
    db.prepare('INSERT OR IGNORE INTO weight_history (id, user_id, date, weight) VALUES (?,?,?,?)').run(uuidv4(), req.userId, w.date, w.weight);
  });
  res.json({ success: true, imported: { logs: logs?.length || 0, weights: weights?.length || 0 } });
});

// ══════════════════════════════════════════════
// DAILY REPORT (75)
// ══════════════════════════════════════════════
app.get('/api/report/:date', auth, (req, res) => {
  const log = getOrCreateLog(req.userId, req.params.date);
  const goals = db.prepare('SELECT * FROM goals WHERE user_id=?').get(req.userId);
  const totals = {
    calories: log.meals.reduce((s, m) => s + (m.calories || 0), 0),
    protein: log.meals.reduce((s, m) => s + (m.protein || 0), 0),
    carbs: log.meals.reduce((s, m) => s + (m.carbs || 0), 0),
    fat: log.meals.reduce((s, m) => s + (m.fat || 0), 0),
  };
  const score = Math.round(
    (Math.min(1, totals.calories / (goals?.calories || 1800)) * 25) +
    (Math.min(1, log.water / (goals?.water || 8)) * 25) +
    (log.workouts.length > 0 ? 25 : 0) +
    (log.sleep_hours >= (goals?.sleep_hours || 8) ? 25 : log.sleep_hours >= 7 ? 15 : 0)
  );
  res.json({ date: req.params.date, log, totals, goals, score, grade: score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D' });
});

// ══════════════════════════════════════════════
// XP / GAMIFICATION (76-77)
// ══════════════════════════════════════════════
app.get('/api/xp', auth, (req, res) => {
  const user = db.prepare('SELECT xp, level FROM users WHERE id=?').get(req.userId);
  const nextLevel = (user.level || 1) * 500;
  const currentLevelXP = ((user.level || 1) - 1) * 500;
  res.json({ xp: user.xp || 0, level: user.level || 1, nextLevelXP: nextLevel, currentLevelProgress: (user.xp || 0) - currentLevelXP, levelRange: 500 });
});

// ══════════════════════════════════════════════
// BARCODE SCAN SIMULATION (78)
// ══════════════════════════════════════════════
app.post('/api/barcode/lookup', auth, (req, res) => {
  const { barcode } = req.body;
  // Simulated food database lookup
  const foods = {
    '0123456789': { name: 'Greek Yogurt (Plain)', brand: 'Fage', calories: 100, protein: 18, carbs: 6, fat: 0, serving: '170g' },
    '9876543210': { name: 'Almond Butter', brand: 'Justin\'s', calories: 190, protein: 7, carbs: 7, fat: 17, serving: '32g' },
    '1111111111': { name: 'Chia Seeds', brand: 'Bob\'s Red Mill', calories: 130, protein: 5, carbs: 12, fat: 9, serving: '30g' },
    '2222222222': { name: 'Salmon Fillet', brand: 'Wild Caught', calories: 180, protein: 25, carbs: 0, fat: 8, serving: '113g' },
  };
  const food = foods[barcode] || { name: 'Unknown Product', calories: 0, protein: 0, carbs: 0, fat: 0 };
  res.json({ found: !!foods[barcode], ...food });
});

// ══════════════════════════════════════════════
// SEARCH (79)
// ══════════════════════════════════════════════
app.get('/api/search/foods', auth, (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const foods = [
    { name: 'Chicken Breast', cal: 165, protein: 31, carbs: 0, fat: 3.6, emoji: '🍗' },
    { name: 'Brown Rice', cal: 216, protein: 5, carbs: 45, fat: 1.8, emoji: '🍚' },
    { name: 'Broccoli', cal: 55, protein: 3.7, carbs: 11, fat: 0.6, emoji: '🥦' },
    { name: 'Salmon', cal: 208, protein: 20, carbs: 0, fat: 13, emoji: '🐟' },
    { name: 'Eggs (2 large)', cal: 143, protein: 13, carbs: 0.7, fat: 10, emoji: '🥚' },
    { name: 'Avocado', cal: 160, protein: 2, carbs: 9, fat: 15, emoji: '🥑' },
    { name: 'Sweet Potato', cal: 103, protein: 2.3, carbs: 24, fat: 0.1, emoji: '🍠' },
    { name: 'Greek Yogurt', cal: 100, protein: 17, carbs: 6, fat: 0.7, emoji: '🥛' },
    { name: 'Oatmeal', cal: 154, protein: 5, carbs: 27, fat: 2.6, emoji: '🥣' },
    { name: 'Spinach', cal: 23, protein: 2.9, carbs: 3.6, fat: 0.4, emoji: '🥬' },
    { name: 'Quinoa', cal: 222, protein: 8, carbs: 39, fat: 3.6, emoji: '🌾' },
    { name: 'Almonds', cal: 164, protein: 6, carbs: 6, fat: 14, emoji: '🥜' },
    { name: 'Banana', cal: 105, protein: 1.3, carbs: 27, fat: 0.4, emoji: '🍌' },
    { name: 'Turkey Breast', cal: 135, protein: 30, carbs: 0, fat: 1, emoji: '🦃' },
    { name: 'Cottage Cheese', cal: 163, protein: 28, carbs: 6, fat: 2.3, emoji: '🧀' },
  ];
  res.json(q ? foods.filter(f => f.name.toLowerCase().includes(q)) : foods.slice(0, 10));
});

// ══════════════════════════════════════════════
// STEPS (80)
// ══════════════════════════════════════════════
app.put('/api/logs/:date/steps', auth, (req, res) => {
  const { steps } = req.body;
  getOrCreateLog(req.userId, req.params.date);
  db.prepare('UPDATE daily_logs SET step_count=?, updated_at=datetime(\'now\') WHERE user_id=? AND date=?').run(steps, req.userId, req.params.date);
  addXP(req.userId, 3);
  res.json({ steps });
});

// ══════════════════════════════════════════════
// HEART RATE (81)
// ══════════════════════════════════════════════
app.put('/api/logs/:date/heart-rate', auth, (req, res) => {
  const { avg } = req.body;
  getOrCreateLog(req.userId, req.params.date);
  db.prepare('UPDATE daily_logs SET heart_rate_avg=?, updated_at=datetime(\'now\') WHERE user_id=? AND date=?').run(avg, req.userId, req.params.date);
  res.json({ heartRateAvg: avg });
});

// ══════════════════════════════════════════════
// PAIN TRACKING (82)
// ══════════════════════════════════════════════
app.put('/api/logs/:date/pain', auth, (req, res) => {
  const { level } = req.body;
  getOrCreateLog(req.userId, req.params.date);
  db.prepare('UPDATE daily_logs SET pain_level=?, updated_at=datetime(\'now\') WHERE user_id=? AND date=?').run(level, req.userId, req.params.date);
  res.json({ painLevel: level });
});

// ══════════════════════════════════════════════
// FASTING REMINDER CONFIG (83)
// ══════════════════════════════════════════════
app.get('/api/fasting/config', auth, (req, res) => {
  res.json({ type: '16:8', windowStart: '12:00', windowEnd: '20:00' });
});

// ══════════════════════════════════════════════
// WATER REMINDER CONFIG (84)
// ══════════════════════════════════════════════
app.get('/api/water-reminder', auth, (req, res) => {
  const config = db.prepare('SELECT * FROM water_reminders WHERE user_id=?').get(req.userId);
  res.json(config || { interval_minutes: 60, start_time: '08:00', end_time: '22:00', enabled: 1 });
});

app.put('/api/water-reminder', auth, (req, res) => {
  const { intervalMinutes, startTime, endTime, enabled } = req.body;
  db.prepare('INSERT OR REPLACE INTO water_reminders (user_id, interval_minutes, start_time, end_time, enabled) VALUES (?,?,?,?,?)').run(req.userId, intervalMinutes || 60, startTime || '08:00', endTime || '22:00', enabled != null ? (enabled ? 1 : 0) : 1);
  res.json({ success: true });
});

// ══════════════════════════════════════════════
// LEADERBOARD (85)
// ══════════════════════════════════════════════
app.get('/api/leaderboard', auth, (req, res) => {
  res.json(db.prepare('SELECT id, name, avatar, xp, level FROM users ORDER BY xp DESC LIMIT 20').all().map((u, i) => ({ ...u, rank: i + 1 })));
});

// ══════════════════════════════════════════════
// SEED DEFAULT DATA
// ══════════════════════════════════════════════
function seedChallenges() {
  const count = db.prepare('SELECT COUNT(*) as c FROM challenges').get().c;
  if (count > 0) return;
  const challenges = [
    { id: uuidv4(), title: '💧 Hydration Week', desc: 'Drink 8 glasses of water every day for 7 days', type: 'water', target: 56, unit: 'glasses', duration: 7, icon: '💧' },
    { id: uuidv4(), title: '💪 Strength Challenge', desc: 'Complete 10 strength workouts this month', type: 'workout', target: 10, unit: 'workouts', duration: 30, icon: '💪' },
    { id: uuidv4(), title: '🥗 Veggie Streak', desc: 'Eat vegetables with every meal for 5 days', type: 'nutrition', target: 15, unit: 'meals', duration: 5, icon: '🥗' },
    { id: uuidv4(), title: '😴 Sleep Master', desc: 'Get 8+ hours of sleep for 7 consecutive days', type: 'sleep', target: 7, unit: 'days', duration: 7, icon: '😴' },
    { id: uuidv4(), title: '🔥 30-Day Streak', desc: 'Log in every day for 30 days', type: 'streak', target: 30, unit: 'days', duration: 30, icon: '🔥' },
    { id: uuidv4(), title: '🧘 Mindful Month', desc: 'Log mood and symptoms every day for 30 days', type: 'wellness', target: 30, unit: 'days', duration: 30, icon: '🧘' },
    { id: uuidv4(), title: '🏃 Step It Up', desc: 'Walk 100,000 steps this month', type: 'steps', target: 100000, unit: 'steps', duration: 30, icon: '🏃' },
    { id: uuidv4(), title: '💊 Supplement Pro', desc: 'Take supplements every day for 14 days', type: 'supplements', target: 14, unit: 'days', duration: 14, icon: '💊' },
  ];
  challenges.forEach(c => {
    db.prepare('INSERT INTO challenges (id, title, description, type, target, unit, duration_days, icon) VALUES (?,?,?,?,?,?,?,?)').run(c.id, c.title, c.desc, c.type, c.target, c.unit, c.duration, c.icon);
  });
}

function seedRecipes() {
  const count = db.prepare('SELECT COUNT(*) as c FROM recipes').get().c;
  if (count > 0) return;
  const recipes = [
    { name: 'Anti-Inflammatory Salmon Bowl', cat: 'dinner', cal: 480, p: 34, c: 38, f: 20, fib: 8, prep: 10, cook: 20, tags: ['pcos','omega-3','low-gi'], ingredients: ['Salmon fillet','Quinoa','Broccoli','Avocado','Tahini','Lemon'], instructions: ['Cook quinoa per package','Bake salmon at 400°F for 15 min','Steam broccoli','Assemble bowl with tahini dressing'] },
    { name: 'PCOS Power Smoothie', cat: 'breakfast', cal: 320, p: 24, c: 32, f: 12, fib: 6, prep: 5, cook: 0, tags: ['pcos','quick','anti-inflammatory'], ingredients: ['Spinach','Banana','Protein powder','Almond butter','Almond milk','Chia seeds'], instructions: ['Blend all ingredients','Add ice if desired'] },
    { name: 'Turmeric Chicken Stir-Fry', cat: 'dinner', cal: 380, p: 36, c: 18, f: 16, fib: 5, prep: 10, cook: 15, tags: ['pcos','anti-inflammatory','quick'], ingredients: ['Chicken breast','Bell peppers','Broccoli','Turmeric','Ginger','Coconut aminos'], instructions: ['Slice chicken and veggies','Stir-fry chicken with turmeric','Add veggies and coconut aminos','Serve over cauliflower rice'] },
    { name: 'Overnight Chia Pudding', cat: 'breakfast', cal: 280, p: 14, c: 28, f: 14, fib: 12, prep: 5, cook: 0, tags: ['pcos','meal-prep','high-fiber'], ingredients: ['Chia seeds','Almond milk','Vanilla','Berries','Walnuts','Honey'], instructions: ['Mix chia seeds with almond milk','Refrigerate overnight','Top with berries and walnuts'] },
    { name: 'Mediterranean Lentil Soup', cat: 'lunch', cal: 320, p: 18, c: 40, f: 8, fib: 15, prep: 10, cook: 30, tags: ['pcos','high-fiber','vegetarian'], ingredients: ['Red lentils','Carrots','Celery','Cumin','Tomatoes','Spinach'], instructions: ['Sauté carrots and celery','Add lentils and tomatoes','Simmer 25 min','Add spinach before serving'] },
  ];
  recipes.forEach(r => {
    db.prepare('INSERT INTO recipes (id, name, category, prep_time, cook_time, servings, ingredients, instructions, calories, protein, carbs, fat, fiber, tags, is_public) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)').run(uuidv4(), r.name, r.cat, r.prep, r.cook, 2, JSON.stringify(r.ingredients), JSON.stringify(r.instructions), r.cal, r.p, r.c, r.f, r.fib, JSON.stringify(r.tags));
  });
}

seedChallenges();
seedRecipes();

// ══════════════════════════════════════════════
// HEALTH CHECK
// ══════════════════════════════════════════════
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', features: 100, timestamp: new Date().toISOString() });
});

// SPA fallback
app.get('/{*path}', (req, res) => {
  res.sendFile(join(__dirname, '..', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`⚡ PCOS Coach v2.0 — 100 features — running on port ${PORT}`);
});

export default app;
