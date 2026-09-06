import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode } from 'fast-png';
import { detectTextRegions } from './textRegions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** White RGBA image with solid black bars standing in for text lines. */
function makeBarImage() {
  const width = 400;
  const height = 200;
  const data = new Uint8Array(width * height * 4).fill(255);
  const bars = [
    { x: 20, y: 20, w: 200, h: 18 },
    { x: 20, y: 60, w: 160, h: 18 },
    { x: 20, y: 100, w: 220, h: 18 },
  ];
  for (const bar of bars) {
    for (let y = bar.y; y < bar.y + bar.h; y++) {
      for (let x = bar.x; x < bar.x + bar.w; x++) {
        const i = (y * width + x) * 4;
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 255;
      }
    }
  }
  return { data, width, height, bars };
}

async function loadPhoto(name) {
  const buf = await readFile(path.join(__dirname, 'test-photos', name));
  const png = decode(buf);
  return { data: png.data, width: png.width, height: png.height };
}

describe('detectTextRegions', () => {
  it('covers every text-like bar with a bounding box', async () => {
    const { data, width, height, bars } = makeBarImage();
    const boxes = await detectTextRegions({ data, width, height });

    assert.ok(boxes.length >= 1, `expected boxes, got ${boxes.length}`);
    assert.ok(boxes.length <= 6, `expected no noise explosion, got ${boxes.length}`);
    for (const bar of bars) {
      const covering = boxes.find(
        (b) =>
          b.x <= bar.x + 4 &&
          b.y <= bar.y + 4 &&
          b.x + b.w >= bar.x + bar.w - 4 &&
          b.y + b.h >= bar.y + bar.h - 4
      );
      assert.ok(covering, `no box covers bar at (${bar.x},${bar.y} ${bar.w}x${bar.h}): ${JSON.stringify(boxes)}`);
    }
  });

  it('returns no boxes for a blank image', async () => {
    const width = 300;
    const height = 150;
    const boxes = await detectTextRegions({
      data: new Uint8Array(width * height * 4).fill(255),
      width,
      height,
    });
    assert.deepEqual(boxes, []);
  });

  it('finds multiple in-bounds regions on a real label photo', async () => {
    const { data, width, height } = await loadPhoto('image3.png');
    const boxes = await detectTextRegions({ data, width, height });

    assert.ok(boxes.length >= 5, `expected >= 5 regions on image3, got ${boxes.length}`);
    for (const b of boxes) {
      assert.ok(b.x >= 0 && b.y >= 0 && b.w > 0 && b.h > 0, `degenerate box: ${JSON.stringify(b)}`);
      assert.ok(b.x + b.w <= width && b.y + b.h <= height, `out-of-bounds box: ${JSON.stringify(b)}`);
    }
  });

  it('never merges a cluttered label into one giant box', async () => {
    const { data, width, height } = await loadPhoto('image1.png');
    const boxes = await detectTextRegions({ data, width, height });
    const imageArea = width * height;
    for (const b of boxes) {
      assert.ok(
        b.w * b.h <= imageArea * 0.5,
        `giant box covers >50% of image: ${JSON.stringify(b)}`
      );
    }
  });
});
