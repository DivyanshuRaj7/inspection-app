import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyRegionText, attachRegionBoxes, zoneForBox } from './mapFieldsToRules.js';

describe('classifyRegionText', () => {
  it('maps an MRP line to the MRP field', () => {
    assert.deepEqual(classifyRegionText('MRP Rs 120 (Incl. of all taxes)'), {
      fieldGuess: 'MRP',
      text: 'MRP Rs 120 (Incl. of all taxes)',
    });
  });

  it('maps a bilingual manufacture-date line via its English half', () => {
    assert.deepEqual(classifyRegionText('Mfd. Date/ निर्माण तिथि'), {
      fieldGuess: 'MANUFACTURE_DATE',
      text: 'Mfd. Date/ निर्माण तिथि',
    });
  });

  it('maps a care-contact line to CONSUMER_CARE', () => {
    assert.deepEqual(classifyRegionText('Customer Care: 071-350900'), {
      fieldGuess: 'CONSUMER_CARE',
      text: 'Customer Care: 071-350900',
    });
  });

  it('rejects brand/graphic text with no field keyword as junk', () => {
    assert.deepEqual(classifyRegionText('SNEHA FARMS'), { fieldGuess: null, reason: 'no-keyword' });
    assert.deepEqual(classifyRegionText('Tender & Tasty'), { fieldGuess: null, reason: 'no-keyword' });
  });

  it('rejects barcode digits with no field keyword as junk', () => {
    assert.deepEqual(classifyRegionText('8 906064 511396'), { fieldGuess: null, reason: 'no-keyword' });
  });

  it('marks empty or whitespace OCR output as empty, not junk', () => {
    assert.deepEqual(classifyRegionText('   '), { fieldGuess: null, reason: 'empty' });
    assert.deepEqual(classifyRegionText(''), { fieldGuess: null, reason: 'empty' });
  });
});

describe('zoneForBox', () => {
  const size = { width: 300, height: 300 };

  it('names the top third header', () => {
    assert.equal(zoneForBox({ x: 10, y: 10, w: 100, h: 20 }, size), 'header');
  });

  it('names the middle third body', () => {
    assert.equal(zoneForBox({ x: 10, y: 140, w: 100, h: 20 }, size), 'body');
  });

  it('names the bottom third footer', () => {
    assert.equal(zoneForBox({ x: 10, y: 250, w: 100, h: 20 }, size), 'footer');
  });

  it('returns unknown when image dimensions are missing', () => {
    assert.equal(zoneForBox({ x: 10, y: 10, w: 100, h: 20 }, null), 'unknown');
    assert.equal(zoneForBox({ x: 10, y: 10, w: 100, h: 20 }, { width: 0, height: 0 }), 'unknown');
  });
});

describe('attachRegionBoxes', () => {
  const box = { x: 666, y: 419, w: 205, h: 74 };
  const size = { width: 1000, height: 666 }; // image1 dimensions

  it('emits the full Contract A′ shape for a resolved region', () => {
    assert.deepEqual(
      attachRegionBoxes(
        [{ box, text: 'MANUFACTURED & MARKETED BY: SNEHA FARMS', confidence: 81 }],
        size
      ),
      [{
        fieldGuess: 'MANUFACTURER_ADDRESS',
        text: 'MANUFACTURED & MARKETED BY: SNEHA FARMS',
        confidence: 81,
        boundingBox: box,
        region: 'footer',
      }]
    );
  });

  it('passes null confidence through instead of inventing zero', () => {
    const [entry] = attachRegionBoxes([{ box, text: 'MRP Rs 120' }], size);
    assert.equal(entry.confidence, null);
    assert.equal(entry.fieldGuess, 'MRP');
  });

  it('drops no-keyword junk regions so their boxes never reach fields[]', () => {
    assert.deepEqual(attachRegionBoxes([{ box, text: 'SUPER COOL FROZEN CHICKEN' }], size), []);
  });

  it('drops empty regions so their boxes never reach fields[]', () => {
    assert.deepEqual(attachRegionBoxes([{ box, text: '   ' }], size), []);
  });

  it('keeps only resolved regions from a mixed batch, boxes intact', () => {
    const brand = { x: 0, y: 0, w: 10, h: 10 };
    const mrpBox = { x: 669, y: 534, w: 275, h: 69 };
    assert.deepEqual(
      attachRegionBoxes(
        [
          { box: brand, text: 'Tender & Tasty' },
          { box: mrpBox, text: 'MRP Rs 120 (Incl. of all taxes)', confidence: 70 },
          { box, text: '' },
        ],
        size
      ),
      [{
        fieldGuess: 'MRP',
        text: 'MRP Rs 120 (Incl. of all taxes)',
        confidence: 70,
        boundingBox: mrpBox,
        region: 'footer',
      }]
    );
  });
});
