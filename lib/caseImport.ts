// Turn rows of the team's old Google Sheet (one CSV per tab) into cases.
// Columns are matched by their header names; a sheet without a header row is
// read in the PASSPORT tab's column order.

import type { CaseStatus, OpsCase } from './types';

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
  { key: 'phone',           label: 'Phone',             header: /phone|mobile|contact|cell|whats/i },
  { key: 'email',           label: 'Email',             header: /mail/i },
  { key: 'status',          label: 'Status',            header: /status|stage/i },
  { key: 'portalLoginId',   label: 'Portal login ID',   header: /login|user\s*id|username|user name/i },
  { key: 'portalPassword',  label: 'Portal password',   header: /pass(word)?|pwd/i },
  { key: 'appointmentDate', label: 'Appointment date',  header: /appointment|appt|slot/i },
  { key: 'applicationNo',   label: 'Application / ARN', header: /arn|file\s*no|application\s*no|ack/i },
  { key: 'amount',          label: 'Amount (e.g. 3500+2000)', header: /amount|fee|charge|price|paid|total/i },
  { key: 'paymentMode',     label: 'Payment mode',      header: /mode|payment|upi|cash/i },
  { key: 'remarks',         label: 'Remarks',           header: /remark|note|comment/i },
];

// Column order of the team's PASSPORT tab (no header row in the export).
const SHEET_ORDER: (ImportField | null)[] = [
  null, 'date', 'source', 'city', 'handledBy', 'appType', 'scheme', 'category',
  'name', 'phone', 'email', 'status', 'portalLoginId', 'portalPassword',
  'appointmentDate', 'amount', 'paymentMode',
];

export type Mapping = Partial<Record<ImportField, number>>; // field -> column index (-1 = none)

// Does the first row look like column names rather than a customer?
export function looksLikeHeader(row: string[]): boolean {
  const hits = row.filter((c) => IMPORT_FIELDS.some((f) => f.header.test(c.trim()))).length;
  const digits = row.filter((c) => /\d{4,}/.test(c)).length; // phone numbers, dates…
  return hits >= 2 && digits <= 1;
}

export function guessMapping(rows: string[][], hasHeader: boolean): Mapping {
  const width = Math.max(...rows.slice(0, 20).map((r) => r.length), 0);
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
  } else if (width >= 12) {
    SHEET_ORDER.forEach((k, i) => { if (k && i < width) map[k] = i; });
  }
  return map;
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

// The sheet's free-text statuses -> case statuses.
export function toStatus(v: string): CaseStatus {
  const s = v.trim().toUpperCase();
  if (!s) return 'new';
  if (/CANCEL|REFUND|DROP|REJECT/.test(s)) return 'cancelled';
  if (/COMPLET|DONE|DELIVER|RECEIV|CLOSED|DISPATCH(ED)? TO CUSTOMER|ISSUED/.test(s)) return 'completed';
  if (/APPT|APPOINT|SLOT/.test(s)) return 'appointment';
  if (/DOC|VERIF|VEF|PENDING DOC/.test(s)) return 'documents';
  if (/APPLIED|SUBMIT|FILED|UPLOAD/.test(s)) return 'applied';
  if (/PROCESS|POLICE|PV\b|PRINT|DISPATCH|TRANSIT/.test(s)) return 'processing';
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
