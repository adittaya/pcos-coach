import { useState, useRef, useEffect, useCallback } from 'react'
import './index.css'
import {
  Home, Dumbbell, Apple, MessageCircle, TrendingUp,
  Droplets, Flame, Zap, Target, Clock, Award, Trash2, Check,
  RotateCcw, BarChart3, Plus, Moon, Sun, Settings as SettingsIcon,
  ChevronRight, Send, Play, Pause, Timer, X, Ruler, Pill,
  Calendar, List, Trophy, Coffee, Utensils, Heart
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts'
import {
  profile, dailyLog, weightHistory, measurements, cycle, sleepHistory,
  WORKOUTS, MEALS_DB, SUPPLEMENTS, MEAL_PLAN, CHALLENGES, ACHIEVEMENTS,
  goals, chatHistory, streak, SYMPTOMS, db, theme
} from './store'
import { generateResponse } from './aiCoach'

function today() { return new Date().toISOString().split('T')[0] }

// ══════════════════════════════════════════════
// ONBOARDING
// ══════════════════════════════════════════════
function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState({
    name: '', age: '', startWeight: '', goal: '', activityLevel: '', symptoms: [],
  })

  const goals = [
    { emoji: '⚖️', label: 'Lose Weight' },
    { emoji: '💪', label: 'Build Muscle' },
    { emoji: '🧘', label: 'Manage Symptoms' },
    { emoji: '❤️', label: 'Get Healthier' },
  ]

  const levels = [
    { emoji: '🛋️', label: 'Sedentary' },
    { emoji: '🚶‍♀️', label: 'Lightly Active' },
    { emoji: '🏃‍♀️', label: 'Active' },
    { emoji: '🏋️‍♀️', label: 'Very Active' },
  ]

  const finish = () => {
    const p = { ...data, createdAt: today() }
    profile.save(p)
    if (data.startWeight) weightHistory.add(parseFloat(data.startWeight))
    cycle.logPeriodStart(today())
    onComplete(p)
  }

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <>
          <div className="onboarding-title">Welcome to PCOS Coach ⚡</div>
          <p className="onboarding-sub">Your AI-powered fitness & nutrition companion, designed specifically for women with PCOS. Let's personalize your experience.</p>
          <button className="btn btn-primary" onClick={() => setStep(1)}>Let's Go →</button>
        </>
      )
      case 1: return (
        <>
          <div className="onboarding-title">About You</div>
          <div className="form-group">
            <label className="form-label">Your Name</label>
            <input className="form-input" placeholder="e.g. Adii" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Age</label>
            <input className="form-input" type="number" placeholder="28" value={data.age} onChange={e => setData({ ...data, age: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Current Weight (lbs)</label>
            <input className="form-input" type="number" placeholder="160" value={data.startWeight} onChange={e => setData({ ...data, startWeight: e.target.value })} />
          </div>
          <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!data.name}>Continue →</button>
        </>
      )
      case 2: return (
        <>
          <div className="onboarding-title">What's Your Main Goal?</div>
          <div className="option-grid">
            {goals.map(g => (
              <button key={g.label} className={`option-btn ${data.goal === g.label ? 'selected' : ''}`} onClick={() => setData({ ...data, goal: g.label })}>
                <span className="emoji">{g.emoji}</span><span className="label">{g.label}</span>
              </button>
            ))}
          </div>
          <br />
          <button className="btn btn-primary" onClick={() => setStep(3)} disabled={!data.goal}>Continue →</button>
        </>
      )
      case 3: return (
        <>
          <div className="onboarding-title">Activity Level</div>
          <div className="option-grid">
            {levels.map(l => (
              <button key={l.label} className={`option-btn ${data.activityLevel === l.label ? 'selected' : ''}`} onClick={() => setData({ ...data, activityLevel: l.label })}>
                <span className="emoji">{l.emoji}</span><span className="label">{l.label}</span>
              </button>
            ))}
          </div>
          <br />
          <button className="btn btn-primary" onClick={() => setStep(4)} disabled={!data.activityLevel}>Continue →</button>
        </>
      )
      case 4: return (
        <>
          <div className="onboarding-title">Symptoms You Experience</div>
          <p className="onboarding-sub">Select all that apply.</p>
          <div className="symptom-grid">
            {SYMPTOMS.map(s => (
              <button key={s.label} className={`symptom-btn ${data.symptoms.includes(s.label) ? 'selected' : ''}`}
                onClick={() => {
                  const symptoms = data.symptoms.includes(s.label) ? data.symptoms.filter(x => x !== s.label) : [...data.symptoms, s.label]
                  setData({ ...data, symptoms })
                }}>
                <span className="emoji">{s.emoji}</span><span className="label">{s.label}</span>
              </button>
            ))}
          </div>
          <br />
          <button className="btn btn-primary" onClick={finish}>Start My Journey 🚀</button>
        </>
      )
    }
  }

  return (
    <div className="onboarding">
      <div className="onboarding-steps">
        {[0, 1, 2, 3, 4].map(i => <div key={i} className={`step-dot ${i <= step ? 'active' : ''}`} />)}
      </div>
      {renderStep()}
    </div>
  )
}

// ══════════════════════════════════════════════
// WORKOUT TIMER
// ══════════════════════════════════════════════
function WorkoutTimer({ workout, onComplete, onCancel }) {
  const [currentEx, setCurrentEx] = useState(0)
  const [seconds, setSeconds] = useState(workout.exercises[0]?.seconds || 60)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(() => setSeconds(s => s - 1), 1000)
    } else if (seconds === 0 && running) {
      setRunning(false)
      if (currentEx < workout.exercises.length - 1) {
        setCurrentEx(c => c + 1)
        setSeconds(workout.exercises[currentEx + 1]?.seconds || 60)
      } else {
        setDone(true)
      }
    }
    return () => clearInterval(intervalRef.current)
  }, [running, seconds, currentEx, workout])

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  if (done) {
    return (
      <div className="card fade-in" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Workout Complete!</div>
        <div style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{workout.name} · {workout.calories} cal burned</div>
        <button className="btn btn-success" style={{ width: '100%', justifyContent: 'center', fontSize: 16 }} onClick={onComplete}>
          <Check size={20} /> Log Workout
        </button>
      </div>
    )
  }

  return (
    <div className="card fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{workout.emoji} {workout.name}</span>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}><X size={16} /> Exit</button>
      </div>
      <div style={{ textAlign: 'center', padding: '10px 0 20px', color: 'var(--text-secondary)', fontSize: 13 }}>
        Exercise {currentEx + 1} of {workout.exercises.length}
      </div>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>{workout.exercises[currentEx]?.name}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          {workout.exercises[currentEx]?.duration || workout.exercises[currentEx]?.sets}
        </div>
      </div>
      <div className="timer-display">{fmt(seconds)}</div>
      <div className="progress-bar-bg" style={{ marginBottom: 20 }}>
        <div className="progress-bar-fill" style={{
          width: `${((currentEx + (1 - seconds / (workout.exercises[currentEx]?.seconds || 60))) / workout.exercises.length) * 100}%`,
          background: 'linear-gradient(90deg, var(--primary), var(--accent))'
        }} />
      </div>
      <div className="timer-controls">
        <button className="btn btn-outline" onClick={() => setRunning(!running)}>
          {running ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Start</>}
        </button>
        <button className="btn btn-outline" onClick={() => { setSeconds(workout.exercises[currentEx]?.seconds || 60); setRunning(false) }}>
          <RotateCcw size={16} /> Reset
        </button>
        {currentEx < workout.exercises.length - 1 && (
          <button className="btn btn-primary" onClick={() => {
            setCurrentEx(c => c + 1)
            setSeconds(workout.exercises[currentEx + 1]?.seconds || 60)
            setRunning(false)
          }}>
            Skip →
          </button>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════
function Dashboard({ refreshKey }) {
  const p = profile.get() || {}
  const log = dailyLog.get(today())
  const totals = dailyLog.getTotals(today())
  const st = streak.get()
  const cycleDay = cycle.getCurrentDay()
  const phase = cycle.getPhase()
  const todayChallenge = CHALLENGES[new Date().getDate() % CHALLENGES.length]
  const challengeDone = todayChallenge.check(log)

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="page-title">Good morning, {p.name || 'there'} ☀️</div>
            <div className="page-subtitle">Here's your PCOS health overview for today</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {st > 0 && <div className="streak-badge">🔥 {st} day streak</div>}
            <div className="streak-badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <Trophy size={14} /> {ACHIEVEMENTS.filter(a => a.check()).length}/{ACHIEVEMENTS.length}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Challenge */}
      <div className="challenge-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="challenge-title">🎯 Daily Challenge</div>
            <div className="challenge-desc">{todayChallenge.icon} {todayChallenge.title}: {todayChallenge.desc}</div>
          </div>
          {challengeDone && <span style={{ fontSize: 28 }}>✅</span>}
        </div>
      </div>

      <WeekStrip />

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--calories)' }}><Flame color="white" size={20} /></div>
          <div className="stat-value">{totals.calories.toLocaleString()}</div>
          <div className="stat-label">Calories consumed</div>
          <div className="stat-change positive">{goals.get().calories - totals.calories} remaining</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success)' }}><Zap color="white" size={20} /></div>
          <div className="stat-value">{totals.burned}</div>
          <div className="stat-label">Calories burned</div>
          <div className="stat-change">{log.workouts.length} workout(s)</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--water)' }}><Droplets color="white" size={20} /></div>
          <div className="stat-value">{log.water}/{goals.get().water}</div>
          <div className="stat-label">Glasses of water</div>
          <div className="stat-change">{Math.max(0, goals.get().water - log.water)} more to go</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--sleep)' }}><Moon color="white" size={20} /></div>
          <div className="stat-value">{log.sleep ? `${log.sleep.hours}h` : '—'}</div>
          <div className="stat-label">Sleep last night</div>
          <div className="stat-change">{log.sleep ? `Quality: ${log.sleep.quality}/5` : 'Not logged'}</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">🥗 Today's Meals</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{log.meals.length} logged</span>
          </div>
          {log.meals.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🍽️</div>
              <div className="empty-state-text">No meals logged yet</div>
            </div>
          ) : (
            log.meals.slice(-4).map((m, i) => (
              <div key={m.id || i} className="meal-card">
                <div className="meal-icon" style={{ background: '#f5f3f0' }}>{m.emoji || '🍽️'}</div>
                <div className="meal-info">
                  <div className="meal-name">{m.name}</div>
                  <div className="meal-details">{m.details}</div>
                </div>
                <div className="meal-cal">{m.cal} cal</div>
              </div>
            ))
          )}
          {log.meals.length > 0 && <Macros totals={totals} />}
        </div>

        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">💪 Today's Workout</span>
              {log.workouts.length > 0 && <span className="workout-tag" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>Done ✓</span>}
            </div>
            {log.workouts.length > 0 ? log.workouts.map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                <span style={{ fontSize: 24 }}>{w.emoji}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{w.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{w.duration} min · {w.calories} cal</div>
                </div>
              </div>
            )) : (
              <div className="empty-state"><div className="empty-state-icon">🏋️</div><div className="empty-state-text">No workouts yet today</div></div>
            )}
          </div>
          <div className="card">
            <WaterTracker onChange={() => {}} />
          </div>
        </div>
      </div>

      {/* Supplements Quick Log */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <span className="card-title">💊 Supplements</span>
        </div>
        <div className="quick-add-grid">
          {SUPPLEMENTS.slice(0, 8).map(s => {
            const taken = log.supplements.some(ls => ls.name === s.name)
            return (
              <button key={s.name} className="quick-add-btn" style={taken ? { borderColor: 'var(--success)', background: 'var(--success-light)' } : {}}
                onClick={() => {
                  if (taken) {
                    const supp = log.supplements.find(ls => ls.name === s.name)
                    if (supp) dailyLog.removeSupplement(today(), supp.id)
                  } else {
                    dailyLog.addSupplement(today(), s)
                    streak.markToday()
                  }
                }}>
                <span className="emoji">{s.emoji}</span>
                <span className="label" style={taken ? { color: 'var(--success)', fontWeight: 600 } : {}}>{s.name}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// WEEK STRIP
// ══════════════════════════════════════════════
function WeekStrip() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const now = new Date()
  const todayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1
  const activeDates = db.get('active_dates', [])

  return (
    <div className="week-strip">
      {days.map((d, i) => {
        const offset = i - todayIdx
        const date = new Date(now)
        date.setDate(date.getDate() + offset)
        const dateStr = date.toISOString().split('T')[0]
        const done = activeDates.includes(dateStr)
        return (
          <div key={d} className={`week-day ${i === todayIdx ? 'active' : ''}`}>
            <div className="day-name">{d}</div>
            <div className="day-num">{date.getDate()}</div>
            {done && <div className="day-dot" />}
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════
// WATER TRACKER
// ══════════════════════════════════════════════
function WaterTracker({ onChange }) {
  const log = dailyLog.get(today())
  const g = goals.get()
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>💧 Water Intake</span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{log.water}/{g.water} glasses</span>
      </div>
      <div className="water-glasses">
        {Array.from({ length: g.water }, (_, i) => (
          <div key={i} className={`water-glass ${i < log.water ? 'filled' : ''}`}
            onClick={() => { dailyLog.setWater(today(), i < log.water ? i : i + 1); onChange?.() }}>
            {i < log.water ? '💧' : ''}
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// MACROS
// ══════════════════════════════════════════════
function Macros({ totals }) {
  const g = goals.get()
  return (
    <div>
      {[
        { label: 'Calories', val: totals.calories, goal: g.calories, color: 'var(--calories)' },
        { label: 'Protein', val: totals.protein, goal: g.protein, color: 'var(--protein)', unit: 'g' },
        { label: 'Carbs', val: totals.carbs, goal: g.carbs, color: 'var(--carbs)', unit: 'g' },
        { label: 'Fat', val: totals.fat, goal: g.fat, color: 'var(--fat)', unit: 'g' },
      ].map(m => (
        <div key={m.label} className="macro-row">
          <span className="macro-label">{m.label}</span>
          <div className="macro-bar-bg"><div className="macro-bar-fill" style={{ width: `${Math.min(100, (m.val / m.goal) * 100)}%`, background: m.color }} /></div>
          <span className="macro-value">{m.val}{m.unit || ''}/{m.goal}{m.unit || ''}</span>
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════
// WORKOUTS
// ══════════════════════════════════════════════
function Workouts({ onWorkoutDone }) {
  const [filter, setFilter] = useState('All')
  const [activeWorkout, setActiveWorkout] = useState(null)
  const [timerMode, setTimerMode] = useState(false)
  const types = ['All', 'Low Impact', 'Strength', 'Cardio', 'HIIT', 'Pilates', 'Recovery']
  const filtered = filter === 'All' ? WORKOUTS : WORKOUTS.filter(w => w.type === filter)

  const completeWorkout = () => {
    dailyLog.addWorkout(today(), activeWorkout)
    onWorkoutDone?.()
    setActiveWorkout(null)
    setTimerMode(false)
  }

  if (timerMode && activeWorkout) {
    return (
      <div className="fade-in">
        <WorkoutTimer workout={activeWorkout} onComplete={completeWorkout} onCancel={() => setTimerMode(false)} />
      </div>
    )
  }

  if (activeWorkout) {
    return (
      <div className="fade-in">
        <button className="btn btn-outline" onClick={() => setActiveWorkout(null)} style={{ marginBottom: 20 }}>← Back to all workouts</button>
        <div className="card">
          <div style={{ fontSize: 48, marginBottom: 12 }}>{activeWorkout.emoji}</div>
          <div className="page-title" style={{ fontSize: 24 }}>{activeWorkout.name}</div>
          <p style={{ color: 'var(--text-secondary)', margin: '8px 0 24px' }}>{activeWorkout.desc}</p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <span className="chip" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}><Clock size={14} /> {activeWorkout.duration} min</span>
            <span className="chip" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}><Flame size={14} /> {activeWorkout.calories} cal</span>
            <span className="chip" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>{activeWorkout.type}</span>
          </div>
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>Exercises</h3>
          {activeWorkout.exercises.map((ex, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 14 }}>{i + 1}. {ex.name}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{ex.duration || ex.sets}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setTimerMode(true)}>
              <Timer size={18} /> Start with Timer
            </button>
            <button className="btn btn-success" style={{ flex: 1, justifyContent: 'center' }} onClick={completeWorkout}>
              <Check size={18} /> Quick Complete
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">Workout Plans 💪</div>
        <div className="page-subtitle">PCOS-optimized workouts designed to manage insulin & cortisol</div>
      </div>
      <div className="tab-bar">
        {types.map(t => (
          <button key={t} className={`tab-item ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>{t}</button>
        ))}
      </div>
      <div className="grid-3">
        {filtered.map(w => (
          <div key={w.id} className="workout-card" onClick={() => setActiveWorkout(w)}>
            <div className="workout-emoji">{w.emoji}</div>
            <div className="workout-name">{w.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 10px' }}>{w.desc}</div>
            <div className="workout-meta">
              <span><Clock size={14} style={{ verticalAlign: -2 }} /> {w.duration} min</span>
              <span><Flame size={14} style={{ verticalAlign: -2 }} /> {w.calories} cal</span>
            </div>
            <span className="workout-tag">{w.type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// NUTRITION
// ══════════════════════════════════════════════
function Nutrition({ onMealAdded }) {
  const [view, setView] = useState('log') // log | plan
  const [selectedType, setSelectedType] = useState(null)
  const [customMeal, setCustomMeal] = useState(false)
  const [custom, setCustom] = useState({ name: '', cal: '', protein: '', carbs: '', fat: '' })
  const log = dailyLog.get(today())
  const totals = dailyLog.getTotals(today())

  const mealTypes = [
    { key: 'breakfast', label: '🌅 Breakfast', bg: '#fff3e0' },
    { key: 'lunch', label: '☀️ Lunch', bg: '#e8f5e9' },
    { key: 'dinner', label: '🌙 Dinner', bg: '#e3f2fd' },
    { key: 'snacks', label: '🍎 Snacks', bg: '#fce4ec' },
  ]

  const addMeal = (type, meal) => {
    dailyLog.addMeal(today(), { ...meal, type })
    onMealAdded?.()
    setSelectedType(null)
    setCustomMeal(false)
    setCustom({ name: '', cal: '', protein: '', carbs: '', fat: '' })
  }

  const addCustom = () => {
    if (!custom.name || !custom.cal) return
    addMeal(selectedType, { name: custom.name, details: 'Custom meal', cal: parseInt(custom.cal) || 0, protein: parseInt(custom.protein) || 0, carbs: parseInt(custom.carbs) || 0, fat: parseInt(custom.fat) || 0, emoji: '🍽️' })
  }

  // Meal picker
  if (selectedType) {
    const mt = mealTypes.find(m => m.key === selectedType)
    const meals = MEALS_DB[selectedType]
    return (
      <div className="fade-in">
        <button className="btn btn-outline" onClick={() => { setSelectedType(null); setCustomMeal(false) }} style={{ marginBottom: 20 }}>← Back</button>
        <div className="card">
          <div className="card-header"><span className="card-title">{mt.label} — Pick a meal</span></div>
          {customMeal ? (
            <div>
              <div className="form-group">
                <label className="form-label">Meal Name</label>
                <input className="form-input" placeholder="e.g. Chicken salad" value={custom.name} onChange={e => setCustom({ ...custom, name: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[{ k: 'cal', l: 'Calories', p: '350' }, { k: 'protein', l: 'Protein (g)', p: '30' }, { k: 'carbs', l: 'Carbs (g)', p: '25' }, { k: 'fat', l: 'Fat (g)', p: '15' }].map(f => (
                  <div key={f.k} className="form-group">
                    <label className="form-label">{f.l}</label>
                    <input className="form-input" type="number" placeholder={f.p} value={custom[f.k]} onChange={e => setCustom({ ...custom, [f.k]: e.target.value })} />
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" onClick={addCustom} disabled={!custom.name || !custom.cal}><Plus size={16} /> Log Custom Meal</button>
            </div>
          ) : (
            <>
              {meals.map((m, i) => (
                <div key={i} className="meal-card" style={{ cursor: 'pointer' }} onClick={() => addMeal(selectedType, m)}>
                  <div className="meal-icon" style={{ background: mt.bg }}>{m.emoji}</div>
                  <div className="meal-info">
                    <div className="meal-name">{m.name}</div>
                    <div className="meal-details">{m.details}</div>
                    <div className="meal-details" style={{ marginTop: 2 }}>P: {m.protein}g · C: {m.carbs}g · F: {m.fat}g</div>
                  </div>
                  <div className="meal-cal">{m.cal} cal</div>
                </div>
              ))}
              <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={() => setCustomMeal(true)}>
                <Plus size={16} /> Add Custom Meal
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  const pieData = [
    { name: 'Protein', value: totals.protein || 1, color: 'var(--protein)' },
    { name: 'Carbs', value: totals.carbs || 1, color: 'var(--carbs)' },
    { name: 'Fat', value: totals.fat || 1, color: 'var(--fat)' },
  ]

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">Nutrition 🥗</div>
        <div className="page-subtitle">Low-glycemic, anti-inflammatory meals for PCOS</div>
      </div>
      <div className="tab-bar">
        <button className={`tab-item ${view === 'log' ? 'active' : ''}`} onClick={() => setView('log')}>📋 Food Log</button>
        <button className={`tab-item ${view === 'plan' ? 'active' : ''}`} onClick={() => setView('plan')}>📅 Meal Plan</button>
      </div>

      {view === 'plan' ? (
        <div className="card">
          <div className="card-header"><span className="card-title">7-Day PCOS Meal Plan</span></div>
          {MEAL_PLAN.map((day, i) => (
            <div key={i} className="meal-plan-day">
              <div className="meal-plan-day-header">
                <span className="meal-plan-day-title">{day.day}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>~1,750 cal</span>
              </div>
              {[{ type: 'Breakfast', meal: day.breakfast }, { type: 'Lunch', meal: day.lunch }, { type: 'Dinner', meal: day.dinner }, { type: 'Snack', meal: day.snack }].map((m, j) => (
                <div key={j} className="meal-plan-meal">
                  <span className="meal-plan-meal-type">{m.type}</span>
                  <span>{m.meal}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid-2">
          <div>
            {log.meals.length > 0 && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-header"><span className="card-title">📋 Today's Log ({log.meals.length})</span></div>
                {log.meals.map((m, i) => (
                  <div key={m.id || i} className="meal-card">
                    <div className="meal-icon" style={{ background: '#f5f3f0' }}>{m.emoji || '🍽️'}</div>
                    <div className="meal-info">
                      <div className="meal-name">{m.name}</div>
                      <div className="meal-details">{m.details}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="meal-cal">{m.cal} cal</div>
                      <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => { dailyLog.removeMeal(today(), m.id); onMealAdded?.() }}>
                        <Trash2 size={14} color="var(--danger)" />
                      </button>
                    </div>
                  </div>
                ))}
                <Macros totals={totals} />
              </div>
            )}
            <div className="card">
              <div className="card-header"><span className="card-title">➕ Add a Meal</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {mealTypes.map(mt => (
                  <button key={mt.key} className="quick-add-btn" onClick={() => setSelectedType(mt.key)}>
                    <span className="emoji">{mt.label.split(' ')[0]}</span>
                    <span className="label">{mt.label.split(' ').slice(1).join(' ')}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><span className="card-title">📊 Macro Split</span></div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 8 }}>
                {pieData.map(p => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{p.name} {p.value}g</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-title">🛡️ PCOS Tips</span></div>
              <div style={{ fontSize: 13, lineHeight: 1.9, color: 'var(--text-secondary)' }}>
                <p>• Eat protein with every meal to stabilize blood sugar</p>
                <p>• Choose low-GI carbs: sweet potato, quinoa, oats</p>
                <p>• Include omega-3s: salmon, walnuts, chia seeds</p>
                <p>• Avoid sugary drinks — they spike insulin fast</p>
                <p>• Cinnamon can help with insulin sensitivity</p>
                <p>• Eat every 3-4 hours to prevent energy crashes</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════
// AI COACH
// ══════════════════════════════════════════════
function AICoach() {
  const [messages, setMessages] = useState(() => chatHistory.get())
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const messagesEnd = useRef(null)

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = () => {
    if (!input.trim() || typing) return
    const userMsg = { role: 'user', text: input.trim() }
    chatHistory.add(userMsg)
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      const response = generateResponse(userMsg.text)
      const botMsg = { role: 'bot', text: response }
      chatHistory.add(botMsg)
      setMessages(prev => [...prev, botMsg])
      setTyping(false)
    }, 800 + Math.random() * 700)
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="page-title">AI Coach 🤖</div>
            <div className="page-subtitle">Ask anything about PCOS, nutrition, workouts, or wellness</div>
          </div>
          <button className="btn btn-outline" onClick={() => { chatHistory.clear(); setMessages(chatHistory.get()) }} style={{ fontSize: 13 }}>
            <RotateCcw size={14} /> Clear
          </button>
        </div>
      </div>
      <div className="card chat-container">
        <div className="chat-messages">
          {messages.map((m, i) => <div key={i} className={`chat-msg ${m.role}`}>{m.text}</div>)}
          {typing && <div className="chat-msg bot" style={{ opacity: 0.6 }}><span style={{ animation: 'pulse 1.5s infinite' }}>Thinking...</span></div>}
          <div ref={messagesEnd} />
        </div>
        <div className="chat-input-wrap">
          <input className="chat-input" placeholder="Ask your PCOS coach anything..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} disabled={typing} />
          <button className="chat-send" onClick={send} disabled={typing || !input.trim()}><Send size={18} /></button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// PROGRESS
// ══════════════════════════════════════════════
function Progress({ refreshKey }) {
  const [tab, setTab] = useState('weight')
  const [weightInput, setWeightInput] = useState('')
  const [sleepInput, setSleepInput] = useState({ hours: '', quality: 3 })
  const [measureInput, setMeasureInput] = useState({ waist: '', hips: '', bust: '', arms: '', thighs: '' })
  const log = dailyLog.get(today())

  const weightData = weightHistory.getRecent(30).map(w => {
    const d = new Date(w.date)
    return { day: `${d.getMonth() + 1}/${d.getDate()}`, weight: w.weight }
  })

  const sleepData = sleepHistory.getRecent(7).map(s => {
    const d = new Date(s.date)
    return { day: `${d.getMonth() + 1}/${d.getDate()}`, hours: s.hours, quality: s.quality }
  })

  const allWeights = weightHistory.getAll()
  const startWeight = allWeights.length > 0 ? allWeights[0].weight : null
  const currentWeight = allWeights.length > 0 ? allWeights[allWeights.length - 1].weight : null
  const latestMeasure = measurements.getLatest()
  const prevMeasure = measurements.getPrevious()

  const logWeight = () => {
    const w = parseFloat(weightInput)
    if (!w || w < 50 || w > 500) return
    weightHistory.add(w)
    dailyLog.setWeight(today(), w)
    streak.markToday()
    setWeightInput('')
  }

  const logSleep = () => {
    const h = parseFloat(sleepInput.hours)
    if (!h || h < 0 || h > 24) return
    sleepHistory.add(h, sleepInput.quality)
    setSleepInput({ hours: '', quality: 3 })
  }

  const logMeasurements = () => {
    const m = {}
    Object.entries(measureInput).forEach(([k, v]) => { if (v) m[k] = parseFloat(v) })
    if (Object.keys(m).length === 0) return
    measurements.add(m)
    setMeasureInput({ waist: '', hips: '', bust: '', arms: '', thighs: '' })
  }

  const cycleDay = cycle.getCurrentDay()
  const phase = cycle.getPhase()

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">Progress 📈</div>
        <div className="page-subtitle">Track your journey</div>
      </div>
      <div className="tab-bar">
        {[
          { id: 'weight', label: '⚖️ Weight' },
          { id: 'measurements', label: '📏 Body' },
          { id: 'sleep', label: '😴 Sleep' },
          { id: 'symptoms', label: '🩺 Symptoms' },
          { id: 'cycle', label: '🌙 Cycle' },
          { id: 'achievements', label: '🏆 Badges' },
        ].map(t => (
          <button key={t.id} className={`tab-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'weight' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Weight Trend</span>
              {currentWeight && startWeight && <span className={`stat-change ${currentWeight <= startWeight ? 'positive' : 'negative'}`}>{currentWeight <= startWeight ? '↓' : '↑'} {Math.abs(currentWeight - startWeight).toFixed(1)} lbs</span>}
            </div>
            {weightData.length > 1 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={weightData}>
                  <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} /><stop offset="95%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="weight" stroke="var(--primary)" strokeWidth={2.5} fill="url(#wg)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="empty-state"><div className="empty-state-icon">📊</div><div className="empty-state-text">Log weight for a few days to see trends</div></div>}
          </div>
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><span className="card-title">Log Weight</span></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input className="form-input" type="number" placeholder="Weight in lbs" value={weightInput} onChange={e => setWeightInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && logWeight()} />
                <button className="btn btn-primary" onClick={logWeight} disabled={!weightInput}>Log</button>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-title">Stats</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div><div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Starting</div><div style={{ fontSize: 22, fontWeight: 700 }}>{startWeight ? `${startWeight} lbs` : '—'}</div></div>
                <div><div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Current</div><div style={{ fontSize: 22, fontWeight: 700 }}>{currentWeight ? `${currentWeight} lbs` : '—'}</div></div>
                <div><div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Entries</div><div style={{ fontSize: 22, fontWeight: 700 }}>{allWeights.length}</div></div>
                <div><div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Change</div><div style={{ fontSize: 22, fontWeight: 700, color: startWeight && currentWeight && currentWeight <= startWeight ? 'var(--success)' : 'var(--text)' }}>{startWeight && currentWeight ? `${(currentWeight - startWeight) > 0 ? '+' : ''}${(currentWeight - startWeight).toFixed(1)} lbs` : '—'}</div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'measurements' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><span className="card-title">📏 Body Measurements</span></div>
            {latestMeasure ? (
              <div className="measurement-grid">
                {[
                  { key: 'waist', label: 'Waist', unit: 'in' },
                  { key: 'hips', label: 'Hips', unit: 'in' },
                  { key: 'bust', label: 'Bust', unit: 'in' },
                  { key: 'arms', label: 'Arms', unit: 'in' },
                  { key: 'thighs', label: 'Thighs', unit: 'in' },
                ].filter(m => latestMeasure[m.key]).map(m => {
                  const change = prevMeasure?.[m.key] ? latestMeasure[m.key] - prevMeasure[m.key] : null
                  return (
                    <div key={m.key} className="measurement-card">
                      <div className="measurement-value">{latestMeasure[m.key]}</div>
                      <div className="measurement-label">{m.label} ({m.unit})</div>
                      {change !== null && <div className="measurement-change" style={{ color: change <= 0 ? 'var(--success)' : 'var(--danger)' }}>{change > 0 ? '+' : ''}{change.toFixed(1)}</div>}
                    </div>
                  )
                })}
              </div>
            ) : <div className="empty-state"><div className="empty-state-icon">📏</div><div className="empty-state-text">No measurements logged yet</div></div>}
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>Last updated: {latestMeasure?.date || 'Never'}</div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Log Measurements</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[{ k: 'waist', l: 'Waist (in)' }, { k: 'hips', l: 'Hips (in)' }, { k: 'bust', l: 'Bust (in)' }, { k: 'arms', l: 'Arms (in)' }, { k: 'thighs', l: 'Thighs (in)' }].map(f => (
                <div key={f.k} className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">{f.l}</label>
                  <input className="form-input" type="number" step="0.1" placeholder="—" value={measureInput[f.k]} onChange={e => setMeasureInput({ ...measureInput, [f.k]: e.target.value })} />
                </div>
              ))}
            </div>
            <button className="btn btn-primary" onClick={logMeasurements} style={{ width: '100%', justifyContent: 'center' }}>Save Measurements</button>
          </div>
        </div>
      )}

      {tab === 'sleep' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><span className="card-title">Sleep Trend (7 Days)</span></div>
            {sleepData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sleepData}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip />
                  <Bar dataKey="hours" fill="var(--sleep)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="empty-state"><div className="empty-state-icon">😴</div><div className="empty-state-text">No sleep data yet</div></div>}
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Log Sleep</span></div>
            <div className="form-group">
              <label className="form-label">Hours of Sleep</label>
              <input className="form-input" type="number" step="0.5" placeholder="7.5" value={sleepInput.hours} onChange={e => setSleepInput({ ...sleepInput, hours: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Sleep Quality (1-5)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3, 4, 5].map(q => (
                  <button key={q} className={`btn ${sleepInput.quality === q ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => setSleepInput({ ...sleepInput, quality: q })}>
                    {['😫', '😕', '😐', '🙂', '😴'][q - 1]}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" onClick={logSleep} disabled={!sleepInput.hours} style={{ width: '100%', justifyContent: 'center' }}>Log Sleep</button>
            <div style={{ marginTop: 16, padding: 14, background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--primary)' }}>
              💡 PCOS tip: Poor sleep worsens insulin resistance. Aim for 7-9 hours. Magnesium before bed can help.
            </div>
          </div>
        </div>
      )}

      {tab === 'symptoms' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Today's Symptoms</span><span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Tap to log</span></div>
          <div className="symptom-grid">
            {SYMPTOMS.map(s => {
              const selected = log.symptoms.includes(s.label)
              return (
                <button key={s.label} className={`symptom-btn ${selected ? 'selected' : ''}`}
                  onClick={() => {
                    const newSymptoms = selected ? log.symptoms.filter(x => x !== s.label) : [...log.symptoms, s.label]
                    dailyLog.setSymptoms(today(), newSymptoms)
                  }}>
                  <span className="emoji">{s.emoji}</span><span className="label">{s.label}</span>
                </button>
              )
            })}
          </div>
          {log.symptoms.length > 0 && (
            <div style={{ marginTop: 16, padding: 14, background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--primary)' }}>
              💡 {log.symptoms.includes('Bloating') && 'Try reducing dairy and adding turmeric. '}
              {log.symptoms.includes('Fatigue') && 'Check iron and B12 levels. '}
              {log.symptoms.includes('Cravings') && 'Eat more protein and fiber. '}
              {log.symptoms.includes('Acne') && 'Consider reducing dairy and sugar. '}
              {log.symptoms.includes('Insomnia') && 'Try magnesium supplements. '}
            </div>
          )}
        </div>
      )}

      {tab === 'cycle' && (
        <div className="grid-2">
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="card-header" style={{ justifyContent: 'center' }}><span className="card-title">Cycle Tracker</span></div>
            {cycleDay ? (
              <>
                <div className="cycle-circle"><div className="cycle-day">{cycleDay}</div><div className="cycle-label">Day of Cycle</div></div>
                <div style={{ marginTop: 20, fontSize: 14, color: 'var(--text-secondary)' }}>
                  <strong>{phase} Phase</strong> — {phase === 'Menstrual' ? 'Iron-rich foods, gentle movement' : phase === 'Follicular' ? 'Energy rising — try new challenges' : phase === 'Ovulatory' ? 'Peak energy — intense workouts OK' : 'Wind down. Magnesium & stress management'}
                </div>
                <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => { cycle.logPeriodStart(); }}>🩸 Log Period Start</button>
              </>
            ) : (
              <div style={{ padding: 30 }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>No cycle data yet</p>
                <button className="btn btn-primary" onClick={() => cycle.logPeriodStart()}>🩸 Log Period Start</button>
              </div>
            )}
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Cycle Insights</span></div>
            <div style={{ fontSize: 13, lineHeight: 2.2, color: 'var(--text-secondary)' }}>
              <p>📅 <strong>Average Cycle:</strong> {cycle.get().averageLength || 32} days</p>
              <p>🩸 <strong>Last Period:</strong> {cycle.get().lastPeriodStart || 'Not logged'}</p>
              <p>📊 <strong>Current Day:</strong> {cycleDay || '—'}</p>
              <p>🌙 <strong>Phase:</strong> {phase}</p>
            </div>
            <div style={{ marginTop: 16, padding: 14, background: 'var(--warning-light)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
              💡 PCOS cycles are often longer (30-45 days). Tracking helps spot patterns.
            </div>
          </div>
        </div>
      )}

      {tab === 'achievements' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">🏆 Achievements</span>
            <span className="chip" style={{ background: 'var(--warning-light)', color: '#b8860b' }}>
              {ACHIEVEMENTS.filter(a => a.check()).length}/{ACHIEVEMENTS.length} earned
            </span>
          </div>
          {ACHIEVEMENTS.map(a => {
            const earned = a.check()
            return (
              <div key={a.id} className={`achievement ${earned ? 'earned' : 'locked'}`}>
                <div className="achievement-icon">{earned ? a.icon : '🔒'}</div>
                <div className="achievement-info">
                  <div className="achievement-name">{a.name}</div>
                  <div className="achievement-desc">{a.desc}</div>
                </div>
                {earned && <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: 13 }}>✓ Earned</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════
function SettingsPage() {
  const [p, setP] = useState(profile.get() || {})
  const [g, setG] = useState(goals.get())
  const [darkMode, setDarkMode] = useState(theme.get() === 'dark')

  const toggleDark = () => {
    const next = darkMode ? 'light' : 'dark'
    setDarkMode(!darkMode)
    theme.set(next)
  }

  const saveProfile = () => { profile.save(p) }
  const saveGoals = () => { goals.save(g) }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">Settings ⚙️</div>
        <div className="page-subtitle">Customize your experience</div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="settings-section">
          <div className="settings-title">Appearance</div>
          <div className="settings-row">
            <span className="settings-label">Dark Mode</span>
            <button className={`toggle ${darkMode ? 'on' : ''}`} onClick={toggleDark} />
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-title">Profile</div>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" value={p.name || ''} onChange={e => setP({ ...p, name: e.target.value })} onBlur={saveProfile} />
          </div>
          <div className="form-group">
            <label className="form-label">Age</label>
            <input className="form-input" type="number" value={p.age || ''} onChange={e => setP({ ...p, age: e.target.value })} onBlur={saveProfile} />
          </div>
          <div className="form-group">
            <label className="form-label">Goal</label>
            <select className="form-select" value={p.goal || ''} onChange={e => { setP({ ...p, goal: e.target.value }); profile.update({ goal: e.target.value }) }}>
              <option value="Lose Weight">Lose Weight</option>
              <option value="Build Muscle">Build Muscle</option>
              <option value="Manage Symptoms">Manage Symptoms</option>
              <option value="Get Healthier">Get Healthier</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-title">Daily Goals</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {[{ k: 'calories', l: 'Calories', u: 'cal' }, { k: 'protein', l: 'Protein', u: 'g' }, { k: 'carbs', l: 'Carbs', u: 'g' }, { k: 'fat', l: 'Fat', u: 'g' }, { k: 'water', l: 'Water', u: 'glasses' }, { k: 'sleepHours', l: 'Sleep', u: 'hours' }].map(f => (
              <div key={f.k} className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">{f.l} ({f.u})</label>
                <input className="form-input" type="number" value={g[f.k] || ''} onChange={e => setG({ ...g, [f.k]: parseInt(e.target.value) || 0 })} onBlur={saveGoals} />
              </div>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-title">Data</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={() => {
              const data = {}
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key.startsWith('pcos_')) data[key] = localStorage.getItem(key)
              }
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url; a.download = `pcos-coach-backup-${today()}.json`; a.click()
            }}>📥 Export Data</button>
            <button className="btn btn-danger" onClick={() => { if (confirm('Reset all data? This cannot be undone.')) { localStorage.clear(); location.reload() } }}>
              <Trash2 size={14} /> Reset All Data
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="settings-section">
          <div className="settings-title">About</div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            PCOS Coach v1.0 — An AI-powered fitness & nutrition companion designed for women with PCOS.
            <br /><br />
            Disclaimer: This app is for informational purposes only and is not a substitute for professional medical advice. Always consult your healthcare provider.
          </p>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════
const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'workouts', label: 'Workouts', icon: Dumbbell },
  { id: 'nutrition', label: 'Nutrition', icon: Apple },
  { id: 'coach', label: 'AI Coach', icon: MessageCircle },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
]

export default function App() {
  const [onboarded, setOnboarded] = useState(() => profile.isOnboarded())
  const [page, setPage] = useState('dashboard')
  const [refreshKey, setRefreshKey] = useState(0)
  const [fabOpen, setFabOpen] = useState(false)

  useEffect(() => { theme.init() }, [])

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  if (!onboarded) {
    return <Onboarding onComplete={() => { setOnboarded(true); refresh() }} />
  }

  const p = profile.get() || {}

  const pages = {
    dashboard: <Dashboard key={refreshKey} />,
    workouts: <Workouts onWorkoutDone={refresh} />,
    nutrition: <Nutrition onMealAdded={refresh} />,
    coach: <AICoach />,
    progress: <Progress key={refreshKey} />,
    settings: <SettingsPage />,
  }

  const fabActions = [
    { icon: <Utensils size={16} />, label: 'Log Meal', action: () => setPage('nutrition') },
    { icon: <Droplets size={16} />, label: 'Add Water', action: () => { dailyLog.setWater(today(), dailyLog.get(today()).water + 1); refresh() } },
    { icon: <Dumbbell size={16} />, label: 'Log Workout', action: () => setPage('workouts') },
    { icon: <Ruler size={16} />, label: 'Log Weight', action: () => setPage('progress') },
  ]

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="logo">
          <div className="logo-icon">⚡</div>
          <span className="logo-text">PCOS Coach</span>
        </div>
        <div className="nav-section">
          <div className="nav-label">Menu</div>
          {NAV.map(item => (
            <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => { setPage(item.id); setFabOpen(false); refresh() }}>
              <item.icon size={20} />{item.label}
            </button>
          ))}
        </div>
        <div className="nav-section">
          <div className="nav-label">Other</div>
          <button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => setPage('settings')}>
            <SettingsIcon size={20} />Settings
          </button>
          <button className="nav-item" style={{ color: 'var(--accent)' }}>
            <Award size={20} />Upgrade to Pro
          </button>
        </div>
        <div className="sidebar-bottom">
          <div className="user-card">
            <div className="user-avatar">{(p.name || 'U')[0]}</div>
            <div className="user-info">
              <div className="user-name">{p.name || 'User'}</div>
              <div className="user-plan">Free Plan · {streak.getTotalDays()} days active</div>
            </div>
          </div>
        </div>
      </nav>

      <main className="main">
        {pages[page]}
      </main>

      {/* FAB */}
      {page !== 'coach' && page !== 'settings' && (
        <>
          {fabOpen && (
            <div className="fab-menu">
              {fabActions.map((a, i) => (
                <button key={i} className="fab-menu-item" onClick={() => { a.action(); setFabOpen(false) }}>
                  {a.icon} {a.label}
                </button>
              ))}
            </div>
          )}
          <button className="fab" onClick={() => setFabOpen(!fabOpen)}>
            {fabOpen ? <X size={24} /> : <Plus size={24} />}
          </button>
        </>
      )}

      {/* Bottom Nav (Mobile) */}
      <div className="bottom-nav">
        <div className="bottom-nav-items">
          {NAV.map(item => (
            <button key={item.id} className={`bottom-nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => { setPage(item.id); refresh() }}>
              <item.icon size={22} />{item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
