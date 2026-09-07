const { error } = require('../utils/apiResponse');

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json(error('UNAUTHORIZED', 'User not authenticated or missing role', [], req.id));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json(error('FORBIDDEN', 'User does not have required permissions', [], req.id));
    }

    next();
  };
};

module.exports = authorize;
