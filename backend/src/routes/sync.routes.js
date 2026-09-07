const express = require('express');
const router = express.Router();
const syncController = require('../controllers/sync.controller');
const validate = require('../middleware/validate');
const { syncSchema } = require('../validators/sync.validator');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const asyncHandler = require('../utils/asyncHandler');

router.post('/inspections', authenticate, authorize('INSPECTOR', 'ADMIN'), validate(syncSchema), asyncHandler(syncController.syncInspections));

module.exports = router;
