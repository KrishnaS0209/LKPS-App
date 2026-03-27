require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const connectDB = require('./config/db');

const app = express();

// ── Middleware ────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' })); // large for marksheet HTML

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/admins',  require('./routes/admins'));
app.use('/api/sessions', require('./routes/sessions'));

// Session-scoped routes
app.use('/api/sessions/:sessionId/students',   require('./routes/students'));
app.use('/api/sessions/:sessionId/teachers',   require('./routes/teachers'));
app.use('/api/sessions/:sessionId/payments',   require('./routes/payments'));
app.use('/api/sessions/:sessionId/attendance', require('./routes/attendance'));
app.use('/api/sessions/:sessionId/exams',      require('./routes/exams'));
app.use('/api/sessions/:sessionId/data',       require('./routes/sessionData'));
app.use('/api/sessions/:sessionId/messages',   require('./routes/messages'));
app.use('/api/admissions', require('./routes/admissions'));
app.use('/api/notices',   require('./routes/notices'));
app.use('/api/marksheet', require('./routes/marksheet'));

// ── Health check ──────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ── 404 handler ───────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Error handler ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`LKPS API running on http://localhost:${PORT}`));
  seedDefaultAdmin();
});

// ── Seed default admin on first run ──────────────────────────────
async function seedDefaultAdmin() {
  const Admin = require('./models/Admin');
  const exists = await Admin.findOne({ username: 'admin' });
  if (!exists) {
    await Admin.create({ username: 'admin', password: 'admin123', name: 'Administrator', role: 'Admin' });
    console.log('Default admin created — username: admin, password: admin123');
  }
}
