const router = require('express').Router();
const Notice = require('../models/Notice');
const { auth } = require('../middleware/auth');

// Public — landing page fetches active notices
router.get('/public', async (req, res) => {
  try {
    const notices = await Notice.find({ active: true }).sort({ pinned: -1, createdAt: -1 }).limit(10);
    res.json(notices);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin — get all
router.get('/', auth, async (req, res) => {
  try {
    const notices = await Notice.find().sort({ pinned: -1, createdAt: -1 });
    res.json(notices);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin — create
router.post('/', auth, async (req, res) => {
  try {
    const n = await Notice.create(req.body);
    res.status(201).json(n);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Admin — update
router.patch('/:id', auth, async (req, res) => {
  try {
    const n = await Notice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!n) return res.status(404).json({ error: 'Not found' });
    res.json(n);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Admin — delete
router.delete('/:id', auth, async (req, res) => {
  try {
    await Notice.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
