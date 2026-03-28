// ── Local Storage DB ─────────────────────────────────────────────
const KEY = 'lkps_data';

const DEFAULT = {
  admins: [{ id: 1, username: 'admin', password: 'admin123', name: 'Administrator', role: 'Admin' }],
  settings: { school: 'LORD KRISHNA PUBLIC SCHOOL', year: '2025-2026', reportAcademicYear: '2025-2026', prin: '', phone: '9997360040, 8650616990', addr: 'Ishapur, Laxminagar, Mathura' },
  students: [], teachers: [], classes: [], att: {}, exams: [], marks: {}, pays: [], events: [],
  tt: [], fstr: { months: [], extras: [] }, photos: {}, tphotos: {},
  slots: [
    { id: '1', l: 'Period 1', s: '08:00', e: '08:45' }, { id: '2', l: 'Period 2', s: '08:45', e: '09:30' },
    { id: '3', l: 'Period 3', s: '09:30', e: '10:15' }, { id: '4', l: 'Break',    s: '10:15', e: '10:30' },
    { id: '5', l: 'Period 4', s: '10:30', e: '11:15' }, { id: '6', l: 'Period 5', s: '11:15', e: '12:00' },
    { id: '7', l: 'Lunch',    s: '12:00', e: '12:45' }, { id: '8', l: 'Period 6', s: '12:45', e: '13:30' },
    { id: '9', l: 'Period 7', s: '13:30', e: '14:15' }, { id: '10', l: 'Period 8', s: '14:15', e: '15:00' },
  ]
};

export function loadDB() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT,
        ...parsed,
        settings: { ...DEFAULT.settings, ...(parsed.settings || {}) },
      };
    }
  } catch (e) {}
  return { ...DEFAULT };
}

export function saveDB(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
}

export function exportJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lkps_backup.json';
  a.click();
}

export function importJSON(cb) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { try { cb(JSON.parse(ev.target.result)); } catch (err) { alert('Invalid file'); } };
    reader.readAsText(file);
  };
  input.click();
}

export function exportCSV(name, rows) {
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
export function paidTotal(pays, sid) { return pays.filter(p => p.sid === sid).reduce((s, p) => s + p.amt, 0); }
export function grade(m, mx) { const p = m / mx * 100; if (p >= 90) return 'A+'; if (p >= 80) return 'A'; if (p >= 70) return 'B'; if (p >= 60) return 'C'; return 'D'; }
export function gradeColor(m, mx) { const p = m / mx * 100; if (p >= 90) return '#3fb950'; if (p >= 80) return '#388bfd'; if (p >= 70) return '#bc8cff'; if (p >= 60) return '#d29922'; return '#f85149'; }
