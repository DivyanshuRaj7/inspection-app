const { error } = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  console.error(`[${req.id}] Error:`, err);

  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = statusCode === 500 ? 'An unexpected error occurred.' : err.message;
  const details = err.details || [];

  res.status(statusCode).json(error(code, message, details, req.id));
};

module.exports = errorHandler;
