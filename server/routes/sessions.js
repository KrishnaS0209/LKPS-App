const router = require('express').Router();
const Session = require('../models/Session');
const SessionData = require('../models/SessionData');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const Exam = require('../models/Exam');
const { auth } = require('../middleware/auth');

const DEFAULT_SLOTS = [
  { id: '1', l: 'Period 1', s: '08:00', e: '08:45' },
  { id: '2', l: 'Period 2', s: '08:45', e: '09:30' },
  { id: '3', l: 'Period 3', s: '09:30', e: '10:15' },
  { id: '4', l: 'Break',    s: '10:15', e: '10:30' },
  { id: '5', l: 'Period 4', s: '10:30', e: '11:15' },
  { id: '6', l: 'Period 5', s: '11:15', e: '12:00' },
  { id: '7', l: 'Lunch',    s: '12:00', e: '12:45' },
  { id: '8', l: 'Period 6', s: '12:45', e: '13:30' },
  { id: '9', l: 'Period 7', s: '13:30', e: '14:15' },
  { id: '10', l: 'Period 8', s: '14:15', e: '15:00' },
];

// GET /api/sessions  — list all sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await Session.find().sort({ created: 1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions  — create new session (with optional carry-over)
router.post('/', auth, async (req, res) => {
  try {
    const { sid, name, year, carryFrom } = req.body;
    if (!sid || !name || !year) return res.status(400).json({ error: 'sid, name, year required' });

    const exists = await Session.findOne({ sid });
    if (exists) return res.status(409).json({ error: 'Session already exists' });

    const session = await Session.create({ sid, name, year });

    // Build initial SessionData
    let sdInit = {
      sessionId: sid,
      settings: { school: 'LORD KRISHNA PUBLIC SCHOOL', year, prin: '', phone: '9997360040, 8650616990', addr: 'Ishapur, Laxminagar, Mathura' },
      classes: [], tt: [], slots: DEFAULT_SLOTS, fstr: { months: [], extras: [] }, events: [],
    };

    // Carry-over from another session
    if (carryFrom?.sessionId) {
      const src = await SessionData.findOne({ sessionId: carryFrom.sessionId });
      if (src) {
        if (carryFrom.classes)   sdInit.classes  = src.classes;
        if (carryFrom.tt)        sdInit.tt        = src.tt;
        if (carryFrom.slots)     sdInit.slots     = src.slots;
        if (carryFrom.feeStruct) sdInit.fstr      = src.fstr;
        if (carryFrom.settings)  sdInit.settings  = { ...src.settings, year };
        if (carryFrom.events)    sdInit.events    = src.events;
      }
      if (carryFrom.teachers) {
        const srcTeachers = await Teacher.find({ sessionId: carryFrom.sessionId }).lean();
        const newTeachers = srcTeachers.map(t => ({ ...t, _id: undefined, sessionId: sid }));
        if (newTeachers.length) await Teacher.insertMany(newTeachers, { ordered: false }).catch(() => {});
      }
    }

    await SessionData.create(sdInit);
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/sessions/:sid  — rename session
router.patch('/:sid', auth, async (req, res) => {
  try {
    const { name, year } = req.body;
    const session = await Session.findOneAndUpdate(
      { sid: req.params.sid },
      { name, year },
      { new: true }
    );
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sessions/:sid  — delete session and all its data
router.delete('/:sid', auth, async (req, res) => {
  try {
    const { sid } = req.params;
    await Promise.all([
      Session.deleteOne({ sid }),
      SessionData.deleteOne({ sessionId: sid }),
      Student.deleteMany({ sessionId: sid }),
      Teacher.deleteMany({ sessionId: sid }),
      Payment.deleteMany({ sessionId: sid }),
      Attendance.deleteMany({ sessionId: sid }),
      Exam.deleteMany({ sessionId: sid }),
    ]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
