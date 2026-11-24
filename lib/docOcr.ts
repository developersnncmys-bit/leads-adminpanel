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
  const out = make(Math.round(src.width * scale), Math.round(src.height * scale));
  const ctx = out.getContext('2d');
  ctx.drawImage(src, 0, 0, out.width, out.height);
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

const ATTEMPTS: { deg: number; clean: boolean; psm: '3' | '11'; label: string }[] = [
  { deg: 0,   clean: false, psm: '3',  label: 'Reading text' },
  { deg: 0,   clean: true,  psm: '11', label: 'Cleaning background' },
  { deg: 90,  clean: true,  psm: '11', label: 'Trying rotated 90°' },
  { deg: 270, clean: true,  psm: '11', label: 'Trying rotated 270°' },
  { deg: 180, clean: true,  psm: '11', label: 'Trying upside down' },
];

export async function readImage(
  source: CanvasLike | { width: number; height: number },
  opts: { make: MakeCanvas; recognize: Recognize; forcedType?: DocType | null; onStep?: (label: string, step: number, total: number) => void },
): Promise<string> {
  const base = normalize(source, opts.make);
  let cleaned: CanvasLike | null = null;
  let best = { score: -1, text: '' };

  for (let i = 0; i < ATTEMPTS.length; i++) {
    const a = ATTEMPTS[i];
    opts.onStep?.(a.label, i + 1, ATTEMPTS.length);
    if (a.clean && !cleaned) cleaned = cleanBackground(base, opts.make);
    const img = rotate(a.clean ? cleaned! : base, a.deg, opts.make);
    const { text, confidence } = await opts.recognize(img, a.psm);
    const r = assessReading(text, confidence, opts.forcedType ?? null);
    if (r.score > best.score) best = { score: r.score, text };
    if (r.good) return text;
  }
  return best.text;
}
