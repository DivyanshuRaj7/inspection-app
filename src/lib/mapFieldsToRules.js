// src/lib/mapFieldsToRules.js — NEW FILE, fills Pipeline Step 6a
// Bridges CV's checkImage() output into RE's checkCompliance() input shape.
// Minimal, R1-scoped version: whole-image confidence stands in for
// per-field confidence (correct under Mini Bible's "single full-image
// OCR pass" scope — true per-field confidence needs bounding boxes,
// which are explicitly [SKIP] for R1/R2).

const FIELD_SYNONYMS = {
  MANUFACTURER_ADDRESS: ['manufactured by', 'marketed by', 'mfd by', 'packed by'],
  COMMODITY_NAME: [], // usually the product's own brand/title text — weakest signal, R1 best-effort only
  NET_QUANTITY: ['net qty', 'net wt', 'net weight', 'net volume', 'net quantity'],
  MANUFACTURE_DATE: ['mfg', 'mfd', 'mig', 'packed on', 'date of manufacture'],
  MRP: ['mrp', 'm.r.p', 'maximum retail price', 'max retail price'],
  CONSUMER_CARE: ['customer care', 'consumer care', 'for complaints', 'helpline'],
  COUNTRY_OF_ORIGIN: ['country of origin', 'made in', 'origin'],
};

/**
 * Classifies one OCR'd region (e.g. a detectTextRegions box) into a rule
 * field, or rejects it. Rejection is explicit and two-tiered: `empty`
 * means Tesseract found no text at all (mascot art, blank backdrop, wood
 * grain), `no-keyword` means text exists but names no regulated field
 * (brand slogans, logos, barcode digits). Both are "not a field" — the
 * distinction tells Phase 2 whether the box was unreadable or readable
 * but irrelevant.
 *
 * @param {string} regionText - Raw OCR text of a single region.
 * @returns {{ fieldGuess: string, text: string } | { fieldGuess: null, reason: 'empty' | 'no-keyword' }}
 */
export function classifyRegionText(regionText) {
  const text = (regionText || '').trim().replace(/\s+/g, ' ');
  if (!text) return { fieldGuess: null, reason: 'empty' };

  const lower = text.toLowerCase();
  for (const [ruleField, synonyms] of Object.entries(FIELD_SYNONYMS)) {
    if (synonyms.length > 0 && synonyms.some((syn) => lower.includes(syn))) {
      return { fieldGuess: ruleField, text };
    }
  }
  return { fieldGuess: null, reason: 'no-keyword' };
}

/**
 * Names the coarse vertical zone a box sits in, from the box center's
 * fractional height: top third 'header' (brand, title), middle 'body'
 * (declarations, nutrition, ingredients), bottom 'footer' (MRP, dates,
 * care contacts). Deliberately coarse — true panel identity (principal
 * display panel vs information panel) cannot be derived from a box's
 * position alone and would need panel segmentation; this answers only
 * "where on the label" for downstream weighting, not "which panel".
 *
 * @param {{ x: number, y: number, w: number, h: number }} box
 * @param {{ width: number, height: number } | null} imageSize
 * @returns {'header' | 'body' | 'footer' | 'unknown'}
 */
export function zoneForBox(box, imageSize) {
  const height = imageSize?.height;
  if (!box || typeof height !== 'number' || height <= 0) return 'unknown';
  const fraction = (box.y + box.h / 2) / height;
  if (fraction < 1 / 3) return 'header';
  if (fraction < 2 / 3) return 'body';
  return 'footer';
}

/**
 * Builds the boxed-fields array from OCR'd regions: each entry carries the
 * resolved field guess, its text, the region's own OCR confidence (0-100,
 * CV-side convention like runOCR — never the whole-image number, never
 * invented: missing input stays null), the precise bounding box, and the
 * coarse named zone. Regions whose text classified to a null fieldGuess
 * (empty or no-keyword junk — mascot art, logos, table grain, barcode
 * digits) are dropped here, so a null-field region can never contribute
 * a boundingBox to the fields[] array. Only regions like region 19 →
 * MANUFACTURER_ADDRESS appear downstream.
 *
 * @param {Array<{ box: { x: number, y: number, w: number, h: number }, text: string, confidence?: number }>} regions
 * @param {{ width: number, height: number } | null} [imageSize] - Needed for zone naming; region is 'unknown' without it.
 * @returns {Array<{ fieldGuess: string, text: string, confidence: number | null, boundingBox: { x: number, y: number, w: number, h: number }, region: string }>}
 */
export function attachRegionBoxes(regions, imageSize = null) {
  const fields = [];
  for (const { box, text, confidence } of regions || []) {
    const verdict = classifyRegionText(text);
    if (verdict.fieldGuess === null) continue;
    fields.push({
      fieldGuess: verdict.fieldGuess,
      text: verdict.text,
      confidence: typeof confidence === 'number' ? confidence : null,
      boundingBox: { ...box },
      region: zoneForBox(box, imageSize),
    });
  }
  return fields;
}

export function mapFieldsToRules(ocrText, wholeImageConfidence, isImported = false) {
  const lines = (ocrText || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const confidence = (wholeImageConfidence || 0) / 100; // RE expects 0-1, CV gives 0-100

  const extracted = {};
  for (const [ruleField, synonyms] of Object.entries(FIELD_SYNONYMS)) {
    const hit = lines.find((line) =>
      synonyms.some((syn) => line.toLowerCase().includes(syn))
    );
    if (hit) {
      extracted[ruleField] = { text: hit, confidence };
    }
    // no match → field simply absent from extracted{}, which presencechecker.js
    // already handles correctly (returns passed:false, "field is missing")
  }

  extracted.isImported = isImported; // R1: no automatic detection: needs an inspector toggle in UI (Phase C)
  return extracted;
}