const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/session.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { createSessionSchema } = require('../validators/session.validator');

router.use(authenticate, authorize('INSPECTOR'));

router.post('/', validate(createSessionSchema), asyncHandler(sessionController.createSession));
router.get('/:id', asyncHandler(sessionController.getSession));
router.patch('/:id/close', asyncHandler(sessionController.closeSession));

module.exports = router;
