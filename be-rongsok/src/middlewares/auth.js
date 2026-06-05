const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized, no token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized, invalid token' });
  }
};

// Role guard — JWT sekarang sudah include role (lihat utils/auth.generateToken)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Forbidden — butuh role: ${roles.join(', ')}`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
