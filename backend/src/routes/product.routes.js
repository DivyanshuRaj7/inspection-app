const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const authenticate = require('../middleware/authenticate');
const asyncHandler = require('../utils/asyncHandler');

router.use(authenticate);

router.get('/lookup', asyncHandler(productController.lookupProduct));
router.get('/:id/history', asyncHandler(productController.getProductHistory));

module.exports = router;
