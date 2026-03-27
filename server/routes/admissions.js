const router = require('express').Router();
const Admission = require('../models/Admission');
const { auth } = require('../middleware/auth');

// POST /api/admissions — public, from landing page registration form
router.post('/', async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });
    const admission = await Admission.create({ name, phone, email: email || '' });
    res.status(201).json(admission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admissions — admin only
router.get('/', auth, async (req, res) => {
  try {
    const admissions = await Admission.find().sort({ createdAt: -1 }).lean();
    res.json(admissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admissions/:id — update status/note
router.patch('/:id', auth, async (req, res) => {
  try {
    const updated = await Admission.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admissions/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await Admission.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
