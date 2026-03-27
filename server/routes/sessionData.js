const router = require('express').Router({ mergeParams: true });
const SessionData = require('../models/SessionData');
const { auth } = require('../middleware/auth');

// All routes under /api/sessions/:sessionId/data

// GET — fetch session config (settings, classes, tt, slots, fstr, events)
router.get('/', auth, async (req, res) => {
  try {
    let data = await SessionData.findOne({ sessionId: req.params.sessionId }).lean();
    if (!data) {
      // Auto-create on first access
      data = await SessionData.create({ sessionId: req.params.sessionId });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH — update any fields (settings, classes, tt, slots, fstr, events)
router.patch('/', auth, async (req, res) => {
  try {
    const data = await SessionData.findOneAndUpdate(
      { sessionId: req.params.sessionId },
      { $set: req.body },
      { new: true, upsert: true }
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
