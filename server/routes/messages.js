const router = require('express').Router({ mergeParams: true });
const Message = require('../models/Message');
const { auth } = require('../middleware/auth');

// GET /api/sessions/:sessionId/messages — admin gets all messages
router.get('/', auth, async (req, res) => {
  try {
    const msgs = await Message.find({ sessionId: req.params.sessionId }).sort({ createdAt: -1 });
    res.json(msgs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/sessions/:sessionId/messages — parent sends a message
router.post('/', auth, async (req, res) => {
  try {
    const { studentSid, studentName, cls, type, subject, body } = req.body;
    const msg = await Message.create({ sessionId: req.params.sessionId, studentSid, studentName, cls, type: type||'message', subject, body: body||'' });
    res.status(201).json(msg);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/sessions/:sessionId/messages/:id — admin marks read/resolved
router.patch('/:id', auth, async (req, res) => {
  try {
    const msg = await Message.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!msg) return res.status(404).json({ error: 'Not found' });
    res.json(msg);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/sessions/:sessionId/messages/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
