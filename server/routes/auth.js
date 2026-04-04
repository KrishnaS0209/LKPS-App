const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const { auth } = require('../middleware/auth');
const https = require('https');

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

function makeOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendMail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not set');
  const body = JSON.stringify({ from: 'LKPS Portal <noreply@lkpschool.in>', to: [to], subject, html });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.resend.com', path: '/emails', method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const p = JSON.parse(data || '{}');
        if (res.statusCode >= 400) reject(new Error(p.message || p.name || 'Email send failed'));
        else resolve(p);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// GET /api/auth/test-mail
router.get('/test-mail', auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.adminId);
    await sendMail({ to: process.env.MAIL_USER || admin?.email, subject: 'LKPS Mail Test', html: '<p>Mail config working.</p>' });
    res.json({ ok: true, adminEmail: admin?.email });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/request-email-otp
router.post('/request-email-otp', auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.adminId);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    if (!admin.email) return res.status(400).json({ error: 'No email set. Add an email first.' });

    const otp = makeOTP();
    admin.otp = otp;
    admin.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await admin.save();

    await sendMail({
      to: admin.email,
      subject: 'Email Change OTP — LKPS Portal',
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#0d2b6e;margin-bottom:8px;">Email Change Request</h2>
        <p style="color:#555;font-size:14px;">Your OTP to authorize changing your email address is:</p>
        <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#0d2b6e;text-align:center;padding:20px;background:#eef2fb;border-radius:8px;margin:20px 0;">${otp}</div>
        <p style="color:#888;font-size:12px;">This OTP is valid for <b>10 minutes</b>. Do not share it with anyone.</p>
      </div>`,
    });

    res.json({ ok: true, email: admin.email.replace(/(.{2}).+(@.+)/, '$1***$2') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/verify-current-email-otp  — verify OTP for current email, then send OTP to new email
router.post('/verify-current-email-otp', auth, async (req, res) => {
  try {
    const { otp, newEmail } = req.body;
    if (!otp || !newEmail) return res.status(400).json({ error: 'OTP and new email required' });

    const admin = await Admin.findById(req.user.adminId);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    if (!admin.otp || admin.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (!admin.otpExpiry || new Date() > admin.otpExpiry) return res.status(400).json({ error: 'OTP has expired' });

    // Send OTP to new email
    const newOtp = makeOTP();
    admin.otp = newOtp;
    admin.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await admin.save();

    await sendMail({
      to: newEmail,
      subject: 'Verify New Email — LKPS Portal',
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#0d2b6e;margin-bottom:8px;">Verify New Email</h2>
        <p style="color:#555;font-size:14px;">Enter this OTP to confirm your new email address:</p>
        <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#0d2b6e;text-align:center;padding:20px;background:#eef2fb;border-radius:8px;margin:20px 0;">${newOtp}</div>
        <p style="color:#888;font-size:12px;">Valid for <b>10 minutes</b>. Do not share it.</p>
      </div>`,
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
  try {
    const { otp, newEmail } = req.body;
    if (!otp || !newEmail) return res.status(400).json({ error: 'OTP and new email required' });
    const admin = await Admin.findById(req.user.adminId);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    if (!admin.otp || admin.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (!admin.otpExpiry || new Date() > admin.otpExpiry) return res.status(400).json({ error: 'OTP has expired' });
    admin.email = newEmail; admin.otp = ''; admin.otpExpiry = null;
    await admin.save();
    res.json({ ok: true, email: newEmail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/request-otp', auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.adminId);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    if (!admin.email) return res.status(400).json({ error: 'No email set for this admin. Add email in settings first.' });

    const otp = makeOTP();
    admin.otp = otp;
    admin.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await admin.save();

    await sendMail({
      to: admin.email,
      subject: 'Password Change OTP — LKPS Portal',
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#0d2b6e;margin-bottom:8px;">Password Change Request</h2>
        <p style="color:#555;font-size:14px;">Your OTP to change the admin password is:</p>
        <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#0d2b6e;text-align:center;padding:20px;background:#eef2fb;border-radius:8px;margin:20px 0;">${otp}</div>
        <p style="color:#888;font-size:12px;">This OTP is valid for <b>10 minutes</b>. Do not share it with anyone.</p>
      </div>`,
    });

    res.json({ ok: true, email: admin.email.replace(/(.{2}).+(@.+)/, '$1***$2') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-email  — reset email using password (recovery, no OTP needed)
router.post('/reset-email', auth, async (req, res) => {
  try {
    const { password, newEmail } = req.body;
    if (!password || !newEmail) return res.status(400).json({ error: 'Password and new email required' });

    const admin = await Admin.findById(req.user.adminId);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    if (!(await admin.matchPassword(password))) return res.status(401).json({ error: 'Incorrect password' });

    admin.email = newEmail;
    admin.otp = '';
    admin.otpExpiry = null;
    await admin.save();

    res.json({ ok: true, email: newEmail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post('/verify-otp-change-password', auth, async (req, res) => {
  try {
    const { otp, newPassword } = req.body;
    if (!otp || !newPassword) return res.status(400).json({ error: 'OTP and new password required' });

    const admin = await Admin.findById(req.user.adminId);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    if (!admin.otp || admin.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (!admin.otpExpiry || new Date() > admin.otpExpiry) return res.status(400).json({ error: 'OTP has expired' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    admin.password = newPassword;
    admin.otp = '';
    admin.otpExpiry = null;
    await admin.save();

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
