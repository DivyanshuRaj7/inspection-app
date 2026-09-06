const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { pool } = require('../config/db');
const { success, error } = require('../utils/apiResponse');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  if (!user || !user.is_active) {
    return res.status(401).json(error('UNAUTHORIZED', 'Invalid email or password', [], req.id));
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json(error('UNAUTHORIZED', 'Invalid email or password', [], req.id));
  }

  const payload = {
    sub: user.id,
    role: user.role,
    email: user.email,
  };

  const token = jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });

  // Update last_login_at
  await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

  const sanitizedUser = {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
  };

  res.json(success({ token, user: sanitizedUser }));
};

exports.me = async (req, res) => {
  const result = await pool.query('SELECT id, full_name, email, role FROM users WHERE id = $1', [req.user.sub]);
  const user = result.rows[0];
  
  if (!user) {
    return res.status(404).json(error('NOT_FOUND', 'User not found', [], req.id));
  }

  res.json(success({
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role
  }));
};

exports.logout = (req, res) => {
  res.json(success({ message: 'Logged out successfully' }));
};
