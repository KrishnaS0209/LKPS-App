const router = require('express').Router({ mergeParams: true });
const Student = require('../models/Student');
const { auth } = require('../middleware/auth');

// All routes are under /api/sessions/:sessionId/students

// GET  — list all students in session
router.get('/', auth, async (req, res) => {
  try {
    const students = await Student.find({ sessionId: req.params.sessionId }).lean();
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST  — add student
router.post('/', auth, async (req, res) => {
  try {
    const data = { ...req.body, sessionId: req.params.sessionId };
    if (!data.sid) return res.status(400).json({ error: 'sid required' });
    const student = await Student.create(data);
    res.status(201).json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /:sid  — update student
router.patch('/:sid', auth, async (req, res) => {
  try {
    const student = await Student.findOneAndUpdate(
      { sessionId: req.params.sessionId, sid: req.params.sid },
      { $set: req.body },
      { new: true }
    );
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /:sid  — remove student
router.delete('/:sid', auth, async (req, res) => {
  try {
    await Student.deleteOne({ sessionId: req.params.sessionId, sid: req.params.sid });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
