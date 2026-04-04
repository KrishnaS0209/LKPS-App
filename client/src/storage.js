import { getApiBase, getApiRoot } from './apiBase';

// ── API-backed storage (base from apiBase.js — ignores mistaken localhost env on Vercel) ──

function urlsForPath(path) {
  const root = getApiRoot().replace(/\/+$/, '');
  const api = getApiBase().replace(/\/+$/, '');
  // Try both forms so auth keeps working even if a stale/misconfigured base appears.
  return Array.from(new Set([
    `${api}${path}`,
    `${root}${path}`,
    `${root}/api${path}`,
  ]));
}

// ── Token helpers ─────────────────────────────────────────────────
export function getToken()        { return sessionStorage.getItem('lkps_token'); }
export function setToken(t)       { sessionStorage.setItem('lkps_token', t); }
export function clearToken()      { sessionStorage.removeItem('lkps_token'); }

async function req(method, path, body) {
  const token = getToken();
  const candidates = urlsForPath(path);
  let lastErr = null;

  for (const url of candidates) {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;

    const msg = data.error || res.statusText || '';
    lastErr = new Error(msg);
    // If one base gives route miss, try the alternate base.
    if (res.status === 404 && /route not found/i.test(msg)) continue;
    throw lastErr;
  }

  throw lastErr || new Error('Request failed');
}

// ── Auth ──────────────────────────────────────────────────────────

export async function apiLogin(username, password) {
  const data = await req('POST', '/auth/login', { username, password });
  setToken(data.token);
  return data.user; // { id, username, name, role, photo }
}

export async function apiTeacherLogin(username, password, sessionId) {
  const data = await req('POST', '/auth/teacher-login', { username, password, sessionId });
  setToken(data.token);
  return data.teacher;
}

export async function apiParentLogin(username, password) {
  const data = await req('POST', '/auth/parent-login', { username, password });
  setToken(data.token);
  return data.student;
}

// ── Sessions ──────────────────────────────────────────────────────

export async function getSessions() {
  const list = await req('GET', '/sessions');
  // normalise: backend uses { sid, name, year, created } — app uses { id, name, year, created }
  return list.map(s => ({ ...s, id: s.sid }));
}

export async function createSession(sid, name, year, carryFrom) {
  const s = await req('POST', '/sessions', { sid, name, year, carryFrom });
  return { ...s, id: s.sid };
}

export async function updateSession(sid, name, year) {
  const s = await req('PATCH', '/sessions/' + sid, { name, year });
  return { ...s, id: s.sid };
}

export async function deleteSession(sid) {
  await req('DELETE', '/sessions/' + sid);
}

// ── Session data (settings, classes, tt, slots, fstr, events) ─────

export async function loadSessionConfig(sessionId) {
  return req('GET', '/sessions/' + sessionId + '/data');
}

export async function saveSessionConfig(sessionId, patch) {
  return req('PATCH', '/sessions/' + sessionId + '/data', patch);
}

// ── Students ──────────────────────────────────────────────────────

export async function getStudents(sessionId) {
  return req('GET', '/sessions/' + sessionId + '/students');
}

export async function createStudent(sessionId, student) {
  return req('POST', '/sessions/' + sessionId + '/students', student);
}

export async function updateStudent(sessionId, sid, patch) {
  return req('PATCH', '/sessions/' + sessionId + '/students/' + sid, patch);
}

export async function deleteStudent(sessionId, sid) {
  return req('DELETE', '/sessions/' + sessionId + '/students/' + sid);
}

// ── Teachers ──────────────────────────────────────────────────────

export async function getTeachers(sessionId) {
  return req('GET', '/sessions/' + sessionId + '/teachers');
}

export async function createTeacher(sessionId, teacher) {
  return req('POST', '/sessions/' + sessionId + '/teachers', teacher);
}

export async function updateTeacher(sessionId, tid, patch) {
  return req('PATCH', '/sessions/' + sessionId + '/teachers/' + tid, patch);
}

export async function deleteTeacher(sessionId, tid) {
  return req('DELETE', '/sessions/' + sessionId + '/teachers/' + tid);
}

// ── Payments ──────────────────────────────────────────────────────

export async function getPayments(sessionId) {
  return req('GET', '/sessions/' + sessionId + '/payments');
}

export async function createPayment(sessionId, payment) {
  return req('POST', '/sessions/' + sessionId + '/payments', payment);
}

export async function deletePayment(sessionId, pid) {
  return req('DELETE', '/sessions/' + sessionId + '/payments/' + pid);
}

// ── Attendance ────────────────────────────────────────────────────

export async function getAttendance(sessionId) {
  return req('GET', '/sessions/' + sessionId + '/attendance');
}

export async function saveAttendance(sessionId, date, cls, records) {
  return req('POST', '/sessions/' + sessionId + '/attendance', { date, cls, records });
}

// ── Exams ─────────────────────────────────────────────────────────

export async function getExams(sessionId) {
  return req('GET', '/sessions/' + sessionId + '/exams');
}

export async function createExam(sessionId, exam) {
  return req('POST', '/sessions/' + sessionId + '/exams', exam);
}

export async function updateExam(sessionId, eid, patch) {
  return req('PATCH', '/sessions/' + sessionId + '/exams/' + eid, patch);
}

export async function deleteExam(sessionId, eid) {
  return req('DELETE', '/sessions/' + sessionId + '/exams/' + eid);
}

// ── Admins ────────────────────────────────────────────────────────

export async function getAdmins() {
  return req('GET', '/admins');
}

export async function createAdmin(data) {
  return req('POST', '/admins', data);
}

export async function updateAdmin(id, patch) {
  return req('PATCH', '/admins/' + id, patch);
}

export async function removeAdmin(id) {
  return req('DELETE', '/admins/' + id);
}

// ── Load full session DB (assembles all collections into one object)
export async function loadSessionData(sessionId) {
  try {
    const safe = (p, fallback) => p.catch(e => { console.warn('[loadSessionData] partial fail:', e.message); return fallback; });

    const [config, students, teachers, payments, attendance, exams] = await Promise.all([
      safe(loadSessionConfig(sessionId), {}),
      safe(getStudents(sessionId),  []),
      safe(getTeachers(sessionId),  []),
      safe(getPayments(sessionId),  []),
      safe(getAttendance(sessionId), {}),
      safe(getExams(sessionId),     []),
    ]);

    // Normalise student/teacher photos stored separately in backend
    const photos = {};
    (Array.isArray(students) ? students : []).forEach(s => { if (s.photo) photos[s.sid] = s.photo; });
    const tphotos = {};
    (Array.isArray(teachers) ? teachers : []).forEach(t => { if (t.photo) tphotos[t.tid] = t.photo; });

    // Normalise marks
    const marks = {};
    (Array.isArray(exams) ? exams : []).forEach(e => {
      if (!e.marks || typeof e.marks !== 'object') return;
      // After .lean(), marks is a plain object { sid: value }
      const entries = Object.entries(e.marks);
      if (entries.length === 0) return;
      // Check if keys are encoded as "sid__cls" (multi-class) or plain "sid"
      const isMultiClass = entries.some(([k]) => k.includes('__'));
      if (isMultiClass) {
        // Decode: "sid__cls" → group by cls
        entries.forEach(([k, v]) => {
          const sep = k.lastIndexOf('__');
          const sid = k.slice(0, sep);
          const cls = k.slice(sep + 2);
          const marksKey = e.eid + '_' + cls;
          if (!marks[marksKey]) marks[marksKey] = {};
          marks[marksKey][sid] = v;
        });
      } else {
        // Single-class exam
        const cls = e.cls || '';
        const marksKey = e.eid + '_' + cls;
        marks[marksKey] = Object.fromEntries(entries);
      }
    });

    const defaultSettings = {
      school: 'LORD KRISHNA PUBLIC SCHOOL',
      year: '2025-2026',
      reportAcademicYear: '2025-2026',
      prin: '',
      phone: '',
      addr: '',
    };
    return {
      settings: { ...defaultSettings, ...(config.settings || {}) },
      classes:  (config.classes  || []).map(c => { const { _id, __v, ...rest } = c; return rest; }),
      tt:       (config.tt       || []).map(({ _id, __v, ...r }) => r),
      slots:    (config.slots    || []).map(({ _id, __v, ...r }) => r),
      fstr: {
        months: (config.fstr?.months || []).map(({ _id, __v, ...r }) => r),
        extras: (config.fstr?.extras || []).map(({ _id, __v, ...r }) => r),
      },
      events:   (config.events   || []).map(({ _id, __v, ...r }) => r),
      certRegistry: (config.certRegistry || []).map(({ _id, __v, ...r }) => r),
      admins:   await getAdmins().catch(() => []),
      students: (Array.isArray(students) ? students : []).map(s => ({ ...s, id: s.sid })),
      teachers: (Array.isArray(teachers) ? teachers : []).map(t => ({ ...t, id: t.tid })),
      pays:     (Array.isArray(payments) ? payments : []).map(p => ({
        ...p,
        id:  p.pid,
        dt:  p.dt   || p.date || '',
        md:  p.md   || p.mode || 'Cash',
        mn:  p.mn   || (Array.isArray(p.months) ? p.months.join(', ') : ''),
      })),
      att:      (attendance && typeof attendance === 'object' && !Array.isArray(attendance)) ? attendance : {},
      exams:    (Array.isArray(exams) ? exams : []).map(e => ({
        ...e,
        id:  e.eid,
        // map backend field names → frontend field names
        su:  e.su  || e.subject || '',
        dt:  e.dt  || e.date    || '',
        max: e.max || e.maxMarks || 100,
      })),
      marks,
      photos,
      tphotos,
    };
  } catch (err) {
    console.error('loadSessionData failed:', err);
    return null;
  }
}

// ── Save full session DB (diffs and pushes only what changed) ─────
// We keep a shadow copy to detect changes
const _shadow = {};

// Call this after loadSessionData to prime the shadow so first save diffs correctly
export function initShadow(sessionId, db) {
  _shadow[sessionId] = db;
}

export async function saveSessionData(sessionId, db) {
  const prev = _shadow[sessionId] || {};
  _shadow[sessionId] = db;

  const ops = [];

  // Config fields — always save all of them on every call (they're small and diff is unreliable)
  const configPatch = {
    settings: db.settings,
    classes:  db.classes,
    tt:       db.tt,
    slots:    db.slots,
    fstr:     db.fstr,
    events:   db.events,
    certRegistry: db.certRegistry || [],
  };
  ops.push(saveSessionConfig(sessionId, configPatch));

  // Students — find added/updated/deleted
  const prevStudents = prev.students || [];
  const newStudents  = db.students   || [];
  const prevStuMap   = Object.fromEntries(prevStudents.map(s => [s.sid || s.id, s]));
  const newStuMap    = Object.fromEntries(newStudents.map(s => [s.sid || s.id, s]));

  newStudents.forEach(s => {
    const key = s.sid || s.id;
    // merge photo from photos map into the student record before saving
    const photo = (db.photos || {})[key] || (db.photos || {})[s.id] || null;
    const sWithPhoto = photo ? { ...s, sid: key, photo } : { ...s, sid: key };
    const prevWithPhoto = prevStuMap[key]
      ? { ...prevStuMap[key], photo: (prev.photos || {})[key] || (prev.photos || {})[prevStuMap[key].id] || null }
      : null;
    if (!prevStuMap[key]) {
      ops.push(createStudent(sessionId, sWithPhoto));
    } else if (JSON.stringify(sWithPhoto) !== JSON.stringify(prevWithPhoto)) {
      ops.push(updateStudent(sessionId, key, sWithPhoto));
    }
  });
  prevStudents.forEach(s => {
    const key = s.sid || s.id;
    if (!newStuMap[key]) ops.push(deleteStudent(sessionId, key));
  });

  // Teachers
  const prevTeachers = prev.teachers || [];
  const newTeachers  = db.teachers   || [];
  const prevTeaMap   = Object.fromEntries(prevTeachers.map(t => [t.tid || t.id, t]));
  const newTeaMap    = Object.fromEntries(newTeachers.map(t => [t.tid || t.id, t]));

  newTeachers.forEach(t => {
    const key = t.tid || t.id;
    // merge photo from tphotos map into the teacher record before saving
    const photo = (db.tphotos || {})[key] || (db.tphotos || {})[t.id] || null;
    const tWithPhoto = photo ? { ...t, tid: key, photo } : { ...t, tid: key };
    const prevWithPhoto = prevTeaMap[key]
      ? { ...prevTeaMap[key], photo: (prev.tphotos || {})[key] || (prev.tphotos || {})[prevTeaMap[key].id] || null }
      : null;
    if (!prevTeaMap[key]) {
      ops.push(createTeacher(sessionId, tWithPhoto));
    } else if (JSON.stringify(tWithPhoto) !== JSON.stringify(prevWithPhoto)) {
      ops.push(updateTeacher(sessionId, key, tWithPhoto));
    }
  });
  prevTeachers.forEach(t => {
    const key = t.tid || t.id;
    if (!newTeaMap[key]) ops.push(deleteTeacher(sessionId, key));
  });

  // Payments
  const prevPays = prev.pays || [];
  const newPays  = db.pays   || [];
  const prevPayMap = Object.fromEntries(prevPays.map(p => [p.pid || p.id, p]));
  const newPayMap  = Object.fromEntries(newPays.map(p => [p.pid || p.id, p]));

  newPays.forEach(p => {
    const key = p.pid || p.id;
    if (!prevPayMap[key]) ops.push(createPayment(sessionId, {
      pid:      key,
      sid:      p.sid,
      amt:      p.amt,
      date:     p.dt   || p.date  || '',
      mode:     p.md   || p.mode  || 'Cash',
      note:     p.note || '',
      months:   p.mn   ? [p.mn]   : (p.months || []),
      extras:   p.extras || [],
      // preserve all extra frontend fields so they survive round-trip
      nm: p.nm, cls: p.cls, fee: p.fee, totalAmt: p.totalAmt,
      tuition: p.tuition, md: p.md, ref: p.ref, mn: p.mn,
      ty: p.ty, rc: p.rc, bb: p.bb, ba: p.ba,
    }));
  });
  prevPays.forEach(p => {
    const key = p.pid || p.id;
    if (!newPayMap[key]) ops.push(deletePayment(sessionId, key));
  });

  // Exams
  const prevExams = prev.exams || [];
  const newExams  = db.exams  || [];
  const prevExMap = Object.fromEntries(prevExams.map(e => [e.eid || e.id, e]));
  const newExMap  = Object.fromEntries(newExams.map(e => [e.eid || e.id, e]));

  newExams.forEach(e => {
    const key = e.eid || e.id;
    // Collect all marks for this exam across all classes
    const allMarks = {};
    const classes = e.cls ? [e.cls] : (db.classes || []).map(c => c.name);
    classes.forEach(cls => {
      const marksKey = key + '_' + cls;
      const clsMarks = db.marks?.[marksKey] || {};
      Object.entries(clsMarks).forEach(([sid, val]) => {
        allMarks[sid + '__' + cls] = val; // encode cls into key for multi-class exams
      });
    });
    // For single-class exams, use simple sid keys
    const marksPayload = e.cls
      ? (db.marks?.[key + '_' + e.cls] || {})
      : allMarks;

    const payload = {
      ...e,
      eid:      key,
      subject:  e.su  || e.subject  || '',
      date:     e.dt  || e.date     || '',
      maxMarks: e.max || e.maxMarks || 100,
      marks:    marksPayload,
    };
    if (!prevExMap[key]) {
      ops.push(createExam(sessionId, payload));
    } else {
      const prevMarksKey = key + '_' + (e.cls || '');
      const prevMarks = prev.marks?.[prevMarksKey] || {};
      const examChanged = JSON.stringify({ ...e, su: e.su, dt: e.dt, max: e.max }) !==
                          JSON.stringify({ ...prevExMap[key], su: prevExMap[key].su, dt: prevExMap[key].dt, max: prevExMap[key].max });
      const marksChanged = JSON.stringify(marksPayload) !== JSON.stringify(prevMarks);
      if (examChanged || marksChanged) {
        ops.push(updateExam(sessionId, key, payload));
      }
    }
  });
  prevExams.forEach(e => {
    const key = e.eid || e.id;
    if (!newExMap[key]) ops.push(deleteExam(sessionId, key));
  });

  // Attendance — find changed dates
  const prevAtt = prev.att || {};
  const newAtt  = db.att   || {};
  const allDates = new Set([...Object.keys(prevAtt), ...Object.keys(newAtt)]);
  allDates.forEach(date => {
    if (JSON.stringify(newAtt[date]) !== JSON.stringify(prevAtt[date]) && newAtt[date]) {
      // Extract class from first student key — attendance is stored as { date: { sid: status } }
      // We save per-date (all classes merged) — backend handles it
      ops.push(saveAttendance(sessionId, date, '_all', newAtt[date]));
    }
  });

  await Promise.allSettled(ops);
}

export async function requestOTP() {
  return req('POST', '/auth/request-otp');
}

export async function verifyOTPChangePassword(otp, newPassword) {
  return req('POST', '/auth/verify-otp-change-password', { otp, newPassword });
}

export async function requestEmailOTP(newEmail) {
  return req('POST', '/auth/request-email-otp', { newEmail });
}

export async function verifyEmailOTP(otp, newEmail) {
  return req('POST', '/auth/verify-email-otp', { otp, newEmail });
}
export async function migrateLegacyData() { return; }
export async function saveSessions() { return; } // sessions managed via API

// ── Messages (parent → admin) ─────────────────────────────────────

export async function getMessages(sessionId) {
  return req('GET', '/sessions/' + sessionId + '/messages');
}

export async function sendMessage(sessionId, msg) {
  return req('POST', '/sessions/' + sessionId + '/messages', msg);
}

export async function updateMessage(sessionId, id, patch) {
  return req('PATCH', '/sessions/' + sessionId + '/messages/' + id, patch);
}

export async function deleteMessage(sessionId, id) {
  return req('DELETE', '/sessions/' + sessionId + '/messages/' + id);
}
