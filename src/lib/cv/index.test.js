import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import checkImage, {
  qualityCheck,
  runOCR,
  cleanOcrText,
  detectTextRegions,
  mergeOverlappingBoxes,
} from './index.js';

describe('cv/index module surface', () => {
  it('loads without import errors and exposes the CV pipeline', () => {
    assert.equal(typeof checkImage, 'function');
    assert.equal(typeof qualityCheck, 'function');
    assert.equal(typeof runOCR, 'function');
    assert.equal(typeof cleanOcrText, 'function');
    assert.equal(typeof detectTextRegions, 'function');
    assert.equal(typeof mergeOverlappingBoxes, 'function');
  });
});
