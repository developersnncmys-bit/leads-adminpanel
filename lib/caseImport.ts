// Turn rows of the team's old Google Sheet (one CSV per tab) into cases.
// Columns are matched by their header names when there is a header row, and
// otherwise by what the cells contain (dates, 10-digit mobiles, MR/MS names,
// FRESH / NORMAL / ADULT, UPI …) — so an extra or missing column in the export
// doesn't shift everything.

import type { CaseStatus, OpsCase } from './types';
import { serviceFields } from './opsConfig';

export type ImportField =
  | 'date' | 'source' | 'city' | 'handledBy' | 'appType' | 'scheme' | 'category'
  | 'name' | 'phone' | 'email' | 'status' | 'portalLoginId' | 'portalPassword'
  | 'appointmentDate' | 'applicationNo' | 'amount' | 'paymentMode' | 'remarks';

export const IMPORT_FIELDS: { key: ImportField; label: string; header: RegExp }[] = [
  { key: 'date',            label: 'Date',              header: /^(s\.?\s*no\.?\s*)?date$|^date\b|booking date|entry date/i },
  { key: 'source',          label: 'Source',            header: /source|lead from|\bvia\b|reference type/i },
  { key: 'city',            label: 'City',              header: /city|place|location|district|branch/i },
  { key: 'handledBy',       label: 'Handled by',        header: /handled|staff|executive|employee|agent|assigned|done by/i },
  { key: 'appType',         label: 'Type',              header: /^type$|application type|app\.? type|fresh|request type|service type/i },
  { key: 'scheme',          label: 'Scheme',            header: /scheme|normal|tatkal/i },
  { key: 'category',        label: 'Category',          header: /category|adult|minor/i },
  { key: 'name',            label: 'Customer name *',   header: /name|customer|applicant|client/i },
  { key: 'phone',           label: 'Mobile',            header: /phone|mobile|contact|cell|whats/i },
  { key: 'email',           label: 'Email',             header: /mail/i },
  { key: 'status',          label: 'Status',            header: /status|stage/i },
  { key: 'portalLoginId',   label: 'Portal login ID',   header: /login|user\s*id|username|user name/i },
  { key: 'portalPassword',  label: 'Portal password',   header: /pass(word)?|pwd/i },
  { key: 'appointmentDate', label: 'Appointment date',  header: /appointment|appt|slot/i },
  { key: 'applicationNo',   label: 'Application / ARN', header: /arn|file\s*no|application\s*no|ack/i },
  { key: 'amount',          label: 'Amount (MMD fee + govt fee, e.g. 3500+2000)', header: /amount|fee|charge|price|paid|total/i },
  { key: 'paymentMode',     label: 'Payment mode',      header: /mode|payment|upi|cash/i },
  { key: 'remarks',         label: 'Remarks',           header: /remark|note|comment/i },
];

export type Mapping = Partial<Record<ImportField, number>>; // field -> column index (-1 = none)

// Sample file for the "Download sample CSV" button — only the columns that
// service uses (PAN Card: no portal login / password; no appointment, etc.).
export function sampleCsv(service: string): string {
  const f = serviceFields(service);
  const t = (i: number) => f.types[i % f.types.length] ?? '';
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const toCsv = (cols: [string, string, string][]) =>
    [0, 1, 2].map((i) => cols.map((c) => esc(c[i])).join(',')).join('\r\n');

  // PAN Card: exactly the team's PAN sheet columns, in their order.
  if (service === 'PAN Card') {
    return toCsv([
      ['Date', '21/11/2026', '22/11/2026'],
      ['Source', 'WEBSITE', 'REF'],
      ['City', 'BENGALURU', 'MYSURU'],
      ['Type', 'NEW', 'CORRECTION'],
      ['Handled By', 'GANESH', 'SUNEETHA'],
      ['Name', 'MR RAVI KUMAR', 'MS PRIYA S'],
      ['Mobile', '9876543210', '9123456780'],
      ['Email', 'ravi@example.com', 'priya@example.com'],
      ['Acknowledgement No', '881154233432351', '881154235535092'],
      ['Status', 'COMPLETED', 'COMPLETED'],
      ['Amount', '350', '350'],
      ['Mode', 'UPI', 'Online (Paytm)'],
    ]);
  }

  const cols: [string, string, string][] = [
    ['Date', '21/11/2026', '22/11/2026'],
    ['Source', 'REF', 'WEBSITE'],
    ['City', 'BENGALURU', 'MYSURU'],
    ['Handled By', 'SUNEETHA', 'MURTHY'],
    ['Type', t(0), t(1)],
    ...(f.scheme ? [['Scheme', f.scheme[0], f.scheme[1] ?? f.scheme[0]] as [string, string, string]] : []),
    ...(f.category ? [['Category', 'ADULT', 'ADULT'] as [string, string, string]] : []),
    ['Name', 'MR RAVI KUMAR', 'MS PRIYA S'],
    ['Mobile', '9876543210', '9123456780'],
    ['Email', 'ravi@example.com', 'priya@example.com'],
    ['Status', 'IN DOC VEF', 'COMPLETED'],
    ...(f.portal ? [['Login ID', '', 'PRIY01011995'], ['Password', '', 'Priya@123']] as [string, string, string][] : []),
    ...(f.appointment ? [['Appointment Date', '', '28/11/2026']] as [string, string, string][] : []),
    [f.applicationNoLabel.replace(/,/g, ' '), '', service === 'PAN Card' ? '881154233432351' : 'ABC123456'],
    ['Amount', '3500', f.scheme ? '3500+2000' : '3500'],
    ['Payment Mode', 'UPI', 'CASH'],
    ['Remarks', '', ''],
  ];
  return toCsv(cols);
}

// Does the first row look like column names rather than a customer?
export function looksLikeHeader(row: string[]): boolean {
  const hits = row.filter((c) => IMPORT_FIELDS.some((f) => f.header.test(c.trim()))).length;
  const digits = row.filter((c) => /\d{4,}/.test(c)).length; // phone numbers, dates…
  return hits >= 2 && digits <= 1;
}

// What a cell looks like, for matching columns without a header row.
const DATE_RE = /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$|^\d{4}-\d{1,2}-\d{1,2}/;
const CONTENT: { key: ImportField; test: (v: string) => boolean }[] = [
  { key: 'phone',          test: (v) => /^(\+?91[\s-]?)?[6-9]\d{9}$/.test(v.replace(/[\s-]/g, '')) },
  { key: 'email',          test: (v) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v) },
  { key: 'date',           test: (v) => DATE_RE.test(v) },
  { key: 'scheme',         test: (v) => /^(NORMAL|TATKAL|SPECIAL|TATKAAL)$/i.test(v) },
  { key: 'category',       test: (v) => /^(ADULT|MINOR|SENIOR)$/i.test(v) },
  { key: 'appType',        test: (v) => /^(FRESH|RE-?ISSUE|RENEWAL|LOP|LOST|DAMAGED|NEW|CORRECTION|REPRINT|DUPLICATE)\b/i.test(v) },
  { key: 'source',         test: (v) => /^(CALL|REF|REFERENCE|WEBSITE|WALK-?IN|WHATSAPP|GOOGLE|INSTAGRAM|FACEBOOK|ONLINE)$/i.test(v) },
  { key: 'paymentMode',    test: (v) => /^(UPI|CASH|CARD|NEFT|IMPS|BANK|GPAY|PHONEPE|PAYTM|ONLINE|PAID)\b/i.test(v) },
  { key: 'status',         test: (v) => /^(IN\s|COMPLET|DONE|DELIVER|CANCEL|PENDING|APPLIED|PROCESS|APPT)/i.test(v) },
  { key: 'amount',         test: (v) => /^₹?\s?\d{2,6}(\s?\+\s?\d{2,6})*$/.test(v.replace(/,/g, '')) },
  { key: 'name',           test: (v) => /^(MR|MRS|MS|MISS|MASTER|DR|SMT|SRI|SHRI|KUM)\.?\s+[A-Z]/i.test(v) },
  { key: 'portalLoginId',  test: (v) => /^[A-Z]{3,6}\d{6,8}$/i.test(v) },
  { key: 'portalPassword', test: (v) => /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@#$!%&*]).{6,20}$/.test(v) && !v.includes(' ') && !v.includes('.') },
];

function guessByContent(rows: string[][]): Mapping {
  const sample = rows.slice(0, 60);
  const width = Math.max(...sample.map((r) => r.length), 0);
  // Share of non-empty cells in each column that look like each field.
  const score = (col: number, test: (v: string) => boolean) => {
    const vals = sample.map((r) => String(r[col] ?? '').trim()).filter(Boolean);
    return vals.length ? vals.filter(test).length / vals.length : 0;
  };
  const map: Mapping = {};
  const used = new Set<number>();
  // Serial-number columns (21, 22, 23 …) are not data — skip them so they
  // aren't mistaken for the amount.
  for (let c = 0; c < width; c++) {
    const nums = sample.map((r) => String(r[c] ?? '').trim()).filter(Boolean).map(Number);
    if (nums.length >= 2 && nums.every((n, i) => Number.isInteger(n) && (i === 0 || n === nums[i - 1] + 1))) used.add(c);
  }
  const pairs: { key: ImportField; col: number; s: number }[] = [];
  for (const f of CONTENT) for (let c = 0; c < width; c++) pairs.push({ key: f.key, col: c, s: score(c, f.test) });
  // Best matches first; each field and column used once.
  for (const p of pairs.sort((a, b) => b.s - a.s)) {
    if (p.s < 0.5 || map[p.key] !== undefined || used.has(p.col)) continue;
    map[p.key] = p.col; used.add(p.col);
  }
  // Two date columns: the earlier one is the case date, the later the appointment.
  const dateCols = Array.from({ length: width }, (_, c) => c).filter((c) => !used.has(c) || map.date === c)
    .filter((c) => score(c, (v) => DATE_RE.test(v)) >= 0.3);
  if (dateCols.length >= 2) { map.date = dateCols[0]; map.appointmentDate = dateCols[1]; used.add(dateCols[1]); }

  // Names without MR/MS: the most "wordy" remaining column.
  if (map.name === undefined) {
    let best = -1, bestS = 0;
    for (let c = 0; c < width; c++) {
      if (used.has(c)) continue;
      const s = score(c, (v) => /^[A-Za-z][A-Za-z .']{4,}$/.test(v) && v.trim().split(/\s+/).length >= 2);
      if (s > bestS) { best = c; bestS = s; }
    }
    if (best >= 0 && bestS >= 0.5) { map.name = best; used.add(best); }
  }
  // The sheet's order around the name: … City, Handled by, Type … Name …
  // Left of Type are Handled by, then City; left of the date is the serial no.
  if (map.appType !== undefined) {
    const t = map.appType;
    const free = (c: number) => c >= 0 && c < width && !used.has(c);
    if (map.handledBy === undefined && free(t - 1)) { map.handledBy = t - 1; used.add(t - 1); }
    if (map.city === undefined && free(t - 2)) { map.city = t - 2; used.add(t - 2); }
  }
  return map;
}

export function guessMapping(rows: string[][], hasHeader: boolean): Mapping {
  const map: Mapping = {};
  if (hasHeader) {
    const used = new Set<number>();
    // Specific fields first so e.g. "Father's name" doesn't steal "name".
    const order: ImportField[] = ['email', 'phone', 'portalPassword', 'portalLoginId', 'appointmentDate', 'applicationNo',
      'paymentMode', 'amount', 'status', 'scheme', 'category', 'appType', 'handledBy', 'source', 'city', 'date', 'remarks', 'name'];
    for (const key of order) {
      const f = IMPORT_FIELDS.find((x) => x.key === key)!;
      const i = rows[0].findIndex((c, idx) => !used.has(idx) && f.header.test(c.trim()) && !(key === 'name' && /father|mother|spouse/i.test(c)));
      if (i >= 0) { map[key] = i; used.add(i); }
    }
    return map;
  }
  return guessByContent(rows);
}

// dd/mm/yyyy, dd-mm-yyyy, dd.mm.yy, yyyy-mm-dd -> YYYY-MM-DD ('' if not a date)
export function toYmd(v: string): string {
  const s = v.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    if (+m[1] <= 31 && +m[2] <= 12) return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return '';
}

// "3500+2000" -> amount 3500, extra 2000;  "₹3,300" -> 3300
export function splitAmount(v: string): { amount: number; extraAmount: number } {
  const parts = v.replace(/[₹,\s]|rs\.?/gi, '').split('+').map((p) => parseFloat(p)).filter((n) => !isNaN(n));
  return { amount: parts[0] ?? 0, extraAmount: parts.slice(1).reduce((a, b) => a + b, 0) };
}

// The sheet's free-text statuses -> case statuses
// (New, Doc verification, In process, Completed, Cancelled).
export function toStatus(v: string): CaseStatus {
  const s = v.trim().toUpperCase();
  if (!s) return 'new';
  if (/CANCEL|REFUND|DROP|REJECT/.test(s)) return 'cancelled';
  if (/COMPLET|DONE|DELIVER|RECEIV|CLOSED|ISSUED/.test(s)) return 'completed';
  if (/DOC|VERIF|VEF/.test(s)) return 'documents';
  if (/APPT|APPOINT|SLOT|APPLIED|SUBMIT|FILED|UPLOAD|PROCESS|POLICE|PV\b|PRINT|DISPATCH|TRANSIT/.test(s)) return 'processing';
  return 'new';
}

export function rowToCase(row: string[], map: Mapping, service: string): Partial<OpsCase> {
  const get = (k: ImportField) => {
    const i = map[k];
    return i !== undefined && i >= 0 ? String(row[i] ?? '').trim() : '';
  };
  const up = (k: ImportField) => get(k).toUpperCase();
  const phone = get('phone').replace(/\D/g, '');
  const { amount, extraAmount } = splitAmount(get('amount'));
  return {
    service,
    date: toYmd(get('date')),
    source: up('source'),
    city: up('city'),
    handledBy: up('handledBy'),
    appType: up('appType'),
    scheme: up('scheme'),
    category: up('category'),
    name: up('name'),
    phone: phone.length > 10 ? phone.slice(-10) : phone,
    email: get('email').toLowerCase(),
    status: toStatus(get('status')),
    portalLoginId: get('portalLoginId'),
    portalPassword: get('portalPassword'),
    appointmentDate: toYmd(get('appointmentDate')),
    applicationNo: up('applicationNo'),
    amount,
    extraAmount,
    paymentMode: up('paymentMode'),
    remarks: get('remarks') || (get('status') && toStatus(get('status')) === 'new' ? `Sheet status: ${get('status')}` : ''),
  };
}
