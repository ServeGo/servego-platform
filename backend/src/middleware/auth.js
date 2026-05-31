const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_TOKEN_SECRET);
    req.user = payload; // { sub, email, iat, exp }
    return next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

module.exports = { requireAuth };

