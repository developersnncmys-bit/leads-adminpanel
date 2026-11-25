// Document check: pull identity fields out of OCR text from Indian documents
// (Aadhaar, PAN, Passport, Driving Licence, Voter ID, 10th / 12th marks cards,
// Birth Certificate, anything else) and compare them with each other / a lead.
//
// Everything here is pure string logic — OCR itself runs in the browser (see
// app/(dashboard)/operations/document-check), so documents never leave the
// admin's machine.
//
// To support a new document type: add it to DOC_TYPES (label, fields,
// detection keywords) and, if its layout needs special handling, a case in
// extractFields().

// ---------------------------------------------------------------------------
// Fields and document types
// ---------------------------------------------------------------------------

export type FieldKey =
  | 'name' | 'fatherName' | 'motherName' | 'dob' | 'gender' | 'address' | 'phone'
  | 'idNumber' | 'placeOfBirth' | 'bloodGroup' | 'validTill' | 'board' | 'school' | 'examYear';

export type DocFields = Record<FieldKey, string>;

export const EMPTY_FIELDS: DocFields = {
  name: '', fatherName: '', motherName: '', dob: '', gender: '', address: '', phone: '',
  idNumber: '', placeOfBirth: '', bloodGroup: '', validTill: '', board: '', school: '', examYear: '',
};

export const FIELD_LABEL: Record<FieldKey, string> = {
  name: 'Name',
  fatherName: "Father's / Guardian's name",
  motherName: "Mother's name",
  dob: 'Date of birth',
  gender: 'Gender',
  address: 'Address',
  phone: 'Phone',
  idNumber: 'Document number',
  placeOfBirth: 'Place of birth',
  bloodGroup: 'Blood group',
  validTill: 'Valid till',
  board: 'Board / University',
  school: 'School / College',
  examYear: 'Exam month & year',
};

export type DocType =
  | 'aadhaar' | 'pan' | 'passport' | 'driving_licence' | 'voter_id'
  | 'marks_10' | 'marks_12' | 'birth_certificate' | 'other';

export interface DocTypeInfo {
  label: string;
  idLabel: string;            // what idNumber means on this document
  fields: FieldKey[];         // fields printed on it (in display order)
  keywords: [RegExp, number][]; // detection score, matched on UPPERCASE text
}

const PAN_RE = /\b([A-Z]{5}\s?\d{4}\s?[A-Z])\b/;
const DL_RE = /\b([A-Z]{2}[\s-]?\d{2}[\s-]?(?:19|20)\d{2}[\s-]?\d{7})\b/;
const DL_OLD_RE = /\b([A-Z]{2}[\s-]?\d{2}[\s-]?\d{6,11})\b/;
const EPIC_RE = /\b([A-Z]{3}\s?\d{7})\b/;
const MARKS_RE = /MARKS?\s*(CARD|SHEET|MEMO)|MARKSHEET|STATEMENT\s+OF\s+MARKS|GRADE\s+(CARD|SHEET)/;

export const DOC_TYPES: Record<DocType, DocTypeInfo> = {
  aadhaar: {
    label: 'Aadhaar Card',
    idLabel: 'Aadhaar no. (last 4)',
    fields: ['name', 'fatherName', 'dob', 'gender', 'address', 'phone', 'idNumber'],
    keywords: [[/AADHAAR|AADHAR/, 3], [/UNIQUE\s+IDENTIFICATION/, 3], [/UIDAI/, 2], [/\b\d{4}\s\d{4}\s\d{4}\b/, 2], [/MERA\s+AADHAAR/, 2], [/\bVID\s*:/, 1]],
  },
  pan: {
    label: 'PAN Card',
    idLabel: 'PAN number',
    fields: ['name', 'fatherName', 'dob', 'idNumber'],
    keywords: [[/INCOME\s*TAX/, 3], [/PERMANENT\s+ACCOUNT/, 3], [PAN_RE, 3]],
  },
  passport: {
    label: 'Passport',
    idLabel: 'Passport number',
    fields: ['name', 'fatherName', 'motherName', 'dob', 'gender', 'placeOfBirth', 'address', 'idNumber', 'validTill'],
    keywords: [[/P<IND/, 3], [/PASSPORT/, 2], [/REPUBLIC\s+OF\s+INDIA/, 1], [/LEGAL\s+GUARDIAN/, 2], [/FILE\s*NO/, 2]],
  },
  driving_licence: {
    label: 'Driving Licence',
    idLabel: 'DL number',
    fields: ['name', 'fatherName', 'dob', 'gender', 'bloodGroup', 'address', 'idNumber', 'validTill'],
    keywords: [[/DRIVING\s+LICEN[CS]E/, 4], [/\bDL\s*NO/, 2], [/LICEN[CS]E\s+NO/, 2], [/TRANSPORT/, 1], [/UNION\s+OF\s+INDIA/, 1], [/\b(LMV|MCWG|MCWOG|TRANS|COV)\b/, 1], [DL_RE, 3]],
  },
  voter_id: {
    label: 'Voter ID',
    idLabel: 'EPIC number',
    fields: ['name', 'fatherName', 'dob', 'gender', 'address', 'idNumber'],
    keywords: [[/ELECTION\s+COMMISSION/, 4], [/ELECTOR/, 3], [/\bEPIC\b/, 2], [EPIC_RE, 1]],
  },
  marks_10: {
    label: '10th Marks Card',
    idLabel: 'Register / Roll no.',
    fields: ['name', 'fatherName', 'motherName', 'dob', 'gender', 'school', 'board', 'examYear', 'idNumber'],
    keywords: [[/SECONDARY\s+SCHOOL\s+LEAVING/, 4], [/\bS\.?S\.?L\.?C\b/, 4], [/SECONDARY\s+SCHOOL\s+(EXAMINATION|CERTIFICATE)/, 3], [/\bCLASS\s*[-:]?\s*(X|10|TEN)\b/, 3], [/MATRICULATION/, 3], [/HIGH\s+SCHOOL/, 2], [/BOARD\s+OF\s+SECONDARY/, 2], [MARKS_RE, 2]],
  },
  marks_12: {
    label: '12th / PUC Marks Card',
    idLabel: 'Register / Roll no.',
    fields: ['name', 'fatherName', 'motherName', 'dob', 'gender', 'school', 'board', 'examYear', 'idNumber'],
    keywords: [[/PRE[-\s]?UNIVERSITY/, 4], [/\b(II\s*)?P\.?U\.?C\b/, 3], [/SENIOR\s+SECONDARY/, 4], [/HIGHER\s+SECONDARY/, 4], [/\bCLASS\s*[-:]?\s*(XII|12|TWELVE)\b/, 4], [/INTERMEDIATE/, 3], [MARKS_RE, 2]],
  },
  birth_certificate: {
    label: 'Birth Certificate',
    idLabel: 'Registration no.',
    fields: ['name', 'fatherName', 'motherName', 'dob', 'gender', 'placeOfBirth', 'address', 'idNumber'],
    keywords: [[/BIRTH\s+CERTIFICATE/, 4], [/REGISTRATION\s+OF\s+BIRTHS/, 3], [/BIRTHS?\s+(AND|&)\s+DEATHS/, 3], [/PLACE\s+OF\s+BIRTH/, 1]],
  },
  other: {
    label: 'Other Document',
    idLabel: 'Document number',
    fields: ['name', 'fatherName', 'motherName', 'dob', 'gender', 'address', 'phone', 'idNumber'],
    keywords: [],
  },
};

export const DOC_TYPE_ORDER: DocType[] = [
  'aadhaar', 'pan', 'passport', 'driving_licence', 'voter_id', 'marks_10', 'marks_12', 'birth_certificate', 'other',
];

export function detectDocType(text: string): DocType {
  const t = text.toUpperCase();
  let best: DocType = 'other';
  let bestScore = 1; // need at least 2 points to beat "other"
  for (const type of DOC_TYPE_ORDER) {
    const score = DOC_TYPES[type].keywords.reduce((s, [re, w]) => s + (re.test(t) ? w : 0), 0);
    if (score > bestScore) { best = type; bestScore = score; }
  }
  return best;
}

// ---------------------------------------------------------------------------
// OCR quality — used to find the right orientation of sideways scans
// ---------------------------------------------------------------------------

// How "readable" an OCR result is: real-looking words weighted by Tesseract's
// confidence. A sideways scan produces junk like "i Sod Be hey p" with low
// confidence and very few real words, so it scores far lower.
export function ocrQuality(text: string, confidence: number): number {
  const words = text.split(/\s+/).map((w) => w.replace(/[.,:;()\/'"-]+/g, '')).filter(Boolean);
  const real = words.filter((w) => /^([A-Z]{3,}|[A-Z]?[a-z]{3,}|\d{4,})$/.test(w)).length;
  return real * Math.max(0, confidence) / 100;
}

// Good enough to skip trying other orientations.
export const OCR_GOOD_ENOUGH = (quality: number, confidence: number) => confidence >= 70 && quality >= 12;

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

const clean = (s: string) => s.replace(/[|_~`"“”]+/g, ' ').replace(/\s+/g, ' ').trim();

function toLines(text: string): string[] {
  return text.split(/\r?\n/).map(clean).filter(Boolean);
}

// Words printed on documents that are never part of a person's name.
const NOT_NAME = /\b(GOVT|GOVERNMENT|INDIA|INCOME|TAX|DEPARTMENT|PERMANENT|ACCOUNT|NUMBER|CARD|SIGNATURE|DOB|BIRTH|YEAR|MALE|FEMALE|TRANSGENDER|ADDRESS|FATHER|MOTHER|HUSBAND|NAME|UNIQUE|IDENTIFICATION|AUTHORITY|AADHAAR|AADHAR|REPUBLIC|PASSPORT|NATIONALITY|INDIAN|SURNAME|GIVEN|PLACE|ISSUE|EXPIRY|DATE|ENROLMENT|ENROLLMENT|VID|DOWNLOAD|HELP|WWW|GOV|MERA|PEHCHAN|PROOF|CITIZENSHIP|SPOUSE|LEGAL|GUARDIAN|FILE|TYPE|CODE|COUNTRY|SEX|ISSUED|LICENCE|LICENSE|DRIVING|TRANSPORT|UNION|VALID|VALIDITY|BLOOD|GROUP|ELECTION|COMMISSION|ELECTOR|IDENTITY|BOARD|SECONDARY|EXAMINATION|CERTIFICATE|SCHOOL|COLLEGE|MARKS|SUBJECT|SUBJECTS|TOTAL|RESULT|PASS|PASSED|REGISTER|REGISTRATION|ROLL|CLASS|DIVISION|DISTINCTION|GRADE|MUNICIPAL|CORPORATION|STATE|UNIVERSITY|EDUCATION|CANDIDATE|STATEMENT|LEAVING|MEDIUM|FIRST|SECOND|THIRD|ENGLISH|HINDI|KANNADA|SCIENCE|MATHEMATICS|SOCIAL|THE|THIS|THAT|HAS|HAVE|WITH|BELOW|MENTIONED|CERTIFY|CERTIFIED|FOLLOWING|DETAILS|INSTRUCTION|MONTH|OBTAINED|LANGUAGE|SINGATURE|HOLDER|SEE|RULE|RULES|FORM|SECTION|ACT|NINETEEN|TWENTY|THOUSAND|HUNDRED|THIRTIETH|JANUARY|FEBRUARY|MARCH|APRIL|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\b/i;

function isNameLike(line: string): boolean {
  const l = line.trim();
  if (l.length < 3 || l.length > 45) return false;
  if (!/^[A-Za-z][A-Za-z .']*$/.test(l)) return false;
  if (NOT_NAME.test(l)) return false;
  return l.split(/\s+/).some((w) => w.replace(/\./g, '').length >= 2);
}

const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/\s+/g, ' ').trim();

// dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy, yyyy-mm-dd or "15 Aug 1990" -> YYYY-MM-DD
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function parseDate(s: string): string {
  return allDates(s)[0] || (/^\s*(19|20)\d{2}\s*$/.test(s) ? s.trim() : '');
}

function allDates(s: string): string[] {
  if (!s) return [];
  const out: string[] = [];
  for (const m of s.matchAll(/\b(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*((?:19|20)\d{2})\b/g)) {
    const [, d, mo, y] = m;
    if (+d >= 1 && +d <= 31 && +mo >= 1 && +mo <= 12) out.push(`${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`);
  }
  for (const m of s.matchAll(/\b((?:19|20)\d{2})-(\d{1,2})-(\d{1,2})\b/g)) {
    out.push(`${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`);
  }
  for (const m of s.matchAll(/\b(\d{1,2})[\s\-]*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*[\s\-,]*((?:19|20)\d{2})\b/gi)) {
    const mo = MONTHS.indexOf(m[2].toUpperCase()) + 1;
    out.push(`${m[3]}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`);
  }
  return out;
}

// Date of birth is always the oldest date on an ID (issue / expiry dates are later).
function oldestDate(text: string): string {
  return allDates(text).sort()[0] || '';
}

export function formatDob(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function findGender(text: string): string {
  const m = text.match(/\b(FEMALE|MALE|TRANSGENDER)\b/i);
  if (m) return m[1].toUpperCase();
  const s = text.match(/\b(?:SEX|GENDER)\s*[:\-/]?\s*([MF])\b/i);
  if (s) return s[1].toUpperCase() === 'F' ? 'FEMALE' : 'MALE';
  return '';
}

function findPhone(text: string): string {
  const m = text.match(/(?:\+?91[\s-]?)?\b([6-9]\d{4}\s?\d{5})\b/);
  return m ? m[1].replace(/\s/g, '') : '';
}

// Pull a clean name out of a noisy OCR line: "= NITHIN SHANBOUGH i" ->
// "NITHIN SHANBOUGH", "NITHIN SHANBOUGHA S [See Rule 16(2)]" -> "NITHIN SHANBOUGHA S".
// On an all-caps name, stray lowercase tokens are OCR noise and are dropped.
function nameCandidate(raw: string): string {
  // Common OCR slips inside names: "A 5" / "A $" for "A S", "SHANB0UGH",
  // and "A'S" for the initials "A S".
  const fixed = raw
    .replace(/(^|\s)[$5§](?=\s|$)/g, '$1S')
    .replace(/\S*[A-Za-z]{2}\S*/g, (w) => w.replace(/0/g, 'O').replace(/1/g, 'I').replace(/5/g, 'S').replace(/8/g, 'B'))
    .replace(/\b([A-Z])['’`]([A-Z])\b/g, '$1 $2');
  // The longest run of name characters is the name: "pe —. AJJAHALLI SUBRAMANYA"
  const runs = fixed.split(/[^A-Za-z .']+/).map((r) => r.replace(/^[\s.']+/, ''));
  const letters = (r: string) => r.replace(/[^A-Za-z]/g, '').length;
  const s = runs.reduce((a, b) => (letters(b) > letters(a) ? b : a), '');
  let tokens = s.split(/\s+/).filter(Boolean);
  const caps = tokens.filter((t) => t.replace(/[^A-Za-z]/g, '').length >= 2 && t === t.toUpperCase()).length;
  if (caps >= 1 && caps >= tokens.length / 2) tokens = tokens.filter((t) => t === t.toUpperCase());
  return tokens.join(' ').replace(/[\s.']+$/, '').trim();
}

const isAllCaps = (s: string) => /[A-Z]/.test(s) && s === s.toUpperCase();

// Value printed after a label: on the same line ("Name: Ravi Kumar") or on one
// of the next two lines. kind 'name' only accepts name-like values; a name that
// wraps onto a second all-caps line (common on PAN cards) is joined.
function labelValue(
  lines: string[], label: RegExp, opts: { exclude?: RegExp; kind?: 'name' | 'text' | 'date' } = {},
): string {
  const kind = opts.kind ?? 'name';
  const pick = (v: string) => (kind === 'name' ? nameCandidate(v) : v);
  const ok = (v: string) =>
    kind === 'name' ? isNameLike(v) : kind === 'date' ? !!parseDate(v) : v.length >= 2;
  const fmt = (v: string) => (kind === 'name' ? titleCase(v) : kind === 'date' ? parseDate(v) : v);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(label);
    if (!m) continue;
    const labelEnd = (m.index ?? 0) + m[0].length;
    // Only the label phrase decides exclusion — everything before the capitalised
    // value — so "Name NITHIN …  Mother's Name GOWRAMMA" is still a Name line,
    // while "Name of Father / Legal Guardian" is not.
    const valueAt = line.slice(labelEnd).search(/\b[A-Z]{2,}(\s+[A-Z]+\b)+/);
    const labelPhrase = valueAt >= 0 ? line.slice(0, labelEnd + valueAt) : line;
    if (opts.exclude && opts.exclude.test(labelPhrase)) continue;
    let rest = clean(line.slice(labelEnd)
      .replace(/^[\s:\-.]+/, '')
      .replace(/^OF\b[\s:\-.]*/i, '')); // "S/D/W of : NAME"
    // Two labels on one line: "Name : RAVI KUMAR   Sex : MALE"
    if (kind === 'name') rest = rest.replace(/\s+(SEX|GENDER|DOB|D\.O\.B|DATE|AGE|BLOOD|S\s*\/\s*[DOW]|FATHER|MOTHER|ROLL|REG)\b.*$/i, '').trim();
    const same = pick(rest);
    if (same && ok(same)) return fmt(same);

    // Column layout: OCR sometimes returns all labels first, then all values
    // ("Name / Mother's Name / Father's Name" then "NITHIN… / GOWRAMMA… / SUBRAMANYA…").
    // The k-th label in such a run takes the k-th value after it.
    if (kind === 'name') {
      let start = i, end = i;
      while (start > 0 && isLabelLine(lines[start - 1])) start--;
      while (end + 1 < lines.length && isLabelLine(lines[end + 1])) end++;
      if (end > start) {
        const values: string[] = [];
        for (let j = end + 1; j < lines.length && values.length <= end - start; j++) {
          if (isLabelLine(lines[j])) break;
          const v = nameCandidate(lines[j]);
          if (isNameLike(v)) values.push(v);
        }
        const v = values[i - start];
        if (v) return fmt(v);
        continue;
      }
    }

    for (let j = i + 1; j <= i + 2 && j < lines.length; j++) {
      const v = pick(lines[j]);
      if (!ok(v)) continue;
      let value = v;
      if (kind === 'name' && isAllCaps(v)) {
        // Next line, skipping one line of pure OCR noise ("=", "|").
        let n = j + 1;
        if (n < lines.length && lines[n].replace(/[^A-Za-z]/g, '').length < 2) n++;
        const next = lines[n] ?? '';
        const cont = nameCandidate(next);
        if (isAllCaps(next) && cont === clean(next) && isNameLike(cont)) value = `${v} ${cont}`;
      }
      return fmt(value);
    }
  }
  return '';
}

// A line that is just a person-field label ("Mother's Name", "पिता का नाम / Father's Name")
// with no value after it.
function isLabelLine(l: string): boolean {
  const m = l.match(/(NAME|FATHER|MOTHER|BIRTH|D\.?O\.?B)\b[^A-Za-z]*$/i);
  if (!m) return false;
  return /(NAME|FATHER|MOTHER|GUARDIAN|SPOUSE|BIRTH|D\.?O\.?B)/i.test(l);
}

// Drop OCR noise from an all-caps address: stray lowercase tokens, quotes.
function cleanAddress(a: string): string {
  const s = a.replace(/[‘’'"“”`©®|]/g, ' ');
  const tokens = s.split(/\s+/).filter(Boolean);
  const caps = tokens.filter((t) => /[A-Z]{2}/.test(t) && t === t.toUpperCase()).length;
  const kept = caps >= tokens.length * 0.6 ? tokens.filter((t) => t === t.toUpperCase()) : tokens;
  return kept.join(' ').replace(/\s+,/g, ',').replace(/,\s*,+/g, ',').replace(/^[\s,:.\-\/]+|[\s,:.\-\/]+$/g, '');
}

// Address block: text after an "Address" label up to the line holding the PIN.
function findAddress(lines: string[], label: RegExp, stop?: RegExp): string {
  const idx = lines.findIndex((l) => label.test(l));
  if (idx < 0) return '';
  const parts: string[] = [];
  const first = clean(lines[idx].replace(label, '').replace(/^[\s:\-]+/, ''));
  if (first) parts.push(first);
  if (pinFrom(first)) return first;
  for (let j = idx + 1; j < lines.length && parts.length < 7; j++) {
    const l = lines[j];
    if (stop && stop.test(l)) break;
    if (/^\d{4}\s?\d{4}\s?\d{4}$/.test(l)) break; // Aadhaar number line
    parts.push(l);
    if (/\b\d{3}\s?\d{3}\b/.test(l)) break; // PIN code ends the address
  }
  return cleanAddress(clean(parts.join(', ').replace(/,\s*,/g, ',')));
}

// When OCR loses the "Address" label (often printed in faint colour), find the
// address by its PIN-code line and take the address-looking lines above it.
function addressNearPin(lines: string[]): string {
  const idx = lines.findIndex((l) =>
    /\bPIN\s*(CODE)?\s*[:\-]?\s*\d{3}\s?\d{3}\b/i.test(l) ||
    (/(^|[\s,\-:])\d{3}\s?\d{3}([\s,.]|$)/.test(l) && !/\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4}/.test(l) && /[A-Za-z]{3}/.test(l)));
  if (idx < 0) return '';
  const looksLikeAddress = (l: string) => {
    if (/(NAME|FATHER|MOTHER|SPOUSE|GUARDIAN|DATE|BIRTH|SIGN|VALID|ISSUE)/i.test(l)) return false;
    const tokens = l.split(/\s+/).filter(Boolean);
    const good = tokens.filter((t) => /^[A-Z0-9#,.\-\/:()]+$/.test(t) && /[A-Z0-9]{2}/.test(t)).length;
    return tokens.length > 0 && good / tokens.length >= 0.7;
  };
  const parts = [lines[idx]];
  for (let j = idx - 1; j >= Math.max(0, idx - 3) && looksLikeAddress(lines[j]); j--) parts.unshift(lines[j]);
  return cleanAddress(parts.join(', '));
}

export function pinFrom(s: string): string {
  const all = [...s.matchAll(/\b(\d{3})\s?(\d{3})\b/g)];
  const last = all[all.length - 1];
  return last ? last[1] + last[2] : '';
}

const DOB_LABEL = /(D\.?\s?O\.?\s?B\.?|DATE\s+OF\s+BIRTH|BIRTH\s+DATE|जन्म)/i;
// "S/O", also as OCR tends to read it: "Slo", "S1O", "S|0"
const REL_OF = String.raw`\b[SDWC]\s*[\/lI1|]\s*[O0o]\b`;
const FATHER_LABEL = new RegExp(String.raw`(FATHER['’]?S?(\s*\/\s*(HUSBAND|GUARDIAN)['’]?S?)?\s*NAME|NAME\s+OF\s+(THE\s+)?FATHER|FATHER\b|S\s*\/\s*D\s*\/\s*W|SON\s*\/\s*DAUGHTER\s*\/\s*WIFE|${REL_OF}|HUSBAND'?S?\s*NAME|GUARDIAN)`, 'i');
const MOTHER_LABEL = /(MOTHER'?S?\s*NAME|NAME\s+OF\s+(THE\s+)?MOTHER|MOTHER\b)/i;
// No leading \b on NAME: OCR often glues the regional-language label onto it ("mxdsName").
const NAME_LABEL = /(NAME\s+OF\s+THE\s+CANDIDATE|CANDIDATE'?S?\s+NAME|ELECTOR'?S?\s+NAME|STUDENT'?S?\s+NAME|NAME\b)/i;
const NOT_OWN_NAME = new RegExp(String.raw`(FATHER|MOTHER|HUSBAND|SPOUSE|GUARDIAN|RELATION|SCHOOL|COLLEGE|INSTITUT|BOARD|SURNAME|GIVEN|PLACE|S\s*\/\s*D\s*\/\s*W|${REL_OF})`, 'i');

// ---------------------------------------------------------------------------
// Per-document extraction
// ---------------------------------------------------------------------------

function extractPan(text: string, lines: string[], f: DocFields) {
  const pan = text.toUpperCase().match(PAN_RE);
  if (pan) f.idNumber = pan[1].replace(/\s/g, '');
  f.name = labelValue(lines, /\bname\b/i, { exclude: /father/i });
  f.fatherName = labelValue(lines, /father/i);
  // Old PAN cards: name and father's name are the first two name-like lines
  // under the "INCOME TAX DEPARTMENT" header.
  if (!f.name) {
    const start = Math.max(0, lines.findIndex((l) => /INCOME|GOVT/i.test(l)));
    const names = lines.slice(start).filter(isNameLike);
    f.name = names[0] ? titleCase(names[0]) : '';
    if (!f.fatherName) f.fatherName = names[1] ? titleCase(names[1]) : '';
  }
  f.dob = oldestDate(text);
}

function extractAadhaar(text: string, lines: string[], f: DocFields) {
  const masked = text.match(/\b[Xx*]{4}\s?[Xx*]{4}\s?(\d{4})\b/);
  const full = text.match(/\b(\d{4})\s(\d{4})\s(\d{4})\b/) || text.match(/\b(\d{4})(\d{4})(\d{4})\b/);
  // Only keep the last 4 digits — never hold a full Aadhaar number.
  if (full) f.idNumber = `XXXX XXXX ${full[3]}`;
  else if (masked) f.idNumber = `XXXX XXXX ${masked[1]}`;

  const dobIdx = lines.findIndex((l) => /(DOB|D\.O\.B|Date\s+of\s+Birth|जन्म|Year\s+of\s+Birth|YOB)/i.test(l));
  if (dobIdx >= 0) {
    const line = lines[dobIdx];
    f.dob = parseDate(line);
    if (!f.dob) {
      const y = line.match(/\b(19|20)\d{2}\b/);
      if (y) f.dob = y[0];
    }
    // The name sits on the line(s) just above the DOB.
    for (let j = dobIdx - 1; j >= Math.max(0, dobIdx - 3); j--) {
      if (isNameLike(lines[j])) { f.name = titleCase(lines[j]); break; }
    }
  }
  if (!f.dob) f.dob = oldestDate(text);
  if (!f.name) {
    const start = Math.max(0, lines.findIndex((l) => /GOVERNMENT|INDIA/i.test(l)));
    const n = lines.slice(start + 1).find(isNameLike);
    if (n) f.name = titleCase(n);
  }
  f.address = findAddress(lines, /(Address|पता)\s*[:\-]?/i, /(aadhaar|uidai|help@|www\.|1947)/i);
  const co = text.match(/\b[SCDW]\s?\/\s?O\s*[:\-]?\s*([A-Za-z .]{3,40})/);
  if (co) f.fatherName = titleCase(co[1].replace(/,.*$/, ''));
}

// Passport MRZ (the two "<<<" lines at the bottom of the photo page).
function parseMrz(text: string): Partial<DocFields> | null {
  const rows = text
    .toUpperCase()
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, '').replace(/[«‹(\[{]/g, '<'));
  const out: Partial<DocFields> = {};

  const l1 = rows.find((r) => /^P.?IND[A-Z<]{5,}/.test(r));
  if (l1) {
    const body = l1.replace(/^P.?IND/, '').replace(/[<K]{3,}$/, '');
    const [surname, given = ''] = body.split(/<<+/);
    const name = `${given.replace(/</g, ' ')} ${surname.replace(/</g, ' ')}`;
    if (name.trim()) out.name = titleCase(name);
  }

  const l2 = rows.map((r) => r.match(/([A-Z0-9<]{8,9})\d?IND(\d{6})\d([MF<])(\d{6})/)).find(Boolean);
  if (l2) {
    out.idNumber = l2[1].replace(/</g, '');
    const yy = +l2[2].slice(0, 2);
    const century = yy > new Date().getFullYear() % 100 ? '19' : '20';
    out.dob = `${century}${l2[2].slice(0, 2)}-${l2[2].slice(2, 4)}-${l2[2].slice(4, 6)}`;
    if (l2[3] === 'M') out.gender = 'MALE';
    if (l2[3] === 'F') out.gender = 'FEMALE';
    const e = l2[4];
    out.validTill = `20${e.slice(0, 2)}-${e.slice(2, 4)}-${e.slice(4, 6)}`;
  }
  return l1 || l2 ? out : null;
}

function extractPassport(text: string, lines: string[], f: DocFields) {
  // OCR often misreads the label ("Surmame"), so match it loosely.
  const surname = labelValue(lines, /SUR\s?[NM][AE]?\s?[MN]?E/i);
  const given = labelValue(lines, /GIVEN\s*NAME/i);
  const visualName = surname || given ? titleCase(`${given} ${surname}`) : '';
  f.name = visualName;
  const num = text.toUpperCase().match(/\b([A-Z]{1,2}\s?\d{6,7})\b/);
  if (num) f.idNumber = num[1].replace(/\s/g, '');
  f.dob = labelValue(lines, /date\s+of\s+birth/i, { kind: 'date' }) || oldestDate(text);
  f.placeOfBirth = labelValue(lines, /place\s+of\s+birth/i, { kind: 'text' }).replace(/\d.*$/, '').trim();
  f.validTill = labelValue(lines, /date\s+of\s+expiry/i, { kind: 'date' });

  const mrz = parseMrz(text);
  if (mrz) {
    // The printed name is more reliable than the MRZ, where OCR mangles the
    // "<" separators; fall back to the MRZ only when the printed name is missing.
    if (mrz.name && (!visualName || !surname || !given)) f.name = mrz.name;
    if (mrz.idNumber && /^[A-Z]{1,2}\d{6,7}$/.test(mrz.idNumber)) f.idNumber = mrz.idNumber;
    if (mrz.dob) f.dob = mrz.dob;
    if (mrz.gender) f.gender = mrz.gender;
    if (mrz.validTill && !f.validTill) f.validTill = mrz.validTill;
  }

  // Back (address) page
  f.fatherName = labelValue(lines, /name\s+of\s+father/i);
  f.motherName = labelValue(lines, /name\s+of\s+mother/i);
  f.address = findAddress(lines, /\bAddress\b\s*[:\-]?/i, /(file\s+no|old\s+passport|passport\s+no)/i);
}

function extractDrivingLicence(text: string, lines: string[], f: DocFields) {
  const t = text.toUpperCase();
  const dl = t.match(DL_RE) || t.match(DL_OLD_RE);
  if (dl) f.idNumber = dl[1].replace(/[\s-]/g, '');
  f.bloodGroup = (t.match(/BLOOD\s*GROUP\s*[:\-]?\s*((AB|A|B|O)\s*([+-]|\+?VE|-VE|POSITIVE|NEGATIVE)?)/) || [])[1]?.replace(/\s/g, '') || '';
  f.validTill = (t.match(/(VALID\s*(TILL|UPTO|UP\s*TO)|VALIDITY|\bNT\b)[^0-9]{0,15}(\d{1,2}[\/\-.]\d{1,2}[\/\-.](?:19|20)\d{2})/) || [])[3] || '';
  if (f.validTill) f.validTill = parseDate(f.validTill);
  f.address = findAddress(lines, /\b(ADDRESS|ADD)\b\s*[:\-]?/i, /(signature|issuing|authority|valid)/i);
}

function extractVoterId(text: string, lines: string[], f: DocFields) {
  const epic = text.toUpperCase().match(EPIC_RE);
  if (epic) f.idNumber = epic[1].replace(/\s/g, '');
  f.fatherName = labelValue(lines, /(FATHER'?S?|HUSBAND'?S?|RELATION'?S?|MOTHER'?S?)\s*NAME/i);
  f.address = findAddress(lines, /\bADDRESS\b\s*[:\-]?/i, /(date|electoral|registration\s+officer|facsimile)/i);
}

// Common boards, matched loosely so a few OCR errors in the heading still work.
const KNOWN_BOARDS: [RegExp, string][] = [
  [/KARNATAKA\s+SECONDARY\s+EDUCATION|\bKSEEB\b|KARNATAKA\s+SCHOOL\s+EXAMINATION/, 'Karnataka Secondary Education Examination Board'],
  [/PRE[-\s]?UNIVERSITY\s+EDUCATION/, 'Department of Pre-University Education, Karnataka'],
  [/CENTRAL\s+BOARD\s+OF\s+SECONDARY|\bCBSE\b/, 'Central Board of Secondary Education (CBSE)'],
  [/COUNCIL\s+FOR\s+THE\s+INDIAN\s+SCHOOL|\bCISCE\b|\bICSE\b/, 'Council for the Indian School Certificate Examinations (CISCE)'],
  [/NATIONAL\s+INSTITUTE\s+OF\s+OPEN\s+SCHOOLING|\bNIOS\b/, 'National Institute of Open Schooling (NIOS)'],
  [/MAHARASHTRA\s+STATE\s+BOARD/, 'Maharashtra State Board'],
  [/TAMIL\s*NADU|GOVERNMENT\s+EXAMINATIONS,?\s+CHENNAI/, 'Tamil Nadu State Board'],
  [/KERALA|PAREEKSHA\s+BHAVAN/, 'Kerala State Board'],
  [/ANDHRA\s+PRADESH/, 'Andhra Pradesh State Board'],
  [/TELANGANA/, 'Telangana State Board'],
];

function extractMarksCard(text: string, lines: string[], f: DocFields) {
  const t = text.toUpperCase();
  const reg = t.match(/(REG(?:ISTER|ISTRATION|N)?\.?\s*NO|ROLL\s*NO|SEAT\s*NO|CANDIDATE\s*NO|INDEX\s*NO)\.?\s*[:\-]?\s*([A-Z0-9\/\-]{4,20})/);
  if (reg) f.idNumber = reg[2];
  // Register numbers are long digit runs; OCR often garbles their label.
  if (!f.idNumber) {
    const digits = t.match(/(?<![\d\/\-.])(\d{8,12})(?![\d\/\-.])/);
    if (digits) f.idNumber = digits[1];
  }
  const yr = t.match(/\b(JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUNE?|JULY?|AUG(?:UST)?|SEPT?(?:EMBER)?|OCT(?:OBER)?|NOV(?:EMBER)?|DEC(?:EMBER)?)[\s,\-\/]*((?:19|20)\d{2})\b/);
  const passYear = t.match(/(YEAR\s+OF\s+(PASSING|EXAM(INATION)?))\s*[:\-]?\s*((?:19|20)\d{2})/);
  f.examYear = yr ? `${titleCase(yr[1])} ${yr[2]}` : passYear ? passYear[4] : '';
  const known = KNOWN_BOARDS.find(([re]) => re.test(t));
  if (known) f.board = known[1];
  else {
    const boardLine = lines.find((l) => /(BOARD|COUNCIL|DEPARTMENT\s+OF\s+PRE|UNIVERSITY)/i.test(l) && l.length < 90);
    if (boardLine) f.board = titleCase(boardLine.replace(/[^A-Za-z .,&()-]/g, ' ').replace(/^(\S{1,2}\s+)+/, ''));
  }
  f.school = labelValue(lines, /(NAME\s+OF\s+THE\s+(SCHOOL|COLLEGE|INSTITUTION)|SCHOOL|COLLEGE)\s*[:\-]/i, { kind: 'text' });
  // Some boards print "This is to certify that RAVI KUMAR ..." instead of a Name label.
  if (!labelValue(lines, NAME_LABEL, { exclude: NOT_OWN_NAME })) {
    const i = lines.findIndex((l) => /certify\s+that/i.test(l));
    if (i >= 0) {
      const after = lines[i].replace(/^.*?certify\s+that\s*/i, '')
        .replace(/^(Mr|Ms|Miss|Kum|Kumari|Sri|Shri|Smt)\.?\s+/i, '')
        .replace(/\s+(son|daughter|s\s*\/\s*o|d\s*\/\s*o|has|bearing|roll|of)\b.*$/i, '')
        .trim();
      const cand = after || lines[i + 1] || '';
      if (isNameLike(cand)) f.name = titleCase(cand);
    }
  }
}

function extractBirthCertificate(text: string, lines: string[], f: DocFields) {
  const reg = text.toUpperCase().match(/REGISTRATION\s*(NO|NUMBER)\.?\s*[:\-]?\s*([A-Z0-9\/\-]{3,25})/);
  if (reg) f.idNumber = reg[2];
  f.placeOfBirth = labelValue(lines, /PLACE\s+OF\s+BIRTH/i, { kind: 'text' });
  f.address = findAddress(lines, /(ADDRESS\s+OF\s+(THE\s+)?PARENTS[^:]*|PERMANENT\s+ADDRESS[^:]*|\bADDRESS\b)\s*[:\-]?/i, /(registration|remarks|date\s+of\s+(issue|registration))/i);
}

export function extractFields(text: string, type: DocType): DocFields {
  const lines = toLines(text);
  const f: DocFields = { ...EMPTY_FIELDS };

  if (type === 'pan') extractPan(text, lines, f);
  else if (type === 'aadhaar') extractAadhaar(text, lines, f);
  else if (type === 'passport') extractPassport(text, lines, f);
  else if (type === 'driving_licence') extractDrivingLicence(text, lines, f);
  else if (type === 'voter_id') extractVoterId(text, lines, f);
  else if (type === 'marks_10' || type === 'marks_12') extractMarksCard(text, lines, f);
  else if (type === 'birth_certificate') extractBirthCertificate(text, lines, f);

  // Generic label-based fallbacks for anything the specific parser left empty.
  if (!f.name) f.name = labelValue(lines, NAME_LABEL, { exclude: NOT_OWN_NAME });
  if (!f.fatherName) f.fatherName = labelValue(lines, FATHER_LABEL, { exclude: MOTHER_LABEL });
  if (!f.motherName) f.motherName = labelValue(lines, MOTHER_LABEL);
  if (!f.dob) f.dob = labelValue(lines, DOB_LABEL, { kind: 'date' }) || oldestDate(text);
  if (!f.gender) f.gender = findGender(text);
  if (!f.address && type === 'other') f.address = findAddress(lines, /\bADDRESS\b\s*[:\-]?/i);
  if (!f.address && DOC_TYPES[type].fields.includes('address')) f.address = addressNearPin(lines);
  if (!f.phone && (type === 'other' || type === 'aadhaar')) f.phone = findPhone(text);
  if (!f.idNumber && type === 'other') {
    const id = text.toUpperCase().match(/(?:NO|NUMBER|ID)\.?\s*[:\-]\s*([A-Z0-9\/\-]{5,20})/);
    if (id) f.idNumber = id[1];
  }

  // Only keep the fields this document actually has.
  const keep = new Set(DOC_TYPES[type].fields);
  for (const k of Object.keys(f) as FieldKey[]) if (!keep.has(k)) f[k] = '';
  return f;
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

export type MatchStatus = 'match' | 'partial' | 'mismatch' | 'missing';

export interface MatchResult {
  status: MatchStatus;
  note?: string;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

const similarity = (a: string, b: string) =>
  !a && !b ? 1 : 1 - levenshtein(a, b) / Math.max(a.length, b.length);

const HONORIFIC = /\b(MR|MRS|MS|MISS|SHRI|SRI|SMT|KUMARI|KUM|DR|LATE)\b/g;

function nameTokens(s: string): string[] {
  return s.toUpperCase().replace(/[^A-Z ]/g, ' ').replace(HONORIFIC, ' ').split(/\s+/).filter(Boolean);
}

// OCR often glues a trailing initial onto the surname: "SHANBOUGHA S" for
// "SHANBOUGH A S". Split such a token when the other name has the pieces.
// Also "SUBRAMANYAAR" for "SUBRAMANYA A R" (up to two glued initials).
function splitGluedInitials(tokens: string[], other: string[]): string[] {
  const has = new Set(other);
  const initials = new Set(other.map((t) => t[0]));
  const known = (w: string) => has.has(w) || other.some((o) => o.length >= 4 && similarity(w, o) >= 0.9);
  return tokens.flatMap((t) => {
    if (has.has(t)) return [t];
    let head = t;
    const tails: string[] = [];
    for (let n = 0; n < 2 && head.length >= 5; n++) {
      const h = head.slice(0, -1), tail = head.slice(-1);
      if (!initials.has(tail) || !(known(h) || h.length >= 5)) break;
      head = h;
      tails.unshift(tail);
      if (has.has(head)) return [head, ...tails]; // exact word: done
    }
    return tails.length && known(head) ? [head, ...tails] : [t];
  });
}

export function compareNames(a: string, b: string): MatchResult {
  let A = nameTokens(a), B = nameTokens(b);
  if (!A.length || !B.length) return { status: 'missing' };
  A = splitGluedInitials(A, B);
  B = splitGluedInitials(B, A);
  if (A.join('') === B.join('')) return { status: 'match' };
  if (similarity(A.join(''), B.join('')) >= 0.9) return { status: 'match', note: 'minor spelling difference' };

  const usedA = new Set<number>(), usedB = new Set<number>();
  let full = 0, initials = 0;

  // Pass 1 — whole words (exact, or a small OCR/spelling slip).
  A.forEach((t, i) => {
    if (t.length < 2) return;
    const j = B.findIndex((u, k) => !usedB.has(k) && u.length >= 2 &&
      (u === t ||
        (Math.min(t.length, u.length) >= 4 && similarity(t, u) >= 0.8) ||
        // OCR cut the word short: "AJJA" for "AJJAHALLI"
        (Math.min(t.length, u.length) >= 4 && (u.startsWith(t) || t.startsWith(u)))));
    if (j >= 0) { usedA.add(i); usedB.add(j); full++; }
  });

  // Pass 2 — initials: "A" = "AJJAHALLI", and "CV" = "C V" = "CHENNENAHALLI VENKATARAMAIAH".
  // Grouped initials ("AR", "CV") first, so a lone "A" can't steal the "AR".
  const matchInitials = (X: string[], usedX: Set<number>, Y: string[], usedY: Set<number>, grouped: boolean) => {
    X.forEach((t, i) => {
      if (usedX.has(i) || t.length > 3 || (t.length > 1) !== grouped) return;
      const picks: number[] = [];
      for (const ch of t) {
        const j = Y.findIndex((u, k) => !usedY.has(k) && !picks.includes(k) && u[0] === ch);
        if (j < 0) return;
        picks.push(j);
      }
      usedX.add(i);
      picks.forEach((j) => usedY.add(j));
      initials++;
    });
  };
  matchInitials(A, usedA, B, usedB, true);
  matchInitials(B, usedB, A, usedA, true);
  matchInitials(A, usedA, B, usedB, false);
  matchInitials(B, usedB, A, usedA, false);

  const leftA = A.filter((_, i) => !usedA.has(i));
  const leftB = B.filter((_, i) => !usedB.has(i));
  const left = [...leftA, ...leftB];

  if (!full) return { status: 'mismatch' };
  if (!left.length) {
    // "A S Nithin Shanbough" vs "Ajjahalli Subramanya Nithin Shanbough": same
    // person with initials written out — standard on Indian documents.
    return initials ? { status: 'match', note: 'initials expanded' } : { status: 'match', note: 'word order differs' };
  }
  if (!leftA.length || !leftB.length) {
    return { status: 'partial', note: `extra: ${titleCase(left.join(' '))}` };
  }
  return { status: 'partial', note: `differs: ${titleCase(leftA.join(' '))} / ${titleCase(leftB.join(' '))}` };
}

export function compareDob(a: string, b: string): MatchResult {
  const x = parseDate(a) || a.trim(), y = parseDate(b) || b.trim();
  if (!x || !y) return { status: 'missing' };
  if (x === y) return { status: 'match' };
  if ((x.length === 4 || y.length === 4) && x.slice(0, 4) === y.slice(0, 4)) {
    return { status: 'partial', note: 'only birth year printed' };
  }
  // Day and month swapped (05/08 vs 08/05) is a common data-entry slip.
  if (x.length === 10 && y.length === 10 && x.slice(0, 4) === y.slice(0, 4) && x.slice(5, 7) === y.slice(8, 10) && x.slice(8, 10) === y.slice(5, 7)) {
    return { status: 'partial', note: 'day and month swapped' };
  }
  return { status: 'mismatch' };
}

const ADDR_STOP = new Set(['NEAR', 'THE', 'AND', 'POST', 'DIST', 'DISTRICT', 'TALUK', 'STATE', 'INDIA', 'ROAD', 'CROSS', 'MAIN', 'STREET', 'NAGAR', 'LAYOUT', 'HOUSE', 'FLAT', 'ADDRESS']);

function addrTokens(s: string): Set<string> {
  return new Set(
    s.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/)
      .filter((t) => t.length >= 3 && !ADDR_STOP.has(t) && !/^\d{6}$/.test(t)),
  );
}

export function compareAddress(a: string, b: string): MatchResult {
  if (!a.trim() || !b.trim()) return { status: 'missing' };
  const pa = pinFrom(a), pb = pinFrom(b);
  const A = addrTokens(a), B = addrTokens(b);
  const common = [...A].filter((t) => B.has(t)).length;
  const overlap = common / Math.max(1, Math.min(A.size, B.size));
  const samePin = !!pa && pa === pb;
  if (pa && pb && pa !== pb) return { status: 'mismatch', note: `PIN ${pa} vs ${pb}` };
  if (overlap >= 0.6) return { status: 'match', note: samePin ? 'same PIN' : undefined };
  if (overlap >= 0.3 || samePin) return { status: 'partial', note: samePin ? 'same PIN, wording differs' : 'wording differs' };
  return { status: 'mismatch' };
}

export function comparePhone(a: string, b: string): MatchResult {
  const x = a.replace(/\D/g, '').slice(-10), y = b.replace(/\D/g, '').slice(-10);
  if (x.length < 10 || y.length < 10) return { status: 'missing' };
  return { status: x === y ? 'match' : 'mismatch' };
}

export function compareGender(a: string, b: string): MatchResult {
  const norm = (s: string) => {
    const t = s.trim().toUpperCase();
    if (/^F/.test(t)) return 'F';
    if (/^M/.test(t)) return 'M';
    if (/^T/.test(t)) return 'T';
    return '';
  };
  const x = norm(a), y = norm(b);
  if (!x || !y) return { status: 'missing' };
  return { status: x === y ? 'match' : 'mismatch' };
}

export type CompareField = 'name' | 'fatherName' | 'motherName' | 'dob' | 'gender' | 'address' | 'phone';

export const COMPARE_FIELDS: { key: CompareField; label: string; fn: (a: string, b: string) => MatchResult }[] = [
  { key: 'name',       label: 'Name',            fn: compareNames },
  { key: 'fatherName', label: "Father's name",   fn: compareNames },
  { key: 'motherName', label: "Mother's name",   fn: compareNames },
  { key: 'dob',        label: 'Date of Birth',   fn: compareDob },
  { key: 'gender',     label: 'Gender',          fn: compareGender },
  { key: 'address',    label: 'Address',         fn: compareAddress },
  { key: 'phone',      label: 'Phone',           fn: comparePhone },
];

// When no lead details are entered, the most trustworthy document for each
// field becomes the reference the others are compared against.
export const REFERENCE_PRIORITY: Record<CompareField, DocType[]> = {
  name:       ['passport', 'pan', 'aadhaar', 'birth_certificate', 'marks_10', 'driving_licence', 'voter_id', 'marks_12', 'other'],
  fatherName: ['passport', 'pan', 'marks_10', 'birth_certificate', 'driving_licence', 'voter_id', 'marks_12', 'aadhaar', 'other'],
  motherName: ['birth_certificate', 'passport', 'marks_10', 'marks_12', 'other'],
  dob:        ['birth_certificate', 'passport', 'marks_10', 'pan', 'aadhaar', 'driving_licence', 'voter_id', 'marks_12', 'other'],
  gender:     ['passport', 'aadhaar', 'birth_certificate', 'voter_id', 'driving_licence', 'marks_10', 'marks_12', 'other'],
  address:    ['aadhaar', 'passport', 'driving_licence', 'voter_id', 'birth_certificate', 'other'],
  phone:      ['other', 'aadhaar'],
};

// ---------------------------------------------------------------------------
// Combining several OCR readings of the same document
// ---------------------------------------------------------------------------

const NAME_FIELDS = new Set<FieldKey>(['name', 'fatherName', 'motherName']);

// Pick the better of two values for one field. `a` comes from the stronger
// reading and wins ties; `b` only replaces it when clearly more complete:
// "Nithin Shanbough A" -> "Nithin Shanbough A S", a full date over a year,
// an address that has its PIN code.
function betterValue(key: FieldKey, a: string, b: string): string {
  if (!a) return b;
  if (!b || a === b) return a;
  if (NAME_FIELDS.has(key)) {
    const r = compareNames(a, b);
    const ta = nameTokens(a).length, tb = nameTokens(b).length;
    // Same name, one has 1–2 more parts (a dropped initial or surname) —
    // more than that is usually OCR junk tacked on.
    if ((r.status === 'match' || r.note?.startsWith('extra')) && tb > ta && tb - ta <= 2) return b;
    return a;
  }
  if (key === 'dob') return a.length === 4 && b.length === 10 ? b : a;
  if (key === 'address') return !pinFrom(a) && pinFrom(b) ? b : a;
  return a;
}

// Fields from every reading, merged — each reading fills the other's gaps.
export function extractMerged(texts: string[], type: DocType): DocFields {
  const all = texts.filter((t) => t.trim()).map((t) => extractFields(t, type));
  if (!all.length) return { ...EMPTY_FIELDS };
  const out = { ...all[0] };
  for (const f of all.slice(1)) {
    for (const k of Object.keys(out) as FieldKey[]) out[k] = betterValue(k, out[k], f[k]);
  }
  return out;
}
