const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Terima user object (atau id string untuk backward-compat) — encode id + role ke JWT
const generateToken = (user) => {
  const payload =
    typeof user === 'object' && user !== null
      ? { id: user.id, role: user.role }
      : { id: user };
  return jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
    expiresIn: '24h'
  });
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

module.exports = {
  generateToken,
  hashPassword,
  comparePassword
};
