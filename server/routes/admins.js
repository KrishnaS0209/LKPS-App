const router = require('express').Router();
const Admin = require('../models/Admin');
const { auth, mainAdminOnly } = require('../middleware/auth');

// GET /api/admins  — list all admins (no passwords)
router.get('/', auth, async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admins  — add admin (main admin only)
router.post('/', auth, mainAdminOnly, async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    if (!username || !password || !name) return res.status(400).json({ error: 'username, password, name required' });
    const exists = await Admin.findOne({ username });
    if (exists) return res.status(409).json({ error: 'Username already taken' });
    const admin = await Admin.create({ username, password, name, role: role || 'Admin' });
    res.status(201).json({ id: admin._id, username: admin.username, name: admin.name, role: admin.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admins/:id  — edit admin (any admin can edit self; main admin can edit all)
router.patch('/:id', auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    // Only main admin can edit others
    if (String(admin._id) !== String(req.user.adminId) && req.user.username !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { name, role, photo, password } = req.body;
    if (name)  admin.name  = name;
    if (role)  admin.role  = role;
    if (photo !== undefined) admin.photo = photo;
    if (password) admin.password = password; // will be hashed by pre-save hook

    await admin.save();
    res.json({ id: admin._id, username: admin.username, name: admin.name, role: admin.role, photo: admin.photo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admins/:id  — remove admin (main admin only, can't remove self)
router.delete('/:id', auth, mainAdminOnly, async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    if (admin.username === 'admin') return res.status(400).json({ error: 'Cannot remove main admin' });
    await admin.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
