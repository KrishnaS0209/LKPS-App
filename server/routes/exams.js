const router = require('express').Router({ mergeParams: true });
const Exam = require('../models/Exam');
const { auth } = require('../middleware/auth');

// All routes under /api/sessions/:sessionId/exams

router.get('/', auth, async (req, res) => {
  try {
    const exams = await Exam.find({ sessionId: req.params.sessionId }).lean();
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const data = { ...req.body, sessionId: req.params.sessionId };
    if (!data.eid) return res.status(400).json({ error: 'eid required' });
    const exam = await Exam.create(data);
    res.status(201).json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:eid', auth, async (req, res) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { sessionId: req.params.sessionId, eid: req.params.eid },
      req.body,
      { new: true }
    );
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:eid', auth, async (req, res) => {
  try {
    await Exam.deleteOne({ sessionId: req.params.sessionId, eid: req.params.eid });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
