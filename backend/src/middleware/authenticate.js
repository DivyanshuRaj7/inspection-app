const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { error } = require('../utils/apiResponse');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(error('UNAUTHORIZED', 'Missing or invalid authentication token', [], req.id));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.jwt.secret);
    req.user = decoded; // { sub: uuid, role: string, email: string }
    next();
  } catch (err) {
    return res.status(401).json(error('UNAUTHORIZED', 'Token is invalid or expired', [], req.id));
  }
};

module.exports = authenticate;
