const { error } = require('../utils/apiResponse');

const notFound = (req, res, next) => {
  res.status(404).json(error('NOT_FOUND', 'Resource not found', [], req.id));
};

module.exports = notFound;
