import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyRegionText, attachRegionBoxes } from './mapFieldsToRules.js';

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

describe('attachRegionBoxes', () => {
  const box = { x: 666, y: 419, w: 205, h: 74 };

  it('attaches the box to a region that resolved to a real field', () => {
    assert.deepEqual(
      attachRegionBoxes([{ box, text: 'MANUFACTURED & MARKETED BY: SNEHA FARMS' }]),
      [{ field: 'MANUFACTURER_ADDRESS', text: 'MANUFACTURED & MARKETED BY: SNEHA FARMS', boundingBox: box }]
    );
  });

  it('drops no-keyword junk regions so their boxes never reach fields[]', () => {
    assert.deepEqual(attachRegionBoxes([{ box, text: 'SUPER COOL FROZEN CHICKEN' }]), []);
  });

  it('drops empty regions so their boxes never reach fields[]', () => {
    assert.deepEqual(attachRegionBoxes([{ box, text: '   ' }]), []);
  });

  it('keeps only resolved regions from a mixed batch, boxes intact', () => {
    const brand = { x: 0, y: 0, w: 10, h: 10 };
    const mrpBox = { x: 669, y: 534, w: 275, h: 69 };
    assert.deepEqual(
      attachRegionBoxes([
        { box: brand, text: 'Tender & Tasty' },
        { box: mrpBox, text: 'MRP Rs 120 (Incl. of all taxes)' },
        { box, text: '' },
      ]),
      [{ field: 'MRP', text: 'MRP Rs 120 (Incl. of all taxes)', boundingBox: mrpBox }]
    );
  });
});
