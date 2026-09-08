const express = require('express');
const router = express.Router();
const inspectionController = require('../controllers/inspection.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { updateInspectionSchema, attachComplianceResultSchema, submitInspectionSchema } = require('../validators/inspection.validator');

router.use(authenticate);

router.get('/', authorize('INSPECTOR', 'OFFICIAL', 'ADMIN'), asyncHandler(inspectionController.getInspections));
router.get('/:id', authorize('INSPECTOR', 'OFFICIAL', 'ADMIN'), asyncHandler(inspectionController.getInspectionById));
router.patch('/:id', authorize('INSPECTOR', 'ADMIN'), validate(updateInspectionSchema), asyncHandler(inspectionController.updateInspection));
router.post('/:id/submit', authorize('INSPECTOR', 'ADMIN'), validate(submitInspectionSchema), asyncHandler(inspectionController.submitInspection));
router.get('/:id/events', authorize('INSPECTOR', 'OFFICIAL', 'ADMIN'), asyncHandler(inspectionController.getInspectionEvents));

// Internal service endpoint (for hackathon, ADMIN can call this)
router.post('/:id/compliance-result', authorize('ADMIN'), validate(attachComplianceResultSchema), asyncHandler(inspectionController.attachComplianceResult));

// Doc Gen endpoint
router.get('/:id/report-data', authorize('INSPECTOR', 'OFFICIAL', 'ADMIN'), asyncHandler(inspectionController.getReportData));

module.exports = router;
