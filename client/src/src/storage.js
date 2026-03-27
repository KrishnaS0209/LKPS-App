// ── API-backed storage — talks to lkps-backend on localhost:5001 ──
const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// ── Token helpers ─────────────────────────────────────────────────
export function getToken()        { return localStorage.getItem('lkps_token'); }
export function setToken(t)       { localStorage.setItem('lkps_token', t); }
export function clearToken()      { localStorage.removeItem('lkps_token'); }

async function req(method, path, body) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
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
    const [config, students, teachers, payments, attendance, exams] = await Promise.all([
      loadSessionConfig(sessionId),
      getStudents(sessionId),
      getTeachers(sessionId),
      getPayments(sessionId),
      getAttendance(sessionId),
      getExams(sessionId),
    ]);

    // Normalise student/teacher photos stored separately in backend
    const photos = {};
    students.forEach(s => { if (s.photo) photos[s.sid] = s.photo; });
    const tphotos = {};
    teachers.forEach(t => { if (t.photo) tphotos[t.tid] = t.photo; });

    // Normalise marks: { examId: { studentSid: marks } }
    const marks = {};
    exams.forEach(e => { if (e.marks) marks[e.eid] = Object.fromEntries(e.marks); });

    return {
      settings: config.settings || {},
      classes:  config.classes  || [],
      tt:       config.tt       || [],
      slots:    config.slots    || [],
      fstr:     config.fstr     || { months: [], extras: [] },
      events:   config.events   || [],
      admins:   await getAdmins(),
      students: students.map(s => ({ ...s, id: s.sid })),
      teachers: teachers.map(t => ({ ...t, id: t.tid })),
      pays:     payments.map(p => ({ ...p, id: p.pid })),
      att:      attendance,
      exams:    exams.map(e => ({ ...e, id: e.eid })),
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

export async function saveSessionData(sessionId, db) {
  const prev = _shadow[sessionId] || {};
  _shadow[sessionId] = db;

  const ops = [];

  // Config fields
  const configFields = ['settings', 'classes', 'tt', 'slots', 'fstr', 'events'];
  const configPatch = {};
  let configChanged = false;
  configFields.forEach(k => {
    if (JSON.stringify(db[k]) !== JSON.stringify(prev[k])) {
      configPatch[k] = db[k];
      configChanged = true;
    }
  });
  if (configChanged) ops.push(saveSessionConfig(sessionId, configPatch));

  // Students — find added/updated/deleted
  const prevStudents = prev.students || [];
  const newStudents  = db.students   || [];
  const prevStuMap   = Object.fromEntries(prevStudents.map(s => [s.sid || s.id, s]));
  const newStuMap    = Object.fromEntries(newStudents.map(s => [s.sid || s.id, s]));

  newStudents.forEach(s => {
    const key = s.sid || s.id;
    if (!prevStuMap[key]) {
      ops.push(createStudent(sessionId, { ...s, sid: key }));
    } else if (JSON.stringify(s) !== JSON.stringify(prevStuMap[key])) {
      ops.push(updateStudent(sessionId, key, s));
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
    if (!prevTeaMap[key]) {
      ops.push(createTeacher(sessionId, { ...t, tid: key }));
    } else if (JSON.stringify(t) !== JSON.stringify(prevTeaMap[key])) {
      ops.push(updateTeacher(sessionId, key, t));
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
    if (!prevPayMap[key]) ops.push(createPayment(sessionId, { ...p, pid: key }));
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
    if (!prevExMap[key]) {
      ops.push(createExam(sessionId, { ...e, eid: key }));
    } else if (JSON.stringify(e) !== JSON.stringify(prevExMap[key])) {
      ops.push(updateExam(sessionId, key, e));
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

// ── Legacy compat — no-op (data is in MongoDB now) ───────────────
export async function migrateLegacyData() { return; }
export async function saveSessions() { return; } // sessions managed via API
