// API Client — replaces localStorage with real backend calls
const API_BASE = window.location.origin + '/api';

function getToken() {
  return localStorage.getItem('pcos_token');
}

function setToken(token) {
  localStorage.setItem('pcos_token', token);
}

function clearToken() {
  localStorage.removeItem('pcos_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    if (res.status === 401) { clearToken(); window.location.reload(); }
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

// ── Auth ──
export const api = {
  auth: {
    register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }).then(r => { setToken(r.token); return r; }),
    login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }).then(r => { setToken(r.token); return r; }),
    me: () => request('/auth/me'),
    updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
    logout: () => clearToken(),
    isLoggedIn: () => !!getToken(),
  },

  // ── Daily Logs ──
  logs: {
    get: (date) => request(`/logs/${date}`),
    list: (from, to) => request(`/logs?from=${from}&to=${to}`),
    addMeal: (date, meal) => request(`/logs/${date}/meals`, { method: 'POST', body: JSON.stringify(meal) }),
    removeMeal: (date, mealId) => request(`/logs/${date}/meals/${mealId}`, { method: 'DELETE' }),
    setWater: (date, glasses) => request(`/logs/${date}/water`, { method: 'PUT', body: JSON.stringify({ glasses }) }),
    addWorkout: (date, workout) => request(`/logs/${date}/workouts`, { method: 'POST', body: JSON.stringify(workout) }),
    setSymptoms: (date, symptoms) => request(`/logs/${date}/symptoms`, { method: 'PUT', body: JSON.stringify({ symptoms }) }),
    setSleep: (date, hours, quality) => request(`/logs/${date}/sleep`, { method: 'PUT', body: JSON.stringify({ hours, quality }) }),
    addSupplement: (date, supp) => request(`/logs/${date}/supplements`, { method: 'POST', body: JSON.stringify(supp) }),
    removeSupplement: (date, suppId) => request(`/logs/${date}/supplements/${suppId}`, { method: 'DELETE' }),
  },

  // ── Weight ──
  weight: {
    list: (days) => request(`/weight${days ? `?days=${days}` : ''}`),
    add: (weight, date) => request('/weight', { method: 'POST', body: JSON.stringify({ weight, date }) }),
  },

  // ── Measurements ──
  measurements: {
    list: () => request('/measurements'),
    add: (data) => request('/measurements', { method: 'POST', body: JSON.stringify(data) }),
  },

  // ── Sleep ──
  sleep: {
    list: (days) => request(`/sleep${days ? `?days=${days}` : ''}`),
  },

  // ── Cycle ──
  cycle: {
    get: () => request('/cycle'),
    logPeriod: (date) => request('/cycle/period', { method: 'POST', body: JSON.stringify({ date }) }),
  },

  // ── Goals ──
  goals: {
    get: () => request('/goals'),
    save: (data) => request('/goals', { method: 'PUT', body: JSON.stringify(data) }),
  },

  // ── Chat ──
  chat: {
    list: () => request('/chat'),
    add: (role, content) => request('/chat', { method: 'POST', body: JSON.stringify({ role, content }) }),
    clear: () => request('/chat', { method: 'DELETE' }),
  },

  // ── Notifications ──
  notifications: {
    list: () => request('/notifications'),
    add: (data) => request('/notifications', { method: 'POST', body: JSON.stringify(data) }),
    toggle: (id, enabled) => request(`/notifications/${id}`, { method: 'PUT', body: JSON.stringify({ enabled }) }),
    remove: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),
  },

  // ── Achievements ──
  achievements: {
    list: () => request('/achievements'),
    earn: (id) => request('/achievements', { method: 'POST', body: JSON.stringify({ achievementId: id }) }),
  },

  // ── Streak ──
  streak: {
    get: () => request('/streak'),
  },

  // ── Analytics ──
  analytics: {
    summary: (days) => request(`/analytics/summary?days=${days || 30}`),
    trends: (days) => request(`/analytics/trends?days=${days || 30}`),
  },

  // ── Export ──
  export: () => request('/export'),

  // ── Health ──
  health: () => request('/health'),
};
