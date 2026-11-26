// Operations module configuration: case statuses, the service tabs (like the
// team's Google Sheet tabs) and the dropdown choices for each service.
// To add a service or a type, edit the lists here — the pages read them.

import type { CaseStatus, UserRole } from './types';
import { SERVICES, VISA_COUNTRIES } from './constants';

export const CASE_STATUS: { key: CaseStatus; label: string; short: string; cls: string; dot: string }[] = [
  { key: 'new',         label: 'New (not started)',   short: 'New',         cls: 'bg-slate-100 text-slate-700',     dot: '#94a3b8' },
  { key: 'documents',   label: 'Document verification', short: 'Doc verification', cls: 'bg-amber-50 text-amber-700', dot: '#f59e0b' },
  { key: 'processing',  label: 'In process (appointment / applied)',          short: 'In process',  cls: 'bg-cyan-50 text-cyan-700',       dot: '#06b6d4' },
  { key: 'completed',   label: 'Completed',           short: 'Completed',   cls: 'bg-emerald-50 text-emerald-700', dot: '#10b981' },
  { key: 'cancelled',   label: 'Cancelled',           short: 'Cancelled',   cls: 'bg-red-50 text-red-700',         dot: '#ef4444' },
];

export const statusInfo = (s: string) => CASE_STATUS.find((x) => x.key === s) ?? CASE_STATUS[0];

// Who can open the Operations module (Overview, Cases, Document Check): admins only.
export const canUseOperations = (role?: UserRole | string) => role === 'admin';

export const OPS_SERVICES = [...SERVICES, 'Complaint Copy', 'Other'];

// Short tab names, like the sheet's tabs.
export const SERVICE_TAB: Record<string, string> = {
  'Passport': 'Passport',
  'PAN Card': 'PAN Card',
  'Tourist Visa': 'Visa',
  'Senior Citizen Card': 'Senior Citizen',
  'Rental Agreement': 'Rental',
  'Lease Agreement': 'Lease',
  'MSME Registration': 'MSME',
  'Insurance': 'Insurance',
  'Police Clearance Certificate (PCC)': 'PCC',
  'Police Verification Certificate (PVC)': 'PVC',
  'Affidavits / Annexure': 'Affidavit',
  'Complaint Copy': 'Complaint Copy',
  'Other': 'Other',
};

export interface ServiceFields {
  typeLabel: string;      // what "type" means for this service
  types: string[];        // suggestions (free text is allowed too)
  scheme?: string[];      // e.g. NORMAL / TATKAL
  category?: string[];    // e.g. ADULT / MINOR
  portal?: boolean;       // customer has a government-portal login
  appointment?: boolean;  // has an appointment date
  applicationNoLabel: string;
}

const DEFAULT_FIELDS: ServiceFields = {
  typeLabel: 'Type', types: ['NEW', 'OTHER'], applicationNoLabel: 'Application / reference no.',
};

export const SERVICE_FIELDS: Record<string, ServiceFields> = {
  'Passport': {
    typeLabel: 'Application type',
    types: ['FRESH', 'RE-ISSUE', 'LOP (LOST)', 'DAMAGED', 'CHANGE OF PARTICULARS'],
    scheme: ['NORMAL', 'TATKAL', 'SPECIAL'],
    category: ['ADULT', 'MINOR'],
    portal: true, appointment: true, applicationNoLabel: 'File no. / ARN',
  },
  'PAN Card': {
    typeLabel: 'Request type', types: ['NEW', 'CORRECTION', 'REPRINT / LOST', 'MINOR TO MAJOR'],
    category: ['ADULT', 'MINOR'], applicationNoLabel: 'Acknowledgement no.',
  },
  'Tourist Visa': {
    typeLabel: 'Country', types: VISA_COUNTRIES.map((c) => c.toUpperCase()),
    category: ['ADULT', 'MINOR'], applicationNoLabel: 'Visa application no.',
  },
  'Senior Citizen Card': {
    typeLabel: 'Type', types: ['NEW', 'RENEWAL', 'DUPLICATE'], portal: true, applicationNoLabel: 'Application no.',
  },
  'Rental Agreement': {
    typeLabel: 'Agreement type', types: ['RESIDENTIAL', 'COMMERCIAL', 'RENEWAL'], applicationNoLabel: 'Stamp paper / reference no.',
  },
  'Lease Agreement': {
    typeLabel: 'Agreement type', types: ['RESIDENTIAL', 'COMMERCIAL', 'LAND'], applicationNoLabel: 'Stamp paper / reference no.',
  },
  'MSME Registration': {
    typeLabel: 'Type', types: ['NEW', 'UPDATE', 'CANCELLATION'], portal: true, applicationNoLabel: 'Udyam no.',
  },
  'Insurance': {
    typeLabel: 'Policy type', types: ['HEALTH', 'LIFE', 'VEHICLE', 'TRAVEL'], applicationNoLabel: 'Policy no.',
  },
  'Police Clearance Certificate (PCC)': {
    typeLabel: 'Type', types: ['FRESH', 'URGENT'], portal: true, appointment: true, applicationNoLabel: 'File no. / ARN',
  },
  'Police Verification Certificate (PVC)': {
    typeLabel: 'Purpose', types: ['EMPLOYMENT', 'TENANT', 'OTHER'], portal: true, applicationNoLabel: 'Application no.',
  },
  'Affidavits / Annexure': {
    typeLabel: 'Affidavit type', types: ['NAME CHANGE', 'ADDRESS PROOF', 'ANNEXURE', 'GAP', 'OTHER'], applicationNoLabel: 'Reference no.',
  },
  'Complaint Copy': {
    typeLabel: 'Complaint type', types: ['LOST DOCUMENT', 'LOST PASSPORT', 'OTHER'], applicationNoLabel: 'Complaint / FIR no.',
  },
};

export const serviceFields = (service: string): ServiceFields => SERVICE_FIELDS[service] ?? DEFAULT_FIELDS;

export const CASE_SOURCES = ['WEBSITE', 'CALL', 'REF', 'WALK-IN', 'WHATSAPP', 'OTHER'];
export const PAYMENT_MODES = ['UPI', 'CASH', 'CARD', 'BANK TRANSFER', 'Online (Paytm)'];

export const rupees = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

// "2026-11" in India time.
export const thisMonth = () =>
  new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 7);

export const monthLabel = (m: string, long = true) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString('en-IN', { month: long ? 'long' : 'short', year: long ? 'numeric' : undefined, timeZone: 'UTC' });
};

// Green ≥ 85 %, amber ≥ 60 %, red below.
export const pctTone = (pct: number) =>
  pct >= 85 ? { bar: 'bg-emerald-500', text: 'text-emerald-600' }
  : pct >= 60 ? { bar: 'bg-amber-500', text: 'text-amber-600' }
  : { bar: 'bg-red-500', text: 'text-red-600' };

// PAN Card needs no further operations work: a converted PAN lead's case is
// completed automatically and its status cannot be changed (backend enforces it).
export const AUTO_COMPLETE_SERVICES = ['PAN Card'];
export const isAutoCompleteCase = (c: { leadId?: string; service: string }) =>
  !!c.leadId && AUTO_COMPLETE_SERVICES.includes(c.service);

// ---------------------------------------------------------------------------
// Columns per service — the Cases table AND the import sample CSV use these,
// in this order, matching each of the team's sheet tabs.
// ---------------------------------------------------------------------------

export type CaseColumn =
  | 'date' | 'source' | 'city' | 'handledBy' | 'type' | 'category' | 'name' | 'mobile'
  | 'email' | 'ack' | 'status' | 'loginId' | 'password' | 'appointment' | 'amount' | 'mode';

const DEFAULT_COLUMNS: CaseColumn[] = [
  'date', 'source', 'city', 'handledBy', 'type', 'category', 'name', 'mobile', 'email',
  'status', 'loginId', 'password', 'appointment', 'amount', 'mode',
];

export const SERVICE_COLUMNS: Record<string, CaseColumn[]> = {
  'PAN Card': ['date', 'source', 'city', 'type', 'handledBy', 'name', 'mobile', 'email', 'ack', 'status', 'amount', 'mode'],
  'Police Verification Certificate (PVC)': ['date', 'source', 'city', 'handledBy', 'type', 'name', 'mobile', 'status', 'loginId', 'password', 'appointment', 'amount', 'mode'],
  'Senior Citizen Card': ['date', 'source', 'city', 'handledBy', 'name', 'mobile', 'email', 'ack', 'status', 'loginId', 'password', 'amount', 'mode'],
  'Affidavits / Annexure': ['date', 'source', 'city', 'type', 'handledBy', 'name', 'mobile', 'status', 'amount', 'mode'],
  'Tourist Visa': ['date', 'source', 'city', 'type', 'handledBy', 'name', 'mobile', 'email', 'status', 'amount', 'mode'],
};

// '' = the "All services" view.
export const columnsFor = (service: string): CaseColumn[] => SERVICE_COLUMNS[service] ?? DEFAULT_COLUMNS;

export function columnLabel(col: CaseColumn, service: string): string {
  switch (col) {
    case 'date': return 'Date';
    case 'source': return 'Source';
    case 'city': return 'City';
    case 'handledBy': return 'Handled by';
    case 'type': return service === 'Tourist Visa' ? 'Country' : 'Type';
    case 'category': return 'Category';
    case 'name': return 'Name';
    case 'mobile': return 'Mobile';
    case 'email': return 'Email';
    case 'ack': return 'Acknowledgement no';
    case 'status': return 'Status';
    case 'loginId': return 'Login ID';
    case 'password': return 'Password';
    case 'appointment': return 'Appointment';
    case 'amount': return 'Amount';
    case 'mode': return 'Mode';
  }
}

// Display text as "Capital first, rest small": "MS MASUMI CHAUDHARY" ->
// "Ms Masumi Chaudhary", "WEBSITE" -> "Website". Short codes stay in capitals
// (UPI, PAN, MMD …). Display only — the saved data is not changed.
const KEEP_UPPER = new Set([
  'UPI', 'PAN', 'PVC', 'PCC', 'MMD', 'LOP', 'ARN', 'NEFT', 'IMPS', 'RTGS', 'GPAY', 'SSLC', 'PUC',
  'ID', 'NRI', 'KYC', 'EKYC', 'CSC', 'BSK', 'MSME', 'DL', 'LMV', 'II', 'III', 'IV',
]);
export function tc(s?: string): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/[a-z][a-z']*/g, (w) => (KEEP_UPPER.has(w.toUpperCase()) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .replace(/\s+/g, ' ')
    .trim();
}
