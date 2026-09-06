import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyRegionText } from './mapFieldsToRules.js';

describe('classifyRegionText', () => {
  it('maps an MRP line to the MRP field', () => {
    assert.deepEqual(classifyRegionText('MRP Rs 120 (Incl. of all taxes)'), {
      field: 'MRP',
      text: 'MRP Rs 120 (Incl. of all taxes)',
    });
  });

  it('maps a bilingual manufacture-date line via its English half', () => {
    assert.deepEqual(classifyRegionText('Mfd. Date/ निर्माण तिथि'), {
      field: 'MANUFACTURE_DATE',
      text: 'Mfd. Date/ निर्माण तिथि',
    });
  });

  it('maps a care-contact line to CONSUMER_CARE', () => {
    assert.deepEqual(classifyRegionText('Customer Care: 071-350900'), {
      field: 'CONSUMER_CARE',
      text: 'Customer Care: 071-350900',
    });
  });

  it('rejects brand/graphic text with no field keyword as junk', () => {
    assert.deepEqual(classifyRegionText('SNEHA FARMS'), { field: null, reason: 'no-keyword' });
    assert.deepEqual(classifyRegionText('Tender & Tasty'), { field: null, reason: 'no-keyword' });
  });

  it('rejects barcode digits with no field keyword as junk', () => {
    assert.deepEqual(classifyRegionText('8 906064 511396'), { field: null, reason: 'no-keyword' });
  });

  it('marks empty or whitespace OCR output as empty, not junk', () => {
    assert.deepEqual(classifyRegionText('   '), { field: null, reason: 'empty' });
    assert.deepEqual(classifyRegionText(''), { field: null, reason: 'empty' });
  });
});
