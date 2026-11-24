// PDF match report for Document Check: lead details, overall match %, a score
// per document and the field-by-field comparison, colour-coded.
// Generated in the browser with jsPDF — nothing is uploaded.

import type { jsPDF as JsPDF } from 'jspdf';
import { formatDob, parseDate, type CompareField, type MatchResult, type MatchStatus } from './docCheck';

type Score = { pct: number; n: number; matched: number } | null;

export interface ReportInput {
  labels: string[];
  fileNames: string[];
  rows: {
    key: CompareField;
    label: string;
    overall: MatchStatus;
    cells: { value: string; printed: boolean; isRef: boolean; result: MatchResult }[];
  }[];
  total: Score;
  perDoc: Score[];
  perField: Score[];
  verdictText: string;
  expected: Record<CompareField, string>;
  hasLead: boolean;
  lead: { service?: string; orderId?: string } | null;
  generatedBy?: string;
  generatedAt?: Date;
}

const STATUS: Record<MatchStatus | 'reference', { label: string; rgb: [number, number, number] }> = {
  match:     { label: 'Match',     rgb: [5, 150, 105] },
  partial:   { label: 'Check',     rgb: [217, 119, 6] },
  mismatch:  { label: 'Mismatch',  rgb: [220, 38, 38] },
  missing:   { label: '',          rgb: [156, 163, 175] },
  reference: { label: 'Reference', rgb: [37, 99, 235] },
};

const tone = (pct: number | undefined): [number, number, number] =>
  pct === undefined ? [156, 163, 175] : pct >= 85 ? [16, 185, 129] : pct >= 60 ? [245, 158, 11] : [239, 68, 68];

// Plain-ASCII text for the PDF's built-in font.
const ascii = (s: string) =>
  s.replace(/[—–]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...').replace(/·/g, '|').replace(/[^\x20-\x7E\n]/g, '');

const showValue = (key: CompareField, v: string) => (key === 'dob' ? formatDob(parseDate(v) || v) : v);

export async function buildReportPdf(r: ReportInput): Promise<{ pdf: JsPDF; fileName: string }> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const landscape = r.labels.length > 3;
  const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const M = 14;
  const now = r.generatedAt ?? new Date();

  // Header band
  pdf.setFillColor(37, 99, 235);
  pdf.rect(0, 0, W, 24, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text('Make My Documents - Document Check Report', M, 11);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(ascii(`Generated ${now.toLocaleString('en-IN')}${r.generatedBy ? `  |  by ${r.generatedBy}` : ''}`), M, 18);

  // Customer / lead
  let y = 33;
  pdf.setTextColor(17, 24, 39);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(r.lead ? 'Lead' : r.hasLead ? 'Customer details (entered manually)' : 'Customer', M, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  y += 6;
  const info: [string, string][] = [];
  if (r.expected.name) info.push(['Name', r.expected.name]);
  if (r.expected.phone) info.push(['Phone', r.expected.phone]);
  if (r.lead?.service) info.push(['Service', r.lead.service]);
  if (r.lead?.orderId) info.push(['Order ID', r.lead.orderId]);
  if (!info.length) info.push(['', 'No lead selected - documents were compared with each other.']);
  info.forEach(([k, v], i) => {
    const x = M + (i % 2) * ((W - 2 * M) / 2);
    if (i && i % 2 === 0) y += 5.5;
    pdf.setTextColor(107, 114, 128);
    if (k) pdf.text(`${k}:`, x, y);
    pdf.setTextColor(17, 24, 39);
    pdf.text(ascii(v), x + (k ? 20 : 0), y);
  });

  // Overall score card
  y += 10;
  const pct = r.total?.pct;
  const t = tone(pct);
  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(M, y, W - 2 * M, 26, 3, 3, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(107, 114, 128);
  pdf.text('OVERALL MATCH', M + 5, y + 7);
  pdf.setFontSize(11);
  pdf.setTextColor(...t);
  pdf.text(ascii(r.verdictText), M + 5, y + 13);
  pdf.setFontSize(24);
  pdf.text(pct !== undefined ? `${pct}%` : '-', W - M - 5, y + 13, { align: 'right' });
  const barW = W - 2 * M - 10;
  pdf.setFillColor(229, 231, 235);
  pdf.roundedRect(M + 5, y + 17, barW, 3.5, 1.7, 1.7, 'F');
  if (pct) {
    pdf.setFillColor(...t);
    pdf.roundedRect(M + 5, y + 17, Math.max(3.5, (barW * pct) / 100), 3.5, 1.7, 1.7, 'F');
  }
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(107, 114, 128);
  if (r.total) pdf.text(`${r.total.matched} of ${r.total.n} compared values match exactly`, M + 5, y + 24.5);
  y += 32;

  // Per-document scores
  autoTable(pdf, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Document', 'File', 'Match', 'Fields matched']],
    body: r.labels.map((l, i) => {
      const s = r.perDoc[i];
      return [ascii(l), ascii(r.fileNames[i] ?? ''), s ? `${s.pct}%` : 'Reference', s ? `${s.matched} of ${s.n}` : '-'];
    }),
    styles: { fontSize: 8.5, cellPadding: 2.2 },
    headStyles: { fillColor: [31, 41, 55] },
    columnStyles: { 2: { fontStyle: 'bold', halign: 'center' }, 3: { halign: 'center' } },
    didParseCell: (h) => {
      if (h.section === 'body' && h.column.index === 2) h.cell.styles.textColor = tone(r.perDoc[h.row.index]?.pct);
    },
  });

  // Field-by-field comparison
  const head = ['Field', 'Overall', ...(r.hasLead ? ['Lead'] : []), ...r.labels.map(ascii)];
  const statusOf: (MatchStatus | 'reference' | null)[][] = [];
  const body = r.rows.map((row, ri) => {
    const fieldPct = r.perField[ri]?.pct;
    const st: (MatchStatus | 'reference' | null)[] = [null, row.overall, ...(r.hasLead ? [null] : [])];
    const cells = row.cells.map((c) => {
      const s: MatchStatus | 'reference' = c.isRef ? 'reference' : c.result.status;
      st.push(c.value ? s : null);
      if (!c.value) return c.printed ? 'Not read' : '-';
      const tag = STATUS[s].label;
      return ascii(`${showValue(row.key, c.value)}${tag ? `\n${tag}${c.result.note ? ` (${c.result.note})` : ''}` : ''}`);
    });
    statusOf.push(st);
    const leadVal = r.expected[row.key].trim();
    return [
      row.label,
      `${STATUS[row.overall].label || '-'}${fieldPct !== undefined ? `\n${fieldPct}%` : ''}`,
      ...(r.hasLead ? [ascii(leadVal ? showValue(row.key, leadVal) : '-')] : []),
      ...cells,
    ];
  });

  autoTable(pdf, {
    startY: (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7,
    margin: { left: M, right: M },
    head: [head],
    body,
    styles: { fontSize: 8, cellPadding: 2.2, valign: 'top', overflow: 'linebreak' },
    rowPageBreak: 'avoid',
    headStyles: { fillColor: [31, 41, 55] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 26 }, 1: { cellWidth: 20 } },
    didParseCell: (h) => {
      if (h.section !== 'body') return;
      const s = statusOf[h.row.index]?.[h.column.index];
      if (s && s !== 'missing') h.cell.styles.textColor = STATUS[s].rgb;
    },
  });

  // Footer on every page
  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    const H = pdf.internal.pageSize.getHeight();
    pdf.setFontSize(7.5);
    pdf.setTextColor(156, 163, 175);
    pdf.text('Match = 1, Check = 0.5, Mismatch = 0. Values are read by OCR - verify important details against the original documents.', M, H - 8);
    pdf.text(`Page ${p} of ${pages}`, W - M, H - 8, { align: 'right' });
  }

  const who = (r.expected.name || 'report').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return { pdf, fileName: `Document-Check_${who}_${date}.pdf` };
}
