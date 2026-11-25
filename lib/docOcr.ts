// OCR pipeline for Document Check: turns a document image (photo, scan or
// rendered PDF page) into text, coping with real-world problems:
//   - sideways / upside-down scans  -> tries 0°, 90°, 270°, 180°
//   - patterned card backgrounds (PAN hologram, shading) -> adaptive threshold
//   - photos, QR codes and Hindi text confusing the layout -> sparse-text mode
// It stops as soon as a reading recognises the document and finds its fields,
// so clean images take a single OCR pass.
//
// Canvas-agnostic: works with browser canvases and @napi-rs/canvas (tests).

import { detectDocType, extractFields, ocrQuality, type DocType } from './docCheck';

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface CanvasLike {
  width: number;
  height: number;
  getContext(id: '2d'): any;
}
export type MakeCanvas = (w: number, h: number) => CanvasLike;
export type Recognize = (canvas: CanvasLike, psm: '3' | '11') => Promise<{ text: string; confidence: number }>;

// Scale so the long side is ~2000px (Tesseract's sweet spot for card text)
// and convert to grayscale with a little extra contrast.
export function normalize(src: CanvasLike | { width: number; height: number }, make: MakeCanvas): CanvasLike {
  const long = Math.max(src.width, src.height);
  const scale = Math.min(3, 2000 / long);
  const w = Math.round(src.width * scale), h = Math.round(src.height * scale);
  // White margin around the image: Tesseract misreads text that touches the
  // edge, which is exactly what tightly cropped card photos do.
  const pad = Math.round(Math.max(w, h) * 0.05);
  const out = make(w + 2 * pad, h + 2 * pad);
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(src, pad, pad, w, h);
  const img = ctx.getImageData(0, 0, out.width, out.height);
  const p = img.data;
  for (let k = 0; k < p.length; k += 4) {
    const g = (0.299 * p[k] + 0.587 * p[k + 1] + 0.114 * p[k + 2] - 128) * 1.25 + 128;
    p[k] = p[k + 1] = p[k + 2] = g < 0 ? 0 : g > 255 ? 255 : g;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

// Black text on white: a pixel is ink when it is clearly darker than its
// neighbourhood. Removes holograms, gradients and uneven lighting that a
// single global threshold cannot.
export function cleanBackground(src: CanvasLike, make: MakeCanvas): CanvasLike {
  const w = src.width, h = src.height;
  const out = make(w, h);
  const ctx = out.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const p = img.data;
  const I = new Float64Array((w + 1) * (h + 1)); // integral image of gray values
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += p[(y * w + x) * 4];
      I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row;
    }
  }
  const r = Math.max(8, Math.round(Math.max(w, h) / 50));
  const C = 25;
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      const mean = (I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0]) / ((x1 - x0) * (y1 - y0));
      const k = (y * w + x) * 4;
      const v = p[k] < mean - C ? 0 : 255;
      p[k] = p[k + 1] = p[k + 2] = v;
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

export function rotate(src: CanvasLike, deg: number, make: MakeCanvas): CanvasLike {
  if (!deg) return src;
  const side = deg % 180 !== 0;
  const out = make(side ? src.height : src.width, side ? src.width : src.height);
  const ctx = out.getContext('2d');
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  return out;
}

// How useful a reading is: real words × confidence, plus a bonus when the
// document type is recognised and its key fields come out.
export function assessReading(text: string, confidence: number, forcedType: DocType | null) {
  const type = forcedType ?? detectDocType(text);
  const f = extractFields(text, type);
  const found = (['name', 'dob', 'idNumber', 'fatherName', 'motherName', 'address'] as const).filter((k) => f[k]).length;
  const recognised = type !== 'other' || !!forcedType;
  return {
    score: ocrQuality(text, confidence) + (recognised ? 15 : 0) + found * 10,
    good: recognised && found >= 2,
  };
}

type Reading = { text: string; score: number; good: boolean };

// Reads the image twice — as-is (normal layout) and background-cleaned
// (sparse text) — because each catches what the other misses. Sideways scans
// are found by trying the cleaned reading at 90°, 270° and 180°; the right
// orientation then gets its second reading too. Returns the readings, best
// first; the caller combines their fields (see extractMerged).
export async function readImage(
  source: CanvasLike | { width: number; height: number },
  opts: { make: MakeCanvas; recognize: Recognize; forcedType?: DocType | null; onStep?: (label: string, step: number, total: number) => void },
): Promise<string[]> {
  const base = normalize(source, opts.make);
  let cleaned: CanvasLike | null = null;
  const forced = opts.forcedType ?? null;
  let step = 0;
  const TOTAL = 6;

  const read = async (deg: number, clean: boolean, label: string): Promise<Reading> => {
    opts.onStep?.(label, ++step, TOTAL);
    if (clean && !cleaned) cleaned = cleanBackground(base, opts.make);
    const img = rotate(clean ? cleaned! : base, deg, opts.make);
    const { text, confidence } = await opts.recognize(img, clean ? '11' : '3');
    return { text, ...assessReading(text, confidence, forced) };
  };
  const ranked = (rs: Reading[]) => [...rs].sort((a, b) => b.score - a.score).map((r) => r.text);

  // Upright: both readings.
  const plain0 = await read(0, false, 'Reading text');
  const clean0 = await read(0, true, 'Second reading (background cleaned)');
  if (plain0.good || clean0.good) return ranked([plain0, clean0]);

  // Sideways or upside down: find the orientation, then read it both ways.
  const all: Reading[] = [plain0, clean0];
  for (const [deg, label] of [[90, 'Trying rotated 90°'], [270, 'Trying rotated 270°'], [180, 'Trying upside down']] as const) {
    const r = await read(deg, true, label);
    all.push(r);
    if (r.good) {
      const plain = await read(deg, false, 'Second reading');
      return ranked([r, plain]);
    }
  }
  return ranked(all).slice(0, 2);
}
