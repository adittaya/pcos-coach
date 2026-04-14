// API Client v2 — 100 features
const API_BASE = window.location.origin + '/api';
function getToken() { return localStorage.getItem('pcos_token'); }
function setToken(t) { localStorage.setItem('pcos_token', t); }
function clearToken() { localStorage.removeItem('pcos_token'); }

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) { if (res.status === 401) { clearToken(); location.reload(); } throw new Error(data.error || 'Request failed'); }
  return data;
}

export const api = {
  auth: {
    register: (d) => request('/auth/register', { method: 'POST', body: JSON.stringify(d) }).then(r => { setToken(r.token); return r; }),
    login: (d) => request('/auth/login', { method: 'POST', body: JSON.stringify(d) }).then(r => { setToken(r.token); return r; }),
    me: () => request('/auth/me'),
    update: (d) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(d) }),
    stats: () => request('/auth/stats'),
    logout: () => clearToken(),
    isLoggedIn: () => !!getToken(),
  },
  logs: {
    get: (date) => request(`/logs/${date}`),
    list: (from, to) => request(`/logs?from=${from}&to=${to}`),
    addMeal: (date, m) => request(`/logs/${date}/meals`, { method: 'POST', body: JSON.stringify(m) }),
    removeMeal: (date, id) => request(`/logs/${date}/meals/${id}`, { method: 'DELETE' }),
    setWater: (date, g) => request(`/logs/${date}/water`, { method: 'PUT', body: JSON.stringify({ glasses: g }) }),
    addWorkout: (date, w) => request(`/logs/${date}/workouts`, { method: 'POST', body: JSON.stringify(w) }),
    setSymptoms: (date, s) => request(`/logs/${date}/symptoms`, { method: 'PUT', body: JSON.stringify({ symptoms: s }) }),
    setSleep: (date, h, q, bed, wake) => request(`/logs/${date}/sleep`, { method: 'PUT', body: JSON.stringify({ hours: h, quality: q, bedtime: bed, waketime: wake }) }),
    addSupplement: (date, s) => request(`/logs/${date}/supplements`, { method: 'POST', body: JSON.stringify(s) }),
    removeSupplement: (date, id) => request(`/logs/${date}/supplements/${id}`, { method: 'DELETE' }),
    addMedication: (date, m) => request(`/logs/${date}/medications`, { method: 'POST', body: JSON.stringify(m) }),
    setMood: (date, mood, energy, stress, notes) => request(`/logs/${date}/mood`, { method: 'PUT', body: JSON.stringify({ mood, energy, stress, notes }) }),
    setSteps: (date, s) => request(`/logs/${date}/steps`, { method: 'PUT', body: JSON.stringify({ steps: s }) }),
    setHeartRate: (date, avg) => request(`/logs/${date}/heart-rate`, { method: 'PUT', body: JSON.stringify({ avg }) }),
    setPain: (date, l) => request(`/logs/${date}/pain`, { method: 'PUT', body: JSON.stringify({ level: l }) }),
  },
  weight: {
    list: (d) => request(`/weight${d ? `?days=${d}` : ''}`),
    add: (w, bf, mm, date) => request('/weight', { method: 'POST', body: JSON.stringify({ weight: w, bodyFat: bf, muscleMass: mm, date }) }),
  },
  measurements: {
    list: () => request('/measurements'),
    add: (d) => request('/measurements', { method: 'POST', body: JSON.stringify(d) }),
  },
  sleep: { list: (d) => request(`/sleep${d ? `?days=${d}` : ''}`) },
  mood: { list: (d) => request(`/mood${d ? `?days=${d}` : ''}`) },
  cycle: {
    get: () => request('/cycle'),
    logPeriod: (date) => request('/cycle/period', { method: 'POST', body: JSON.stringify({ date }) }),
  },
  bloodPressure: {
    list: (d) => request(`/blood-pressure${d ? `?days=${d}` : ''}`),
    add: (sys, dia, pulse, date) => request('/blood-pressure', { method: 'POST', body: JSON.stringify({ systolic: sys, diastolic: dia, pulse, date }) }),
  },
  bloodSugar: {
    list: (d) => request(`/blood-sugar${d ? `?days=${d}` : ''}`),
    add: (val, unit, timing, date) => request('/blood-sugar', { method: 'POST', body: JSON.stringify({ value: val, unit, timing, date }) }),
  },
  goals: { get: () => request('/goals'), save: (d) => request('/goals', { method: 'PUT', body: JSON.stringify(d) }) },
  chat: {
    list: () => request('/chat'),
    add: (role, content) => request('/chat', { method: 'POST', body: JSON.stringify({ role, content }) }),
    clear: () => request('/chat', { method: 'DELETE' }),
  },
  notifications: {
    list: () => request('/notifications'),
    add: (d) => request('/notifications', { method: 'POST', body: JSON.stringify(d) }),
    toggle: (id, en) => request(`/notifications/${id}`, { method: 'PUT', body: JSON.stringify({ enabled: en }) }),
    remove: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),
  },
  achievements: { list: () => request('/achievements'), earn: (id) => request('/achievements', { method: 'POST', body: JSON.stringify({ achievementId: id }) }) },
  streak: { get: () => request('/streak') },
  xp: { get: () => request('/xp') },
  recipes: {
    list: (params) => { const q = new URLSearchParams(params).toString(); return request(`/recipes${q ? `?${q}` : ''}`); },
    get: (id) => request(`/recipes/${id}`),
    create: (d) => request('/recipes', { method: 'POST', body: JSON.stringify(d) }),
    save: (id) => request(`/recipes/${id}/save`, { method: 'POST' }),
    saved: () => request('/recipes/saved/list'),
  },
  grocery: {
    list: () => request('/grocery'),
    create: (d) => request('/grocery', { method: 'POST', body: JSON.stringify(d) }),
    update: (id, d) => request(`/grocery/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    remove: (id) => request(`/grocery/${id}`, { method: 'DELETE' }),
  },
  fasting: {
    list: () => request('/fasting'),
    start: (type) => request('/fasting/start', { method: 'POST', body: JSON.stringify({ type }) }),
    stop: (id) => request(`/fasting/${id}/stop`, { method: 'POST' }),
    config: () => request('/fasting/config'),
  },
  customWorkouts: {
    list: () => request('/custom-workouts'),
    create: (d) => request('/custom-workouts', { method: 'POST', body: JSON.stringify(d) }),
    remove: (id) => request(`/custom-workouts/${id}`, { method: 'DELETE' }),
  },
  challenges: {
    list: () => request('/challenges'),
    join: (id) => request(`/challenges/${id}/join`, { method: 'POST' }),
    progress: (id, p) => request(`/challenges/${id}/progress`, { method: 'PUT', body: JSON.stringify({ progress: p }) }),
  },
  community: {
    list: () => request('/community'),
    post: (d) => request('/community', { method: 'POST', body: JSON.stringify(d) }),
    like: (id) => request(`/community/${id}/like`, { method: 'POST' }),
  },
  appointments: {
    list: () => request('/appointments'),
    create: (d) => request('/appointments', { method: 'POST', body: JSON.stringify(d) }),
    complete: (id, c) => request(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify({ completed: c }) }),
    remove: (id) => request(`/appointments/${id}`, { method: 'DELETE' }),
  },
  consultations: {
    list: () => request('/consultations'),
    create: (d) => request('/consultations', { method: 'POST', body: JSON.stringify(d) }),
  },
  wearables: {
    list: () => request('/wearables'),
    connect: (p) => request('/wearables/connect', { method: 'POST', body: JSON.stringify({ provider: p }) }),
    disconnect: (p) => request(`/wearables/${p}`, { method: 'DELETE' }),
  },
  analytics: {
    summary: (d) => request(`/analytics/summary?days=${d || 30}`),
    trends: (d) => request(`/analytics/trends?days=${d || 30}`),
    weeklyReport: () => request('/analytics/weekly-report'),
  },
  report: { get: (date) => request(`/report/${date}`) },
  barcode: { lookup: (code) => request('/barcode/lookup', { method: 'POST', body: JSON.stringify({ barcode: code }) }) },
  search: { foods: (q) => request(`/search/foods?q=${encodeURIComponent(q)}`) },
  export: () => request('/export'),
  import: (d) => request('/import', { method: 'POST', body: JSON.stringify(d) }),
  leaderboard: () => request('/leaderboard'),
  waterReminder: { get: () => request('/water-reminder'), save: (d) => request('/water-reminder', { method: 'PUT', body: JSON.stringify(d) }) },
  health: () => request('/health'),
};
