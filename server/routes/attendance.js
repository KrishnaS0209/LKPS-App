const router = require('express').Router({ mergeParams: true });
const Attendance = require('../models/Attendance');
const { auth } = require('../middleware/auth');

// All routes under /api/sessions/:sessionId/attendance

// GET ?date=YYYY-MM-DD&cls=ClassName
router.get('/', auth, async (req, res) => {
  try {
    const query = { sessionId: req.params.sessionId };
    if (req.query.date) query.date = req.query.date;
    if (req.query.cls)  query.cls  = req.query.cls;
    const records = await Attendance.find(query).lean();
    // Return as flat map: { "YYYY-MM-DD": { studentSid: 'P'|'A'|'L' } }
    const flat = {};
    records.forEach(r => {
      const rec = r.records;
      // After .lean(), a Map field becomes a plain object — handle both cases
      if (rec instanceof Map) {
        flat[r.date] = Object.fromEntries(rec);
      } else if (rec && typeof rec === 'object') {
        flat[r.date] = { ...(flat[r.date] || {}), ...rec };
      }
    });
    res.json(flat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST — save/update attendance for a date+class
router.post('/', auth, async (req, res) => {
  try {
    const { date, cls, records } = req.body;
    if (!date || !cls || !records) return res.status(400).json({ error: 'date, cls, records required' });
    const doc = await Attendance.findOneAndUpdate(
      { sessionId: req.params.sessionId, date, cls },
      { records },
      { upsert: true, new: true }
    );
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
