const { pool } = require('../config/db');
const { success, error } = require('../utils/apiResponse');

exports.lookupProduct = async (req, res) => {
  const { barcode } = req.query;
  
  if (!barcode) {
    return res.status(400).json(error('VALIDATION_ERROR', 'Barcode is required', [], req.id));
  }

  const result = await pool.query('SELECT * FROM products WHERE barcode_value = $1', [barcode]);
  
  if (result.rows.length === 0) {
    return res.status(404).json(error('NOT_FOUND', 'Product not found', [], req.id));
  }

  res.json(success(result.rows[0]));
};

exports.getProductHistory = async (req, res) => {
  const { id } = req.params;

  // Verify product exists
  const check = await pool.query('SELECT id FROM products WHERE id = $1', [id]);
  if (check.rows.length === 0) {
    return res.status(404).json(error('NOT_FOUND', 'Product not found', [], req.id));
  }

  // Get historical inspections for this product
  // For Inspector role, they might only be able to see history of things they inspected,
  // or it might be globally visible depending on business rules. We'll allow all authenticated users to see history.
  
  const result = await pool.query(`
    SELECT id, status, mrp, packed_date, rule_engine_status, compliance_result, updated_at
    FROM inspections 
    WHERE product_id = $1
    ORDER BY updated_at DESC
    LIMIT 50
  `, [id]);

  res.json(success(result.rows));
};
