const router = require('express').Router({ mergeParams: true });
const Teacher = require('../models/Teacher');
const { auth } = require('../middleware/auth');

// All routes under /api/sessions/:sessionId/teachers

router.get('/', auth, async (req, res) => {
  try {
    const teachers = await Teacher.find({ sessionId: req.params.sessionId }).lean();
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const data = { ...req.body, sessionId: req.params.sessionId };
    if (!data.tid) return res.status(400).json({ error: 'tid required' });
    const teacher = await Teacher.create(data);
    res.status(201).json(teacher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:tid', auth, async (req, res) => {
  try {
    const teacher = await Teacher.findOneAndUpdate(
      { sessionId: req.params.sessionId, tid: req.params.tid },
      { $set: req.body },
      { new: true }
    );
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:tid', auth, async (req, res) => {
  try {
    await Teacher.deleteOne({ sessionId: req.params.sessionId, tid: req.params.tid });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
