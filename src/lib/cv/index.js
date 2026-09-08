import { qualityCheck, DEFAULT_BLUR_THRESHOLD, waitForOpenCV } from './qualityCheck.js';
import { runOCR, terminateOCRWorker } from './ocr.js';
import { cleanOcrText } from './cleanOcrText.js';
import { attachRegionBoxes } from './textRegions.js';

export async function checkImage(photo, options = {}) {
  const qcResult = await qualityCheck(photo, options);

  if (!qcResult.pass) {
    return { qualityCheck: qcResult, ocrText: null, ocrRawText: null, confidence: 0 };
  }

  const ocrResult = await runOCR(photo, options); // v2 behavior: options forwarded through
  const ocrRawText = ocrResult.ocrText;
  // Cleaned text is what the inspector reads and what field mapping runs
  // on; the raw Tesseract output is kept alongside for the details view
  // and Person 3's debugging.
  const { cleanedText } = cleanOcrText(ocrRawText);
  return {
    qualityCheck: qcResult,
    ocrText: cleanedText,
    ocrRawText,
    confidence: ocrResult.confidence,
  };
}

// Full re-export surface — v1's utility exports restored, v2's addition kept
export { qualityCheck, waitForOpenCV, DEFAULT_BLUR_THRESHOLD } from './qualityCheck.js';
export { runOCR, terminateOCRWorker, PSM } from './ocr.js';
export { cleanOcrText } from './cleanOcrText.js';
export { detectTextRegions, mergeOverlappingBoxes } from './textRegions.js';
export default checkImage;