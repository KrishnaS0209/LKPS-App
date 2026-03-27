const jwt = require('jsonwebtoken');

// Verify JWT — attaches { adminId, sessionId, role } to req.user
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Only allow main admin (username === 'admin')
function mainAdminOnly(req, res, next) {
  if (req.user?.role !== 'Admin' && req.user?.username !== 'admin') {
    return res.status(403).json({ error: 'Main admin only' });
  }
  next();
}

module.exports = { auth, mainAdminOnly };
