import { qualityCheck, DEFAULT_BLUR_THRESHOLD, waitForOpenCV } from './qualityCheck.js';
import { runOCR, recognizeRegions, terminateOCRWorker, OCR_LANGUAGES } from './ocr.js';
import { cleanOcrText } from './cleanOcrText.js';
import { detectTextRegions } from './textRegions.js';
import { attachRegionBoxes } from '../mapFieldsToRules.js';

/**
 * Tamper signal is a hardcoded stub: Phase 4 owns real tamper detection
 * (sticker/price-tamper). The key exists so the Contract A′ shape is
 * stable for downstream consumers from day one.
 */
export const TAMPER_SIGNAL_STUB = { detected: false, confidence: 0, region: null };

/**
 * Assembles the Contract A′ output object from real pipeline stage
 * outputs. Field identity comes from the tested region pipeline
 * (detect → per-region OCR → attachRegionBoxes, which drops null-field
 * junk boxes); confidence stays per-region 0-100, never invented.
 */
export function assembleContractA({
  qualityCheck,
  ocrText,
  ocrRawText = null,
  confidence,
  language,
  regions = [],
  imageSize = null,
}) {
  return {
    qualityCheck,
    ocrText,
    ocrRawText,
    confidence,
    language,
    fields: attachRegionBoxes(regions, imageSize),
    tamperSignal: { ...TAMPER_SIGNAL_STUB },
  };
}

export async function checkImage(photo, options = {}) {
  const qcResult = await qualityCheck(photo, options);

  if (!qcResult.pass) {
    return assembleContractA({
      qualityCheck: qcResult,
      ocrText: null,
      confidence: 0,
      language: OCR_LANGUAGES,
    });
  }

  const ocrResult = await runOCR(photo, options); // v2 behavior: options forwarded through
  const ocrRawText = ocrResult.ocrText;
  // Cleaned text is what the inspector reads and what field mapping runs
  // on; the raw Tesseract output is kept alongside for the details view
  // and Person 3's debugging. (ocrRawText rides along as a superset of
  // the contract — Capture/useSession/ItemResult already depend on it.)
  const { cleanedText } = cleanOcrText(ocrRawText);
  const boxes = await detectTextRegions(photo, options);
  const { regions, imageSize } = await recognizeRegions(photo, boxes, options);
  return assembleContractA({
    qualityCheck: qcResult,
    ocrText: cleanedText,
    ocrRawText,
    confidence: ocrResult.confidence,
    language: ocrResult.language,
    regions,
    imageSize,
  });
}

// Full re-export surface — v1's utility exports restored, v2's addition kept
export { qualityCheck, waitForOpenCV, DEFAULT_BLUR_THRESHOLD } from './qualityCheck.js';
export { runOCR, recognizeRegions, terminateOCRWorker, OCR_LANGUAGES, PSM } from './ocr.js';
export { cleanOcrText } from './cleanOcrText.js';
export { detectTextRegions, mergeOverlappingBoxes } from './textRegions.js';
export default checkImage;