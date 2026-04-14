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
// DATABASE
// ══════════════════════════════════════════════
const db = new Database(join(__dirname, 'pcos_coach.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    age INTEGER,
    start_weight REAL,
    goal TEXT,
    activity_level TEXT,
    symptoms TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS daily_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    meals TEXT DEFAULT '[]',
    water INTEGER DEFAULT 0,
    workouts TEXT DEFAULT '[]',
    symptoms TEXT DEFAULT '[]',
    weight REAL,
    calories_burned INTEGER DEFAULT 0,
    sleep_hours REAL,
    sleep_quality INTEGER,
    supplements TEXT DEFAULT '[]',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, date)
  );

  CREATE TABLE IF NOT EXISTS weight_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    weight REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, date)
  );

  CREATE TABLE IF NOT EXISTS measurements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    waist REAL,
    hips REAL,
    bust REAL,
    arms REAL,
    thighs REAL,
    body_fat REAL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, date)
  );

  CREATE TABLE IF NOT EXISTS cycle_data (
    user_id TEXT PRIMARY KEY,
    last_period_start TEXT,
    average_length INTEGER DEFAULT 32,
    entries TEXT DEFAULT '[]',
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sleep_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    hours REAL NOT NULL,
    quality INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, date)
  );

  CREATE TABLE IF NOT EXISTS chat_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS goals (
    user_id TEXT PRIMARY KEY,
    calories INTEGER DEFAULT 1800,
    protein INTEGER DEFAULT 130,
    carbs INTEGER DEFAULT 160,
    fat INTEGER DEFAULT 65,
    water INTEGER DEFAULT 8,
    sleep_hours REAL DEFAULT 8,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    time TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    days TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS achievements (
    user_id TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    earned_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS active_dates (
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    PRIMARY KEY (user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_weight_user_date ON weight_history(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_sleep_user_date ON sleep_history(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_history(user_id, created_at);
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
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ══════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, name, age, startWeight, goal, activityLevel, symptoms } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Email, password, and name are required' });

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);

    db.prepare(`INSERT INTO users (id, email, password_hash, name, age, start_weight, goal, activity_level, symptoms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, email, passwordHash, name, age || null, startWeight || null, goal || null, activityLevel || null, JSON.stringify(symptoms || []));

    // Initialize defaults
    db.prepare('INSERT INTO goals (user_id) VALUES (?)').run(id);
    db.prepare('INSERT INTO cycle_data (user_id) VALUES (?)').run(id);

    if (startWeight) {
      const today = new Date().toISOString().split('T')[0];
      db.prepare('INSERT INTO weight_history (id, user_id, date, weight) VALUES (?, ?, ?, ?)').run(uuidv4(), id, today, parseFloat(startWeight));
    }

    const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id, email, name, age, goal, activityLevel, symptoms: symptoms || [] } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, age: user.age, goal: user.goal, activityLevel: user.activity_level, symptoms: JSON.parse(user.symptoms) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, email, name, age, start_weight, goal, activity_level, symptoms, created_at FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.symptoms = JSON.parse(user.symptoms);
  res.json(user);
});

app.put('/api/auth/profile', auth, (req, res) => {
  const { name, age, goal, activityLevel, symptoms } = req.body;
  db.prepare(`UPDATE users SET name=COALESCE(?,name), age=COALESCE(?,age), goal=COALESCE(?,goal), activity_level=COALESCE(?,activity_level), symptoms=COALESCE(?,symptoms), updated_at=datetime('now') WHERE id=?`).run(name, age, goal, activityLevel, symptoms ? JSON.stringify(symptoms) : null, req.userId);
  res.json({ success: true });
});

// ══════════════════════════════════════════════
// DAILY LOG ROUTES
// ══════════════════════════════════════════════
function getOrCreateLog(userId, date) {
  let log = db.prepare('SELECT * FROM daily_logs WHERE user_id = ? AND date = ?').get(userId, date);
  if (!log) {
    const id = uuidv4();
    db.prepare('INSERT INTO daily_logs (id, user_id, date) VALUES (?, ?, ?)').run(id, userId, date);
    log = db.prepare('SELECT * FROM daily_logs WHERE id = ?').get(id);
  }
  return {
    ...log,
    meals: JSON.parse(log.meals || '[]'),
    workouts: JSON.parse(log.workouts || '[]'),
    symptoms: JSON.parse(log.symptoms || '[]'),
    supplements: JSON.parse(log.supplements || '[]'),
  };
}

app.get('/api/logs/:date', auth, (req, res) => {
  const log = getOrCreateLog(req.userId, req.params.date);
  // Mark active date
  db.prepare('INSERT OR IGNORE INTO active_dates (user_id, date) VALUES (?, ?)').run(req.userId, req.params.date);
  res.json(log);
});

app.get('/api/logs', auth, (req, res) => {
  const { from, to } = req.query;
  const logs = db.prepare('SELECT * FROM daily_logs WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date').all(req.userId, from || '2000-01-01', to || '2099-12-31');
  res.json(logs.map(l => ({ ...l, meals: JSON.parse(l.meals), workouts: JSON.parse(l.workouts), symptoms: JSON.parse(l.symptoms), supplements: JSON.parse(l.supplements) })));
});

app.post('/api/logs/:date/meals', auth, (req, res) => {
  const log = getOrCreateLog(req.userId, req.params.date);
  const meal = { ...req.body, id: Date.now(), loggedAt: new Date().toISOString() };
  log.meals.push(meal);
  db.prepare('UPDATE daily_logs SET meals=?, updated_at=datetime(\'now\') WHERE user_id=? AND date=?').run(JSON.stringify(log.meals), req.userId, req.params.date);
  db.prepare('INSERT OR IGNORE INTO active_dates (user_id, date) VALUES (?, ?)').run(req.userId, req.params.date);
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
  db.prepare('UPDATE daily_logs SET water=?, updated_at=datetime(\'now\') WHERE user_id=? AND date=?').run(Math.max(0, Math.min(12, glasses)), req.userId, req.params.date);
  db.prepare('INSERT OR IGNORE INTO active_dates (user_id, date) VALUES (?, ?)').run(req.userId, req.params.date);
  res.json({ water: glasses });
});

app.post('/api/logs/:date/workouts', auth, (req, res) => {
  const log = getOrCreateLog(req.userId, req.params.date);
  const workout = { ...req.body, id: Date.now(), completedAt: new Date().toISOString() };
  log.workouts.push(workout);
  const caloriesBurned = log.workouts.reduce((s, w) => s + (w.calories || 0), 0);
  db.prepare('UPDATE daily_logs SET workouts=?, calories_burned=?, updated_at=datetime(\'now\') WHERE user_id=? AND date=?').run(JSON.stringify(log.workouts), caloriesBurned, req.userId, req.params.date);
  db.prepare('INSERT OR IGNORE INTO active_dates (user_id, date) VALUES (?, ?)').run(req.userId, req.params.date);
  res.json(workout);
});

app.put('/api/logs/:date/symptoms', auth, (req, res) => {
  const { symptoms } = req.body;
  getOrCreateLog(req.userId, req.params.date);
  db.prepare('UPDATE daily_logs SET symptoms=?, updated_at=datetime(\'now\') WHERE user_id=? AND date=?').run(JSON.stringify(symptoms), req.userId, req.params.date);
  db.prepare('INSERT OR IGNORE INTO active_dates (user_id, date) VALUES (?, ?)').run(req.userId, req.params.date);
  res.json({ symptoms });
});

app.put('/api/logs/:date/sleep', auth, (req, res) => {
  const { hours, quality } = req.body;
  getOrCreateLog(req.userId, req.params.date);
  db.prepare('UPDATE daily_logs SET sleep_hours=?, sleep_quality=?, updated_at=datetime(\'now\') WHERE user_id=? AND date=?').run(hours, quality, req.userId, req.params.date);
  db.prepare('INSERT OR REPLACE INTO sleep_history (id, user_id, date, hours, quality) VALUES (COALESCE((SELECT id FROM sleep_history WHERE user_id=? AND date=?), ?), ?, ?, ?, ?)').run(req.userId, req.params.date, uuidv4(), req.userId, req.params.date, hours, quality);
  db.prepare('INSERT OR IGNORE INTO active_dates (user_id, date) VALUES (?, ?)').run(req.userId, req.params.date);
  res.json({ hours, quality });
});

app.post('/api/logs/:date/supplements', auth, (req, res) => {
  const log = getOrCreateLog(req.userId, req.params.date);
  const supp = { ...req.body, id: Date.now(), takenAt: new Date().toISOString() };
  log.supplements.push(supp);
  db.prepare('UPDATE daily_logs SET supplements=?, updated_at=datetime(\'now\') WHERE user_id=? AND date=?').run(JSON.stringify(log.supplements), req.userId, req.params.date);
  res.json(supp);
});

app.delete('/api/logs/:date/supplements/:suppId', auth, (req, res) => {
  const log = getOrCreateLog(req.userId, req.params.date);
  log.supplements = log.supplements.filter(s => s.id !== parseInt(req.params.suppId));
  db.prepare('UPDATE daily_logs SET supplements=?, updated_at=datetime(\'now\') WHERE user_id=? AND date=?').run(JSON.stringify(log.supplements), req.userId, req.params.date);
  res.json({ success: true });
});

// ══════════════════════════════════════════════
// WEIGHT ROUTES
// ══════════════════════════════════════════════
app.get('/api/weight', auth, (req, res) => {
  const { days } = req.query;
  const weights = days
    ? db.prepare('SELECT * FROM weight_history WHERE user_id = ? AND date >= date(\'now\', ?) ORDER BY date').all(req.userId, `-${days} days`)
    : db.prepare('SELECT * FROM weight_history WHERE user_id = ? ORDER BY date').all(req.userId);
  res.json(weights);
});

app.post('/api/weight', auth, (req, res) => {
  const { weight, date } = req.body;
  const d = date || new Date().toISOString().split('T')[0];
  db.prepare('INSERT OR REPLACE INTO weight_history (id, user_id, date, weight) VALUES (COALESCE((SELECT id FROM weight_history WHERE user_id=? AND date=?), ?), ?, ?, ?)').run(req.userId, d, uuidv4(), req.userId, d, weight);
  getOrCreateLog(req.userId, d);
  db.prepare('UPDATE daily_logs SET weight=?, updated_at=datetime(\'now\') WHERE user_id=? AND date=?').run(weight, req.userId, d);
  res.json({ weight, date: d });
});

// ══════════════════════════════════════════════
// MEASUREMENTS ROUTES
// ══════════════════════════════════════════════
app.get('/api/measurements', auth, (req, res) => {
  const data = db.prepare('SELECT * FROM measurements WHERE user_id = ? ORDER BY date DESC').all(req.userId);
  res.json(data);
});

app.post('/api/measurements', auth, (req, res) => {
  const { date, waist, hips, bust, arms, thighs, bodyFat } = req.body;
  const d = date || new Date().toISOString().split('T')[0];
  db.prepare('INSERT OR REPLACE INTO measurements (id, user_id, date, waist, hips, bust, arms, thighs, body_fat) VALUES (COALESCE((SELECT id FROM measurements WHERE user_id=? AND date=?), ?), ?, ?, ?, ?, ?, ?, ?, ?)').run(req.userId, d, uuidv4(), req.userId, d, waist || null, hips || null, bust || null, arms || null, thighs || null, bodyFat || null);
  res.json({ success: true, date: d });
});

// ══════════════════════════════════════════════
// SLEEP ROUTES
// ══════════════════════════════════════════════
app.get('/api/sleep', auth, (req, res) => {
  const { days } = req.query;
  const data = days
    ? db.prepare('SELECT * FROM sleep_history WHERE user_id = ? AND date >= date(\'now\', ?) ORDER BY date').all(req.userId, `-${days} days`)
    : db.prepare('SELECT * FROM sleep_history WHERE user_id = ? ORDER BY date').all(req.userId);
  res.json(data);
});

// ══════════════════════════════════════════════
// CYCLE ROUTES
// ══════════════════════════════════════════════
app.get('/api/cycle', auth, (req, res) => {
  const data = db.prepare('SELECT * FROM cycle_data WHERE user_id = ?').get(req.userId);
  if (!data) return res.json({ lastPeriodStart: null, averageLength: 32, entries: [] });
  res.json({ ...data, entries: JSON.parse(data.entries || '[]') });
});

app.post('/api/cycle/period', auth, (req, res) => {
  const date = req.body.date || new Date().toISOString().split('T')[0];
  const current = db.prepare('SELECT * FROM cycle_data WHERE user_id = ?').get(req.userId);
  const entries = current ? JSON.parse(current.entries || '[]') : [];
  entries.push({ type: 'period_start', date });

  // Calculate average
  const starts = entries.filter(e => e.type === 'period_start').map(e => e.date).sort();
  let avgLength = 32;
  if (starts.length >= 2) {
    let total = 0;
    for (let i = 1; i < starts.length; i++) {
      total += (new Date(starts[i]) - new Date(starts[i - 1])) / (1000 * 60 * 60 * 24);
    }
    avgLength = Math.round(total / (starts.length - 1));
  }

  db.prepare('INSERT OR REPLACE INTO cycle_data (user_id, last_period_start, average_length, entries, updated_at) VALUES (?, ?, ?, ?, datetime(\'now\'))').run(req.userId, date, avgLength, JSON.stringify(entries));
  res.json({ lastPeriodStart: date, averageLength: avgLength, entries });
});

// ══════════════════════════════════════════════
// GOALS ROUTES
// ══════════════════════════════════════════════
app.get('/api/goals', auth, (req, res) => {
  const goals = db.prepare('SELECT * FROM goals WHERE user_id = ?').get(req.userId);
  res.json(goals || { calories: 1800, protein: 130, carbs: 160, fat: 65, water: 8, sleep_hours: 8 });
});

app.put('/api/goals', auth, (req, res) => {
  const { calories, protein, carbs, fat, water, sleepHours } = req.body;
  db.prepare('INSERT OR REPLACE INTO goals (user_id, calories, protein, carbs, fat, water, sleep_hours, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))').run(req.userId, calories || 1800, protein || 130, carbs || 160, fat || 65, water || 8, sleepHours || 8);
  res.json({ success: true });
});

// ══════════════════════════════════════════════
// CHAT ROUTES
// ══════════════════════════════════════════════
app.get('/api/chat', auth, (req, res) => {
  const messages = db.prepare('SELECT role, content, created_at FROM chat_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').all(req.userId);
  res.json(messages.reverse().map(m => ({ role: m.role, text: m.content, ts: m.created_at })));
});

app.post('/api/chat', auth, (req, res) => {
  const { role, content } = req.body;
  db.prepare('INSERT INTO chat_history (id, user_id, role, content) VALUES (?, ?, ?, ?)').run(uuidv4(), req.userId, role, content);

  // Trim old messages (keep 200)
  const count = db.prepare('SELECT COUNT(*) as c FROM chat_history WHERE user_id = ?').get(req.userId).c;
  if (count > 200) {
    const toDelete = count - 200;
    db.prepare('DELETE FROM chat_history WHERE id IN (SELECT id FROM chat_history WHERE user_id = ? ORDER BY created_at ASC LIMIT ?)').run(req.userId, toDelete);
  }

  res.json({ success: true });
});

app.delete('/api/chat', auth, (req, res) => {
  db.prepare('DELETE FROM chat_history WHERE user_id = ?').run(req.userId);
  res.json({ success: true });
});

// ══════════════════════════════════════════════
// NOTIFICATIONS ROUTES
// ══════════════════════════════════════════════
app.get('/api/notifications', auth, (req, res) => {
  const notifs = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY time').all(req.userId);
  res.json(notifs.map(n => ({ ...n, days: JSON.parse(n.days || '[]'), enabled: !!n.enabled })));
});

app.post('/api/notifications', auth, (req, res) => {
  const { type, title, body, time, days } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO notifications (id, user_id, type, title, body, time, days) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, req.userId, type, title, body || '', time, JSON.stringify(days || []));
  res.json({ id, type, title, body, time, days: days || [] });
});

app.put('/api/notifications/:id', auth, (req, res) => {
  const { enabled } = req.body;
  db.prepare('UPDATE notifications SET enabled=? WHERE id=? AND user_id=?').run(enabled ? 1 : 0, req.params.id, req.userId);
  res.json({ success: true });
});

app.delete('/api/notifications/:id', auth, (req, res) => {
  db.prepare('DELETE FROM notifications WHERE id=? AND user_id=?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// ══════════════════════════════════════════════
// ACHIEVEMENTS ROUTES
// ══════════════════════════════════════════════
app.get('/api/achievements', auth, (req, res) => {
  const earned = db.prepare('SELECT achievement_id, earned_at FROM achievements WHERE user_id = ?').all(req.userId);
  res.json(earned);
});

app.post('/api/achievements', auth, (req, res) => {
  const { achievementId } = req.body;
  db.prepare('INSERT OR IGNORE INTO achievements (user_id, achievement_id) VALUES (?, ?)').run(req.userId, achievementId);
  res.json({ success: true });
});

// ══════════════════════════════════════════════
// STREAK ROUTES
// ══════════════════════════════════════════════
app.get('/api/streak', auth, (req, res) => {
  const dates = db.prepare('SELECT date FROM active_dates WHERE user_id = ? ORDER BY date DESC').all(req.userId).map(d => d.date);
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const dateStr = d.toISOString().split('T')[0];
    if (dates.includes(dateStr)) { streak++; d.setDate(d.getDate() - 1); } else break;
  }
  res.json({ streak, totalDays: dates.length, dates });
});

// ══════════════════════════════════════════════
// ANALYTICS ROUTES
// ══════════════════════════════════════════════
app.get('/api/analytics/summary', auth, (req, res) => {
  const { days } = req.query;
  const d = parseInt(days) || 30;
  const since = new Date(); since.setDate(since.getDate() - d);
  const sinceStr = since.toISOString().split('T')[0];

  const logs = db.prepare('SELECT * FROM daily_logs WHERE user_id = ? AND date >= ? ORDER BY date').all(req.userId, sinceStr);

  const totalCalories = logs.reduce((s, l) => s + JSON.parse(l.meals || '[]').reduce((ms, m) => ms + (m.calories || 0), 0), 0);
  const totalBurned = logs.reduce((s, l) => s + (l.calories_burned || 0), 0);
  const totalWater = logs.reduce((s, l) => s + (l.water || 0), 0);
  const totalWorkouts = logs.reduce((s, l) => s + JSON.parse(l.workouts || '[]').length, 0);
  const avgCalories = logs.length > 0 ? Math.round(totalCalories / logs.length) : 0;
  const avgWater = logs.length > 0 ? Math.round(totalWater / logs.length * 10) / 10 : 0;

  const weights = db.prepare('SELECT * FROM weight_history WHERE user_id = ? AND date >= ? ORDER BY date').all(req.userId, sinceStr);
  const weightChange = weights.length >= 2 ? weights[weights.length - 1].weight - weights[0].weight : null;

  const sleep = db.prepare('SELECT AVG(hours) as avgHours, AVG(quality) as avgQuality FROM sleep_history WHERE user_id = ? AND date >= ?').get(req.userId, sinceStr);

  const streak = db.prepare('SELECT COUNT(DISTINCT date) as days FROM active_dates WHERE user_id = ? AND date >= ?').get(req.userId, sinceStr);

  // Symptom frequency
  const symptomFreq = {};
  logs.forEach(l => {
    JSON.parse(l.symptoms || '[]').forEach(s => { symptomFreq[s] = (symptomFreq[s] || 0) + 1 });
  });

  res.json({
    period: { from: sinceStr, days: d },
    calories: { total: totalCalories, dailyAvg: avgCalories, burned: totalBurned },
    water: { total: totalWater, dailyAvg: avgWater },
    workouts: { total: totalWorkouts, dailyAvg: Math.round(totalWorkouts / d * 10) / 10 },
    weight: { change: weightChange, entries: weights.length },
    sleep: { avgHours: sleep?.avgHours ? Math.round(sleep.avgHours * 10) / 10 : null, avgQuality: sleep?.avgQuality ? Math.round(sleep.avgQuality * 10) / 10 : null },
    activeDays: streak?.days || 0,
    symptomFrequency: Object.entries(symptomFreq).sort((a, b) => b[1] - a[1]),
  });
});

app.get('/api/analytics/trends', auth, (req, res) => {
  const { days } = req.query;
  const d = parseInt(days) || 30;
  const since = new Date(); since.setDate(since.getDate() - d);
  const sinceStr = since.toISOString().split('T')[0];

  const logs = db.prepare('SELECT date, meals, water, workouts, calories_burned, sleep_hours, sleep_quality, weight FROM daily_logs WHERE user_id = ? AND date >= ? ORDER BY date').all(req.userId, sinceStr);

  const trends = logs.map(l => ({
    date: l.date,
    calories: JSON.parse(l.meals || '[]').reduce((s, m) => s + (m.calories || 0), 0),
    protein: JSON.parse(l.meals || '[]').reduce((s, m) => s + (m.protein || 0), 0),
    carbs: JSON.parse(l.meals || '[]').reduce((s, m) => s + (m.carbs || 0), 0),
    fat: JSON.parse(l.meals || '[]').reduce((s, m) => s + (m.fat || 0), 0),
    water: l.water || 0,
    workouts: JSON.parse(l.workouts || '[]').length,
    caloriesBurned: l.calories_burned || 0,
    sleepHours: l.sleep_hours,
    sleepQuality: l.sleep_quality,
    weight: l.weight,
  }));

  const weights = db.prepare('SELECT date, weight FROM weight_history WHERE user_id = ? AND date >= ? ORDER BY date').all(req.userId, sinceStr);
  const sleep = db.prepare('SELECT date, hours, quality FROM sleep_history WHERE user_id = ? AND date >= ? ORDER BY date').all(req.userId, sinceStr);

  res.json({ daily: trends, weights, sleep });
});

// ══════════════════════════════════════════════
// EXPORT ROUTE
// ══════════════════════════════════════════════
app.get('/api/export', auth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  const logs = db.prepare('SELECT * FROM daily_logs WHERE user_id = ? ORDER BY date').all(req.userId);
  const weights = db.prepare('SELECT * FROM weight_history WHERE user_id = ? ORDER BY date').all(req.userId);
  const measurements = db.prepare('SELECT * FROM measurements WHERE user_id = ? ORDER BY date').all(req.userId);
  const sleep = db.prepare('SELECT * FROM sleep_history WHERE user_id = ? ORDER BY date').all(req.userId);
  const cycle = db.prepare('SELECT * FROM cycle_data WHERE user_id = ?').get(req.userId);
  const goals = db.prepare('SELECT * FROM goals WHERE user_id = ?').get(req.userId);

  res.json({
    exportDate: new Date().toISOString(),
    user: { name: user.name, email: user.email, goal: user.goal },
    logs: logs.map(l => ({ ...l, meals: JSON.parse(l.meals), workouts: JSON.parse(l.workouts), symptoms: JSON.parse(l.symptoms), supplements: JSON.parse(l.supplements) })),
    weights, measurements, sleep, cycle, goals,
  });
});

// ══════════════════════════════════════════════
// HEALTH CHECK
// ══════════════════════════════════════════════
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// SPA fallback
app.get('/{*path}', (req, res) => {
  res.sendFile(join(__dirname, '..', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`⚡ PCOS Coach API running on port ${PORT}`);
});

export default app;
