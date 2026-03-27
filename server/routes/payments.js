const router = require('express').Router({ mergeParams: true });
const Payment = require('../models/Payment');
const { auth } = require('../middleware/auth');

// All routes under /api/sessions/:sessionId/payments

router.get('/', auth, async (req, res) => {
  try {
    const query = { sessionId: req.params.sessionId };
    if (req.query.sid) query.sid = req.query.sid; // filter by student
    const payments = await Payment.find(query).sort({ createdAt: -1 }).lean();
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const data = { ...req.body, sessionId: req.params.sessionId };
    if (!data.pid || !data.sid || data.amt === undefined) {
      return res.status(400).json({ error: 'pid, sid, amt required' });
    }
    const payment = await Payment.create(data);
    res.status(201).json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:pid', auth, async (req, res) => {
  try {
    await Payment.deleteOne({ sessionId: req.params.sessionId, pid: req.params.pid });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
