// ParentPortal — separate file to keep App.jsx manageable
import React, { useState, useEffect } from 'react';
import { getMessages, sendMessage } from './storage';

const PARENT_NAV = [
  { id:'pdash',  icon:'home',          label:'Dashboard'   },
  { id:'patt',   icon:'fact_check',    label:'Attendance'  },
  { id:'pmarks', icon:'quiz',          label:'Marks'       },
  { id:'pexam',  icon:'event_note',    label:'Exams'       },
  { id:'pcal',   icon:'calendar_month',label:'Calendar'    },
  { id:'pmsg',   icon:'mail',          label:'Messages'    },
];

export default function ParentPortal({ db, student, activeSessionId, onLogout }) {
  const [page, setPage] = useState('pdash');
  const name = (student.fn || '') + ' ' + (student.ln || '');
  const photo = student.photo || '';
  const ini = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // Find child in db
  const child = db.students.find(s => (s.sid || s.id) === student.sid) || student;

  const pages = {
    pdash:  <ParentDash db={db} child={child} student={student} setPage={setPage} />,
    patt:   <ParentAttendance db={db} child={child} />,
    pmarks: <ParentMarks db={db} child={child} />,
    pexam:  <ParentExams db={db} child={child} />,
    pcal:   <ParentCalendar db={db} />,
    pmsg:   <ParentMessages db={db} child={child} student={student} activeSessionId={activeSessionId} />,
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f7fafc', fontFamily: 'Inter,sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: 'linear-gradient(180deg,#001530 0%,#002045 100%)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>Parent Portal</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>LORD KRISHNA PUBLIC SCHOOL</div>
        </div>
        {/* Child info */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#1960a3,#60a5fa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
            {photo ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : ini}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{child.cls || '—'} · Parent View</div>
          </div>
        </div>
        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {PARENT_NAV.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 2, fontWeight: 600, fontSize: 13, transition: 'all 150ms', textAlign: 'left',
                background: page === item.id ? 'rgba(96,165,250,0.18)' : 'transparent',
                color: page === item.id ? '#60a5fa' : 'rgba(255,255,255,0.6)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        {/* Logout */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={onLogout}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 13, transition: 'all 150ms' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#fca5a5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '32px 36px' }}>
        {pages[page] || pages.pdash}
      </main>
    </div>
  );
}

// ── Parent Dashboard ──────────────────────────────────────────────
function ParentDash({ db, child, student, setPage }) {
  const sid = child.sid || child.id;
  const name = (child.fn || '') + ' ' + (child.ln || '');

  // Attendance summary
  let p = 0, a = 0, l = 0;
  Object.values(db.att || {}).forEach(d => {
    const v = d[sid];
    if (v === 'P') p++;
    else if (v === 'L') l++;
    else if (v === 'A') a++;
  });
  const tot = p + a + l;
  const attPct = tot > 0 ? Math.round((p + l) / tot * 100) : 0;

  // Upcoming exams
  const today = new Date().toISOString().split('T')[0];
  const upcoming = (db.exams || []).filter(e => e.cls === child.cls && e.dt >= today && e.st !== 'Completed').slice(0, 3);

  // Recent marks
  const recentMarks = [];
  (db.exams || []).forEach(e => {
    const m = (db.marks || {})[e.eid || e.id];
    if (m && m[sid] !== undefined) recentMarks.push({ exam: e.name, marks: m[sid], max: e.max || 100 });
  });

  const STATS = [
    { icon: 'fact_check', label: 'Attendance', value: attPct + '%', color: attPct >= 90 ? '#059669' : attPct >= 75 ? '#d97706' : '#dc2626', page: 'patt' },
    { icon: 'quiz', label: 'Exams Taken', value: recentMarks.length, color: '#1960a3', page: 'pmarks' },
    { icon: 'event_note', label: 'Upcoming Exams', value: upcoming.length, color: '#7c3aed', page: 'pexam' },
    { icon: 'class', label: 'Class', value: child.cls || '—', color: '#0891b2', page: null },
  ];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Parent Dashboard</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, color: '#1e293b', fontFamily: 'Manrope,sans-serif', margin: 0 }}>{name}</h1>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Class {child.cls || '—'} · {db.settings?.year || ''}</div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        {STATS.map(s => (
          <div key={s.label} onClick={() => s.page && setPage(s.page)}
            style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 1px 8px rgba(0,31,77,0.06)', cursor: s.page ? 'pointer' : 'default', transition: 'all 150ms' }}
            onMouseEnter={e => { if (s.page) e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: s.color }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color, fontFamily: 'Manrope,sans-serif' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Upcoming exams */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 1px 8px rgba(0,31,77,0.06)' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', marginBottom: 14 }}>Upcoming Exams</div>
          {upcoming.length === 0 ? (
            <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>No upcoming exams</div>
          ) : upcoming.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#7c3aed' }}>quiz</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{e.name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{e.su || ''} · {e.dt || 'TBD'}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent marks */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 1px 8px rgba(0,31,77,0.06)' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', marginBottom: 14 }}>Recent Results</div>
          {recentMarks.length === 0 ? (
            <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>No results yet</div>
          ) : recentMarks.slice(-5).reverse().map((m, i) => {
            const pct = Math.round(m.marks / m.max * 100);
            const col = pct >= 75 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 12, color: '#1e293b', fontWeight: 600 }}>{m.exam}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: col }}>{m.marks}/{m.max}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Parent Attendance ─────────────────────────────────────────────
function ParentAttendance({ db, child }) {
  const sid = child.sid || child.id;
  let p = 0, a = 0, l = 0;
  const history = [];
  Object.entries(db.att || {}).forEach(([date, d]) => {
    const v = d[sid];
    if (v === 'P') p++;
    else if (v === 'L') l++;
    else if (v === 'A') a++;
    if (v) history.push({ date, status: v });
  });
  history.sort((a, b) => b.date.localeCompare(a.date));
  const tot = p + a + l;
  const pct = tot > 0 ? Math.round((p + l) / tot * 100) : 0;
  const col = pct >= 90 ? '#059669' : pct >= 75 ? '#d97706' : '#dc2626';

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1e293b', fontFamily: 'Manrope,sans-serif', marginBottom: 24 }}>Attendance</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[{ label: 'Present', val: p, c: '#059669' }, { label: 'Absent', val: a, c: '#dc2626' }, { label: 'Late', val: l, c: '#d97706' }, { label: 'Attendance %', val: pct + '%', c: col }].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '18px', boxShadow: '0 1px 8px rgba(0,31,77,0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.c, fontFamily: 'Manrope,sans-serif' }}>{s.val}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,31,77,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Attendance History</div>
        {history.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No attendance records yet</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Date', 'Status'].map(h => <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', background: '#f8fafc' }}>{h}</th>)}</tr></thead>
            <tbody>{history.slice(0, 60).map((r, i) => {
              const sc = r.status === 'P' ? '#059669' : r.status === 'A' ? '#dc2626' : '#d97706';
              const sl = r.status === 'P' ? 'Present' : r.status === 'A' ? 'Absent' : 'Late';
              return (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 20px', fontSize: 13, color: '#1e293b' }}>{new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td style={{ padding: '10px 20px' }}><span style={{ padding: '3px 10px', borderRadius: 20, background: sc + '18', color: sc, fontSize: 11, fontWeight: 700 }}>{sl}</span></td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Parent Marks ──────────────────────────────────────────────────
function ParentMarks({ db, child }) {
  const sid = child.sid || child.id;
  const results = [];
  (db.exams || []).forEach(e => {
    const m = (db.marks || {})[e.eid || e.id];
    if (m && m[sid] !== undefined) {
      const pct = Math.round(m[sid] / (e.max || 100) * 100);
      results.push({ name: e.name, su: e.su, dt: e.dt, marks: m[sid], max: e.max || 100, pct });
    }
  });
  results.sort((a, b) => (b.dt || '').localeCompare(a.dt || ''));

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1e293b', fontFamily: 'Manrope,sans-serif', marginBottom: 24 }}>Marks & Results</h1>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,31,77,0.06)', overflow: 'hidden' }}>
        {results.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No results available yet</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Exam', 'Subject', 'Date', 'Marks', 'Grade'].map(h => <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', background: '#f8fafc' }}>{h}</th>)}</tr></thead>
            <tbody>{results.map((r, i) => {
              const col = r.pct >= 75 ? '#059669' : r.pct >= 50 ? '#d97706' : '#dc2626';
              const g = r.pct >= 90 ? 'A+' : r.pct >= 80 ? 'A' : r.pct >= 70 ? 'B+' : r.pct >= 60 ? 'B' : r.pct >= 50 ? 'C' : 'F';
              return (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{r.name}</td>
                  <td style={{ padding: '12px 20px', fontSize: 12, color: '#64748b' }}>{r.su || '—'}</td>
                  <td style={{ padding: '12px 20px', fontSize: 12, color: '#64748b' }}>{r.dt || '—'}</td>
                  <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 800, color: col }}>{r.marks}/{r.max}</td>
                  <td style={{ padding: '12px 20px' }}><span style={{ padding: '3px 10px', borderRadius: 20, background: col + '18', color: col, fontSize: 11, fontWeight: 800 }}>{g}</span></td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Parent Exams ──────────────────────────────────────────────────
function ParentExams({ db, child }) {
  const today = new Date().toISOString().split('T')[0];
  const exams = (db.exams || []).filter(e => !e.cls || e.cls === child.cls);
  const upcoming = exams.filter(e => (e.dt || '') >= today && e.st !== 'Completed');
  const past = exams.filter(e => (e.dt || '') < today || e.st === 'Completed');

  const ExamRow = ({ e, badge }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#7c3aed' }}>quiz</span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{e.name}</div>
        <div style={{ fontSize: 11, color: '#64748b' }}>{e.su || ''}{e.su && e.dt ? ' · ' : ''}{e.dt || ''}{e.max ? ` · Max: ${e.max}` : ''}</div>
      </div>
      {badge && <span style={{ padding: '3px 10px', borderRadius: 20, background: badge.bg, color: badge.c, fontSize: 10, fontWeight: 700 }}>{badge.label}</span>}
    </div>
  );

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1e293b', fontFamily: 'Manrope,sans-serif', marginBottom: 24 }}>Exams</h1>
      <div style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 1px 8px rgba(0,31,77,0.06)', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 14 }}>Upcoming Exams</div>
        {upcoming.length === 0 ? <div style={{ fontSize: 12, color: '#94a3b8', padding: '20px 0', textAlign: 'center' }}>No upcoming exams</div>
          : upcoming.map(e => <ExamRow key={e.id} e={e} badge={{ label: 'Upcoming', bg: '#ede9fe', c: '#7c3aed' }} />)}
      </div>
      <div style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 1px 8px rgba(0,31,77,0.06)' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 14 }}>Past Exams</div>
        {past.length === 0 ? <div style={{ fontSize: 12, color: '#94a3b8', padding: '20px 0', textAlign: 'center' }}>No past exams</div>
          : past.map(e => <ExamRow key={e.id} e={e} badge={{ label: 'Completed', bg: '#dcfce7', c: '#059669' }} />)}
      </div>
    </div>
  );
}

// ── Parent Calendar ───────────────────────────────────────────────
function ParentCalendar({ db }) {
  const today = new Date().toISOString().split('T')[0];
  const events = [...(db.events || [])].sort((a, b) => a.dt.localeCompare(b.dt));
  const upcoming = events.filter(e => e.dt >= today);
  const past = events.filter(e => e.dt < today).reverse();

  const typeColor = { holiday: { bg: '#fee2e2', c: '#dc2626' }, event: { bg: '#dbeafe', c: '#1960a3' }, exam: { bg: '#ede9fe', c: '#7c3aed' } };

  const EventRow = ({ e }) => {
    const tc = typeColor[e.type] || typeColor.event;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ width: 44, textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{new Date(e.dt).getDate()}</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{new Date(e.dt).toLocaleDateString('en-IN', { month: 'short' })}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{e.title}</div>
          {e.note && <div style={{ fontSize: 11, color: '#64748b' }}>{e.note}</div>}
        </div>
        <span style={{ padding: '3px 10px', borderRadius: 20, background: tc.bg, color: tc.c, fontSize: 10, fontWeight: 700, textTransform: 'capitalize' }}>{e.type}</span>
      </div>
    );
  };

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1e293b', fontFamily: 'Manrope,sans-serif', marginBottom: 24 }}>Calendar & Holidays</h1>
      <div style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 1px 8px rgba(0,31,77,0.06)', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 14 }}>Upcoming Events & Holidays</div>
        {upcoming.length === 0 ? <div style={{ fontSize: 12, color: '#94a3b8', padding: '20px 0', textAlign: 'center' }}>No upcoming events</div>
          : upcoming.slice(0, 20).map((e, i) => <EventRow key={i} e={e} />)}
      </div>
      {past.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 1px 8px rgba(0,31,77,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 14 }}>Past Events</div>
          {past.slice(0, 10).map((e, i) => <EventRow key={i} e={e} />)}
        </div>
      )}
    </div>
  );
}

// ── Parent Messages ───────────────────────────────────────────────
function ParentMessages({ db, child, student, activeSessionId }) {
  const [msgs, setMsgs] = useState([]);
  const [form, setForm] = useState({ type: 'message', subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!activeSessionId) return;
    getMessages(activeSessionId).then(all => {
      setMsgs(all.filter(m => m.studentSid === (child.sid || child.id)));
    }).catch(() => {});
  }, [activeSessionId, child.sid, child.id]);

  const doSend = async () => {
    if (!form.subject.trim()) return;
    setSending(true);
    try {
      const msg = await sendMessage(activeSessionId, {
        studentSid: child.sid || child.id,
        studentName: (child.fn || '') + ' ' + (child.ln || ''),
        cls: child.cls,
        type: form.type,
        subject: form.subject.trim(),
        body: form.body.trim(),
      });
      setMsgs(prev => [msg, ...prev]);
      setForm({ type: 'message', subject: '', body: '' });
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (e) {
      alert('Failed to send: ' + e.message);
    }
    setSending(false);
  };

  const TYPE_OPTS = [
    { v: 'message', label: 'General Message' },
    { v: 'certificate', label: 'Certificate Request' },
    { v: 'request', label: 'Other Request' },
  ];

  const statusColor = { unread: { bg: '#dbeafe', c: '#1960a3' }, read: { bg: '#f1f5f9', c: '#64748b' }, resolved: { bg: '#dcfce7', c: '#059669' } };

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1e293b', fontFamily: 'Manrope,sans-serif', marginBottom: 24 }}>Messages & Requests</h1>

      {/* Compose */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '24px', boxShadow: '0 1px 8px rgba(0,31,77,0.06)', marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 16 }}>Send a Message to Admin</div>
        {sent && <div style={{ background: '#dcfce7', color: '#059669', borderRadius: 10, padding: '10px 14px', fontSize: 12, fontWeight: 600, marginBottom: 14 }}>Message sent successfully!</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Type</div>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b', outline: 'none', background: '#fff' }}>
              {TYPE_OPTS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Subject *</div>
            <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Request for Transfer Certificate"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Message (optional)</div>
          <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={3} placeholder="Add details here…"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>
        <button onClick={doSend} disabled={sending || !form.subject.trim()}
          style={{ padding: '11px 28px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#002045,#1960a3)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1 }}>
          {sending ? 'Sending…' : 'Send Message'}
        </button>
      </div>

      {/* Sent messages */}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,31,77,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Sent Messages ({msgs.length})</div>
        {msgs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No messages sent yet</div>
        ) : msgs.map((m, i) => {
          const sc = statusColor[m.status] || statusColor.unread;
          return (
            <div key={m._id || i} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{m.subject}</div>
                <span style={{ padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.c, fontSize: 10, fontWeight: 700, textTransform: 'capitalize' }}>{m.status}</span>
              </div>
              {m.body && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{m.body}</div>}
              <div style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(m.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · {m.type}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
