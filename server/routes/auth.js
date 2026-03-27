const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const { auth } = require('../middleware/auth');

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

// POST /api/auth/login  — admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const admin = await Admin.findOne({ username });
    if (!admin || !(await admin.matchPassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken({ adminId: admin._id, username: admin.username, role: admin.role, name: admin.name });
    res.json({
      token,
      user: { id: admin._id, username: admin.username, name: admin.name, role: admin.role, photo: admin.photo },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/teacher-login  — teacher portal login
router.post('/teacher-login', async (req, res) => {
  try {
    const { username, password, sessionId } = req.body;
    if (!username || !password || !sessionId) {
      return res.status(400).json({ error: 'username, password and sessionId required' });
    }

    const teacher = await Teacher.findOne({ sessionId, puser: username, ppass: password });
    if (!teacher) return res.status(401).json({ error: 'Invalid teacher credentials' });

    const token = signToken({ teacherId: teacher._id, tid: teacher.tid, sessionId, role: 'teacher', name: teacher.fn + ' ' + teacher.ln });
    res.json({
      token,
      teacher: { id: teacher._id, tid: teacher.tid, fn: teacher.fn, ln: teacher.ln, su: teacher.su, cls: teacher.cls, photo: teacher.photo || '' },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me  — get current user info
router.get('/me', auth, async (req, res) => {
  try {
    if (req.user.adminId) {
      const admin = await Admin.findById(req.user.adminId).select('-password');
      return res.json(admin);
    }
    if (req.user.teacherId) {
      const teacher = await Teacher.findById(req.user.teacherId);
      return res.json(teacher);
    }
    res.status(400).json({ error: 'Unknown user type' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/parent-login  — parent portal login (uses latest session)
router.post('/parent-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });

    // Find student with matching puser/ppass across all sessions, pick latest
    const students = await Student.find({ puser: username, ppass: password }).sort({ createdAt: -1 });
    if (!students.length) return res.status(401).json({ error: 'Invalid parent credentials' });

    // Use the most recently created record (latest session)
    const student = students[0];
    const token = signToken({ studentId: student._id, sid: student.sid, sessionId: student.sessionId, role: 'parent', name: student.fn + ' ' + student.ln });
    res.json({
      token,
      student: {
        id: student._id, sid: student.sid, fn: student.fn, ln: student.ln,
        cls: student.cls, sessionId: student.sessionId, photo: student.photo || '',
        father: student.father, mother: student.mother,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
