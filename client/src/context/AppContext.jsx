import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DB_KEY = 'lkps_data';

const defaultDB = {
  admins: [{ id: 1, username: 'admin', password: 'admin123', name: 'Administrator', role: 'Admin' }],
  settings: { school: 'LORD KRISHNA PUBLIC SCHOOL', year: '2025-2026', reportAcademicYear: '2025-2026', prin: '', phone: '', addr: 'Ishapur, Laxminagar, Mathura' },
  students: [], teachers: [], classes: [], att: {}, exams: [], marks: {}, pays: [],
  tt: [], fstr: { months: [], extras: [] }, photos: {},
  slots: [
    { id: '1', l: 'Period 1', s: '08:00', e: '08:45' }, { id: '2', l: 'Period 2', s: '08:45', e: '09:30' },
    { id: '3', l: 'Period 3', s: '09:30', e: '10:15' }, { id: '4', l: 'Break', s: '10:15', e: '10:30' },
    { id: '5', l: 'Period 4', s: '10:30', e: '11:15' }, { id: '6', l: 'Period 5', s: '11:15', e: '12:00' },
    { id: '7', l: 'Lunch', s: '12:00', e: '12:45' },   { id: '8', l: 'Period 6', s: '12:45', e: '13:30' },
    { id: '9', l: 'Period 7', s: '13:30', e: '14:15' }, { id: '10', l: 'Period 8', s: '14:15', e: '15:00' },
  ]
};

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [db, setDbRaw] = useState(defaultDB);
  const [session, setSession] = useState(null); // null = not logged in
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState('dash');

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DB_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setDbRaw(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) { console.warn('load:', e); }
  }, []);

  const setDb = useCallback((updater) => {
    setDbRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try { localStorage.setItem(DB_KEY, JSON.stringify(next)); } catch (e) {}
      return next;
    });
  }, []);

  const showToast = useCallback((msg, type = 'ok') => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const paid = useCallback((sid) =>
    db.pays.filter(p => p.sid === sid).reduce((s, p) => s + p.amt, 0), [db.pays]);

  return (
    <AppContext.Provider value={{ db, setDb, session, setSession, toast, showToast, page, setPage, paid }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() { return useContext(AppContext); }

// Helpers
export const AVATAR_COLORS = ['#388bfd','#3fb950','#f85149','#d29922','#bc8cff','#79c0ff'];
export function getAvatar(name, i) {
  const bg = AVATAR_COLORS[Math.abs(i || 0) % AVATAR_COLORS.length];
  const ini = (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return { bg, ini };
}
export function Avatar({ name, index }) {
  const { bg, ini } = getAvatar(name, index);
  return <span className="avatar" style={{ background: bg }}>{ini}</span>;
}

export function Badge({ children, color = 'blue' }) {
  return <span className={`badge badge-${color}`}>{children}</span>;
}

export function calcGrade(m, mx) {
  const p = m / mx * 100;
  if (p >= 90) return 'A+'; if (p >= 80) return 'A';
  if (p >= 70) return 'B'; if (p >= 60) return 'C'; return 'D';
}
export function gradeColor(m, mx) {
  const p = m / mx * 100;
  if (p >= 90) return 'green'; if (p >= 80) return 'blue';
  if (p >= 70) return 'purple'; if (p >= 60) return 'yellow'; return 'red';
}

export function csvStr(rows) {
  return rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
}
export function downloadCSV(name, rows) {
  const blob = new Blob([csvStr(rows)], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
}
export function downloadJSON(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
}
