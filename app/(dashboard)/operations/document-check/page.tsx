'use client';

// Admin-only Document Check: upload a customer's documents (Aadhaar, PAN,
// Passport, Driving Licence, Voter ID, 10th / 12th marks cards, Birth
// Certificate or anything else — images or PDFs), read them with OCR in the
// browser, and check that name, parents' names, date of birth, gender, address
// and phone agree with each other and with the lead. Files are never uploaded:
// OCR (tesseract.js) runs on this machine.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, FileSearch, Upload, Trash2, X, CheckCircle, XCircle,
  AlertTriangle, MinusCircle, Loader2, ShieldCheck, ChevronDown, ChevronUp,
  Plus, RotateCcw, RotateCw, Crop, Maximize2, Download, Phone, UserCheck, UserX, ZoomIn, ZoomOut,
} from 'lucide-react';
import type { Worker as TesseractWorker } from 'tesseract.js';
import * as api from '@/lib/api';
import type { Lead } from '@/lib/types';
import {
  COMPARE_FIELDS, DOC_TYPES, DOC_TYPE_ORDER, EMPTY_FIELDS, FIELD_LABEL, REFERENCE_PRIORITY,
  detectDocType, extractMerged, formatDob, parseDate,
  type CompareField, type DocFields, type DocType, type FieldKey, type MatchResult, type MatchStatus,
} from '@/lib/docCheck';
import { readImage, type CanvasLike, type MakeCanvas } from '@/lib/docOcr';
import { buildReportPdf } from '@/lib/docReport';
import { canUseOperations } from '@/lib/opsConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DocStatus = 'queued' | 'reading' | 'done' | 'error';

interface DocItem {
  id: string;
  file: File;
  previewUrl: string;     // object URL for images, '' for PDFs
  status: DocStatus;
  progress: number;       // 0..1 while reading
  stage: string;
  text: string;          // all readings, for "Show text read from document"
  texts: string[];       // the separate OCR readings, best first
  type: DocType;
  forcedType: DocType | null; // chosen by the admin before reading — skips detection
  customLabel: string;    // name for "Other" documents, e.g. "Bank passbook"
  fields: DocFields;
  error: string;
}

type Expected = Record<CompareField, string>;
const EMPTY_EXPECTED: Expected = { name: '', fatherName: '', motherName: '', dob: '', gender: '', address: '', phone: '' };

const DATE_FIELDS = new Set<FieldKey>(['dob', 'validTill']);

const docLabel = (d: DocItem) =>
  d.type === 'other' && d.customLabel.trim() ? d.customLabel.trim() : DOC_TYPES[d.type].label;

// ---------------------------------------------------------------------------
// File -> text (OCR / PDF text layer)
// ---------------------------------------------------------------------------

const makeCanvas: MakeCanvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

interface PdfSource { text: string; pages: HTMLCanvasElement[]; preview?: HTMLCanvasElement }

// Digital PDFs (e.g. e-Aadhaar, DigiLocker marks cards) carry a text layer that
// is far more accurate than OCR, so use it when present; scanned PDFs are
// rendered and OCR'd.
async function readPdf(file: File, askPassword: (retry: boolean) => string | null): Promise<PdfSource> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  let password: string | undefined;
  let doc;
  for (let attempt = 0; ; attempt++) {
    try {
      doc = await pdfjs.getDocument({ data: data.slice(), password }).promise;
      break;
    } catch (e) {
      if ((e as { name?: string })?.name !== 'PasswordException') throw e;
      const p = askPassword(attempt > 0);
      if (p === null) throw new Error('PDF is password protected');
      password = p;
    }
  }

  const pageCount = Math.min(doc.numPages, 3);
  let text = '';
  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let lastY: number | undefined;
    for (const item of content.items) {
      if (!('str' in item)) continue;
      const y = item.transform[5];
      if (lastY !== undefined && Math.abs(y - lastY) > 3) text += '\n';
      text += item.str + (item.hasEOL ? '\n' : ' ');
      lastY = y;
    }
    text += '\n';
  }
  const render = async (n: number, scale: number) => {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvas, viewport }).promise;
    return canvas;
  };

  if (text.replace(/\s/g, '').length >= 80) return { text, pages: [], preview: await render(1, 2.5) };

  const pages: HTMLCanvasElement[] = [];
  for (let i = 1; i <= pageCount; i++) pages.push(await render(i, 2.5));
  return { text: '', pages, preview: pages[0] };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DocumentCheckPage() {
  // Admin gate — read the saved login directly so a non-admin never sees the tool.
  const [access, setAccess] = useState<'loading' | 'admin' | 'denied'>('loading');
  useEffect(() => {
    try {
      const role = JSON.parse(localStorage.getItem('crm-auth') || '{}')?.role;
      setAccess(canUseOperations(role) ? 'admin' : 'denied');
    } catch {
      setAccess('denied');
    }
  }, []);

  if (access === 'loading') {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }
  if (access === 'denied') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
        <ShieldCheck className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-bold text-gray-900">Admins only</p>
        <p className="text-sm text-gray-400 mt-1">Document Check is available to admins and the Operations team.</p>
      </div>
    );
  }
  return <DocumentCheck />;
}

function DocumentCheck() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [expected, setExpected] = useState<Expected>(EMPTY_EXPECTED);
  const [lead, setLead] = useState<Lead | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [viewing, setViewing] = useState<DocItem | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const pendingType = useRef<DocType | null>(null);

  const workerRef = useRef<TesseractWorker | null>(null);
  const currentId = useRef<string | null>(null);
  const busy = useRef(false);

  const patchDoc = useCallback((id: string, patch: Partial<DocItem>) => {
    setDocs((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }, []);

  const getWorker = useCallback(async () => {
    if (workerRef.current) return workerRef.current;
    const { createWorker } = await import('tesseract.js');
    workerRef.current = await createWorker('eng', 1, {
      logger: (m) => {
        const id = currentId.current;
        if (!id) return;
        if (m.status === 'recognizing text') patchDoc(id, { progress: m.progress });
        else patchDoc(id, { stage: 'Loading OCR engine (first time only)' });
      },
    });
    return workerRef.current;
  }, [patchDoc]);

  // One OCR pass in the given page-segmentation mode: '3' = normal layout,
  // '11' = sparse text (copes with photos / QR codes on ID cards).
  const recognize = useCallback(async (canvas: CanvasLike, psm: '3' | '11') => {
    const worker = await getWorker();
    const { PSM } = await import('tesseract.js');
    await worker.setParameters({ tessedit_pageseg_mode: psm === '11' ? PSM.SPARSE_TEXT : PSM.AUTO });
    const { data } = await worker.recognize(canvas as HTMLCanvasElement);
    return { text: data.text, confidence: data.confidence };
  }, [getWorker]);

  useEffect(() => () => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  // Revoke image previews when the page unmounts.
  const docsRef = useRef(docs);
  docsRef.current = docs;
  useEffect(() => () => docsRef.current.forEach((d) => d.previewUrl && URL.revokeObjectURL(d.previewUrl)), []);

  const processDoc = useCallback(async (doc: DocItem) => {
    currentId.current = doc.id;
    patchDoc(doc.id, { status: 'reading', progress: 0, stage: 'Preparing' });
    try {
      let texts: string[] = [];
      // Reads one image twice (as-is and background-cleaned), rotating
      // sideways scans; returns the readings best first.
      const ocr = (img: CanvasLike) =>
        readImage(img, {
          make: makeCanvas,
          recognize,
          forcedType: doc.forcedType,
          onStep: (label, step) => patchDoc(doc.id, { stage: step > 1 ? `${label} (pass ${step})` : label, progress: 0 }),
        });

      if (doc.file.type === 'application/pdf' || /\.pdf$/i.test(doc.file.name)) {
        const pdf = await readPdf(doc.file, (retry) =>
          window.prompt(
            `${retry ? 'Wrong password. ' : ''}"${doc.file.name}" is password protected.\n` +
            'e-Aadhaar password = first 4 letters of the name in CAPITALS + birth year (e.g. RAVI1990).',
          ),
        );
        // A picture of page 1 so the PDF can be viewed, cropped and rotated too.
        if (!doc.previewUrl && pdf.preview) {
          const blob = await new Promise<Blob | null>((res) => pdf.preview!.toBlob(res, 'image/jpeg', 0.85));
          if (blob) patchDoc(doc.id, { previewUrl: URL.createObjectURL(blob) });
        }
        if (pdf.text) texts = [pdf.text];
        else {
          // Scanned PDF: read every page; reading 1 of all pages, then reading 2.
          const perPage: string[][] = [];
          for (const page of pdf.pages) perPage.push(await ocr(page));
          texts = [0, 1].map((i) => perPage.map((r) => r[i] ?? r[0] ?? '').join('\n')).filter((t) => t.trim());
        }
      } else {
        // Honour the phone's EXIF rotation, then read.
        const bmp = await createImageBitmap(doc.file, { imageOrientation: 'from-image' });
        try { texts = await ocr(bmp as unknown as CanvasLike); } finally { bmp.close(); }
      }

      const all = texts.join('\n');
      const type = doc.forcedType ?? detectDocType(all);
      patchDoc(doc.id, { status: 'done', progress: 1, stage: '', texts, text: all, type, fields: extractMerged(texts, type) });
    } catch (e) {
      patchDoc(doc.id, { status: 'error', error: e instanceof Error ? e.message : 'Could not read this file' });
    } finally {
      currentId.current = null;
    }
  }, [recognize, patchDoc]);

  // Read queued documents one at a time (one OCR worker, steady memory use).
  useEffect(() => {
    if (busy.current) return;
    const next = docs.find((d) => d.status === 'queued');
    if (!next) return;
    busy.current = true;
    processDoc(next).finally(() => {
      busy.current = false;
      setDocs((ds) => [...ds]); // re-run this effect for the next queued file
    });
  }, [docs, processDoc]);

  const addFiles = (files: FileList | File[], forcedType: DocType | null = null) => {
    const accepted = Array.from(files).filter((f) => /^image\//.test(f.type) || f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    setDocs((ds) => [
      ...ds,
      ...accepted.map<DocItem>((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: /^image\//.test(file.type) ? URL.createObjectURL(file) : '',
        status: 'queued',
        progress: 0,
        stage: 'Waiting',
        text: '',
        texts: [],
        type: forcedType ?? 'other',
        forcedType,
        customLabel: '',
        fields: { ...EMPTY_FIELDS },
        error: '',
      })),
    ]);
  };

  // "Add" on a checklist chip: pick files that are already known to be that type.
  const pickFor = (type: DocType | null) => {
    pendingType.current = type;
    fileInput.current?.click();
  };

  const removeDoc = (id: string) => {
    setDocs((ds) => {
      const d = ds.find((x) => x.id === id);
      if (d?.previewUrl) URL.revokeObjectURL(d.previewUrl);
      return ds.filter((x) => x.id !== id);
    });
  };

  const changeType = (id: string, type: DocType) => {
    setDocs((ds) => ds.map((d) => (d.id === id ? { ...d, type, forcedType: type, fields: extractMerged(d.texts, type) } : d)));
  };

  const rereadFields = (id: string) => {
    setDocs((ds) => ds.map((d) => (d.id === id ? { ...d, fields: extractMerged(d.texts, d.type) } : d)));
  };

  // From the viewer's crop / rotate tool: swap in the edited image and read it again.
  const replaceImage = (id: string, file: File) => {
    setDocs((ds) => ds.map((d) => {
      if (d.id !== id) return d;
      if (d.previewUrl) URL.revokeObjectURL(d.previewUrl);
      return {
        ...d, file, previewUrl: URL.createObjectURL(file), status: 'queued', progress: 0, stage: 'Waiting',
        text: '', texts: [], fields: { ...EMPTY_FIELDS }, error: '',
        forcedType: d.status === 'done' ? d.type : d.forcedType, // keep the type the admin saw
      };
    }));
    setViewing(null);
  };

  const editField = (id: string, key: FieldKey, value: string) => {
    setDocs((ds) => ds.map((d) => (d.id === id ? { ...d, fields: { ...d.fields, [key]: value } } : d)));
  };

  const pickLead = useCallback(async (l: Lead) => {
    let full = l;
    try { full = await api.getLead(l.id); } catch { /* fall back to the search row */ }
    const fd = full.formData ?? {};
    // Street address plus district/state/PIN, skipping parts it already contains.
    const street = full.address || fd.address || '';
    const extra = [full.district || fd.district, full.state || fd.state, full.pinCode || fd.pinCode || fd.pincode || fd.pin]
      .filter((p): p is string => !!p && !street.toLowerCase().includes(String(p).toLowerCase()));
    const rawDob = full.dateOfBirth || fd.dateOfBirth || fd.dob || '';
    setLead(full);
    setExpected({
      name: full.name || [fd.givenName, fd.surname].filter(Boolean).join(' '),
      fatherName: fd.fatherName || fd.fathersName || fd.father || '',
      motherName: fd.motherName || fd.mothersName || fd.mother || '',
      dob: parseDate(rawDob) || rawDob,
      gender: (full.gender || fd.gender || '').toUpperCase(),
      phone: full.mobileNumber || fd.mobile || '',
      address: [street, ...extra].filter(Boolean).join(', '),
    });
  }, []);

  const counts = useMemo(() => {
    const c: Partial<Record<DocType, number>> = {};
    docs.forEach((d) => { if (d.status === 'done' || d.forcedType) c[d.type] = (c[d.type] || 0) + 1; });
    return c;
  }, [docs]);

  const done = docs.filter((d) => d.status === 'done');
  const reading = docs.some((d) => d.status === 'queued' || d.status === 'reading');

  return (
    <div className="space-y-6 max-w-7xl">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/operations" className="p-2 rounded-xl border border-gray-200 hover:bg-white transition-colors" title="Back to Operations">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-sm shadow-emerald-200">
            <FileSearch className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Document Check</h1>
            <p className="text-sm text-gray-400">Match a customer&apos;s details across all their documents</p>
          </div>
        </div>
        {docs.length > 0 && (
          <button
            onClick={() => { docs.forEach((d) => d.previewUrl && URL.revokeObjectURL(d.previewUrl)); setDocs([]); }}
            className="text-sm font-semibold text-gray-500 hover:text-red-600 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white"
          >
            <RotateCcw className="w-4 h-4" /> Start over
          </button>
        )}
      </div>

      <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-xs text-emerald-800">
        <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          Documents are read in this browser and are <b>not uploaded or saved</b> anywhere. Only the last 4 digits of an
          Aadhaar number are kept. OCR can misread blurry photos — click a thumbnail to compare with the original and correct any field.
        </p>
      </div>

      {/* 1. Lead details */}
      <LeadDetails expected={expected} setExpected={setExpected} lead={lead} onPick={pickLead} onClear={() => { setLead(null); setExpected(EMPTY_EXPECTED); }} />

      {/* 2. Documents */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div>
          <p className="text-sm font-bold text-gray-900">2. Customer documents</p>
          <p className="text-xs text-gray-400">
            Use <b>+</b> on a document type to add files of that type, or drop any files below and the type is detected automatically.
            Front and back as separate files works best.
          </p>
        </div>

        {/* Checklist of supported document types */}
        <div className="flex flex-wrap gap-2">
          {DOC_TYPE_ORDER.map((t) => {
            const n = counts[t] || 0;
            return (
              <button
                key={t}
                onClick={() => pickFor(t)}
                className={`flex items-center gap-1.5 text-xs font-semibold pl-2.5 pr-2 py-1.5 rounded-full border transition-colors ${
                  n ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700'
                }`}
                title={`Add ${DOC_TYPES[t].label}`}
              >
                {n ? <CheckCircle className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {DOC_TYPES[t].label}
                {n > 1 && <span className="bg-emerald-600 text-white rounded-full px-1.5 text-[10px]">{n}</span>}
              </button>
            );
          })}
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
          onClick={() => pickFor(null)}
          className={`border-2 border-dashed rounded-2xl py-7 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
          }`}
        >
          <Upload className="w-7 h-7 text-blue-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-700">Upload all the customer&apos;s documents at once</p>
          <p className="text-xs text-gray-400 mt-0.5 mb-3">
            Drag &amp; drop several files here, or choose them together (hold <b>Ctrl</b> or <b>Shift</b> to select many).
            JPG, PNG or PDF — each type is detected automatically.
          </p>
          <span className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm shadow-blue-200">
            <Upload className="w-4 h-4" /> Choose files
          </span>
        </div>

        {docs.length > 0 && <QueueProgress docs={docs} />}
        <input
          ref={fileInput}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files, pendingType.current);
            pendingType.current = null;
            e.target.value = '';
          }}
        />

        {docs.length > 0 && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {docs.map((d) => (
              <DocCard
                key={d.id}
                doc={d}
                onRemove={() => removeDoc(d.id)}
                onType={(t) => changeType(d.id, t)}
                onEdit={(k, v) => editField(d.id, k, v)}
                onLabel={(v) => patchDoc(d.id, { customLabel: v })}
                onReread={() => rereadFields(d.id)}
                onView={() => setViewing(d)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 3. Results */}
      {done.length > 0 && <Results docs={done} expected={expected} hasLead={Object.values(expected).some((v) => v.trim())} reading={reading} lead={lead} />}

      {viewing && <Viewer doc={viewing} onClose={() => setViewing(null)} onApply={(file) => replaceImage(viewing.id, file)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lead details (reference values)
// ---------------------------------------------------------------------------

function LeadDetails({
  expected, setExpected, lead, onPick, onClear,
}: {
  expected: Expected;
  setExpected: React.Dispatch<React.SetStateAction<Expected>>;
  lead: Lead | null;
  onPick: (l: Lead) => void;
  onClear: () => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Lead[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(''); // the term the current results are for

  // A phone number is searched by its last 10 digits, so "+91 98450 12345" works.
  const term = useMemo(() => {
    const t = q.trim();
    const digits = t.replace(/\D/g, '');
    return digits.length >= 5 && /^[\d\s+()-]+$/.test(t) ? digits.slice(-10) : t;
  }, [q]);
  const isFullPhone = /^[6-9]\d{9}$/.test(term);

  useEffect(() => {
    if (term.length < 3) { setResults([]); setSearched(''); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      let found: Lead[] = [];
      try { found = await api.searchLeads(term, 8); } catch { found = []; }
      setResults(found);
      setSearched(term);
      setSearching(false);
      // Exactly one lead with this phone number: select it straight away.
      if (isFullPhone && found.length === 1) { onPick(found[0]); setQ(''); setResults([]); setSearched(''); }
    }, 350);
    return () => clearTimeout(t);
  }, [term, isFullPhone, onPick]);

  const set = (k: CompareField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setExpected((x) => ({ ...x, [k]: e.target.value }));

  const input = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400';
  const noMatch = !searching && searched === term && term.length >= 3 && results.length === 0;

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gray-900">1. Lead details <span className="font-normal text-gray-400">(optional)</span></p>
          <p className="text-xs text-gray-400">
            Enter the customer&apos;s phone number — if they are a lead, their details fill in and every document is matched against them.
            Leave empty to only compare the documents with each other.
          </p>
        </div>
        {(lead || Object.values(expected).some(Boolean)) && (
          <button onClick={onClear} className="text-xs font-semibold text-gray-500 hover:text-red-600 flex items-center gap-1 flex-shrink-0">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {lead ? (
        <div className="flex flex-wrap items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">{lead.name || 'Unnamed lead'}</p>
            <p className="text-xs text-gray-500">
              {lead.mobileNumber}{lead.service ? ` · ${lead.service}` : ''}{lead.orderId ? ` · ${lead.orderId}` : ''}{lead.status ? ` · ${lead.status}` : ''}
            </p>
            <p className="text-[11px] text-blue-700 mt-0.5">Lead found — documents are matched against these details. You can still edit them below.</p>
          </div>
          <button onClick={onClear} className="text-xs font-semibold text-blue-700 hover:text-blue-900 px-3 py-1.5 rounded-lg border border-blue-200 bg-white">
            Change lead
          </button>
        </div>
      ) : (
        <div className="relative">
          <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            inputMode="search"
            placeholder="Customer phone number (or name / order ID)…"
            className={`${input} pl-9 py-2.5`}
          />
          {searching && <Loader2 className="w-4 h-4 text-gray-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />}
          {results.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
              <p className="px-4 py-2 text-[11px] font-semibold text-gray-400 bg-gray-50">
                {results.length} lead{results.length > 1 ? 's' : ''} found — pick one
              </p>
              {results.map((l) => (
                <button
                  key={l.id}
                  onClick={() => { onPick(l); setQ(''); setResults([]); setSearched(''); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-0"
                >
                  <p className="text-sm font-semibold text-gray-900">{l.name || 'Unnamed lead'}</p>
                  <p className="text-xs text-gray-400">{l.mobileNumber} · {l.service}{l.date ? ` · ${l.date}` : ''}</p>
                </button>
              ))}
            </div>
          )}
          {noMatch && (
            <p className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2">
              <UserX className="w-3.5 h-3.5" />
              No lead found for “{q.trim()}”. Type the customer&apos;s details below, or leave them empty.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Field label="Full name"><input className={input} value={expected.name} onChange={set('name')} /></Field>
        <Field label="Father's name"><input className={input} value={expected.fatherName} onChange={set('fatherName')} /></Field>
        <Field label="Mother's name"><input className={input} value={expected.motherName} onChange={set('motherName')} /></Field>
        <Field label="Date of birth"><input className={input} value={expected.dob.length === 10 ? formatDob(expected.dob) : expected.dob} onChange={(e) => setExpected((x) => ({ ...x, dob: parseDate(e.target.value) || e.target.value }))} placeholder="DD/MM/YYYY" /></Field>
        <Field label="Gender">
          <select className={input} value={expected.gender} onChange={set('gender')}>
            <option value="">—</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="TRANSGENDER">Transgender</option>
          </select>
        </Field>
        <Field label="Phone"><input className={input} value={expected.phone} onChange={set('phone')} /></Field>
        <div className="sm:col-span-2">
          <Field label="Address"><textarea rows={1} className={input} value={expected.address} onChange={set('address')} /></Field>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</span>
      {children}
    </label>
  );
}

// Overall progress across every uploaded file.
function QueueProgress({ docs }: { docs: DocItem[] }) {
  const finished = docs.filter((d) => d.status === 'done' || d.status === 'error').length;
  const failed = docs.filter((d) => d.status === 'error').length;
  const current = docs.find((d) => d.status === 'reading');
  const pct = Math.round(((finished + (current?.progress ?? 0)) / docs.length) * 100);
  const allDone = finished === docs.length;

  return (
    <div className={`rounded-xl px-4 py-3 ${allDone ? 'bg-emerald-50' : 'bg-blue-50'}`}>
      <div className="flex items-center justify-between gap-3 text-xs font-semibold">
        <span className={`flex items-center gap-1.5 ${allDone ? 'text-emerald-700' : 'text-blue-700'}`}>
          {allDone ? <CheckCircle className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
          {allDone
            ? `All ${docs.length} document${docs.length > 1 ? 's' : ''} read${failed ? ` (${failed} failed)` : ''}`
            : `Reading ${Math.min(finished + 1, docs.length)} of ${docs.length}${current ? ` — ${current.file.name}` : ''}`}
        </span>
        <span className="text-gray-500">{pct}%</span>
      </div>
      {!allDone && (
        <div className="h-1.5 bg-white rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// One uploaded document
// ---------------------------------------------------------------------------

function DocCard({
  doc, onRemove, onType, onEdit, onLabel, onReread, onView,
}: {
  doc: DocItem;
  onRemove: () => void;
  onType: (t: DocType) => void;
  onEdit: (k: FieldKey, v: string) => void;
  onLabel: (v: string) => void;
  onReread: () => void;
  onView: () => void;
}) {
  const [showText, setShowText] = useState(false);
  const input = 'w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400';
  const info = DOC_TYPES[doc.type];
  const found = info.fields.filter((k) => doc.fields[k]).length;

  return (
    <div className="border border-gray-100 rounded-2xl p-4 space-y-3 bg-white">
      <div className="flex items-start gap-3">
        <button
          onClick={onView}
          disabled={!doc.previewUrl}
          className="relative w-20 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center group"
          title={doc.previewUrl ? 'View full image' : undefined}
        >
          {doc.previewUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={doc.previewUrl} alt="" className="w-full h-full object-cover" />
              <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Maximize2 className="w-4 h-4 text-white" />
              </span>
            </>
          ) : (
            <span className="text-[10px] font-bold text-gray-400">PDF</span>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate" title={doc.file.name}>{doc.file.name}</p>
          {doc.status === 'done' ? (
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <select
                value={doc.type}
                onChange={(e) => onType(e.target.value as DocType)}
                className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1"
                title="Document type — change it if wrong"
              >
                {DOC_TYPE_ORDER.map((t) => <option key={t} value={t}>{DOC_TYPES[t].label}</option>)}
              </select>
              <span className="text-[11px] text-gray-400">{found} of {info.fields.length} fields found</span>
            </div>
          ) : doc.status === 'error' ? (
            <p className="text-xs text-red-600 mt-1">{doc.error}</p>
          ) : (
            <div className="mt-1.5">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                {doc.forcedType ? `${DOC_TYPES[doc.forcedType].label} · ` : ''}{doc.stage}
                {doc.status === 'reading' && doc.progress > 0 ? ` ${Math.round(doc.progress * 100)}%` : ''}
              </div>
              <div className="h-1 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.round(doc.progress * 100)}%` }} />
              </div>
            </div>
          )}
        </div>
        <button onClick={onRemove} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50" title="Remove">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {doc.status === 'done' && (
        <>
          {doc.type === 'other' && (
            <label className="block">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Document name</span>
              <input className={input} value={doc.customLabel} onChange={(e) => onLabel(e.target.value)} placeholder="e.g. Bank passbook, Ration card, Degree certificate" />
            </label>
          )}
          <div className="grid grid-cols-2 gap-2">
            {info.fields.map((key) => {
              const label = key === 'idNumber' ? info.idLabel : FIELD_LABEL[key];
              const wide = key === 'address' || key === 'board' || key === 'school';
              const value = doc.fields[key];
              return (
                <label key={key} className={wide ? 'col-span-2' : ''}>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">{label}</span>
                  {key === 'address' ? (
                    <textarea rows={2} className={input} value={value} onChange={(e) => onEdit(key, e.target.value)} placeholder="Not found — type it in" />
                  ) : key === 'gender' ? (
                    <select className={input} value={value} onChange={(e) => onEdit(key, e.target.value)}>
                      <option value="">Not found</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="TRANSGENDER">Transgender</option>
                    </select>
                  ) : (
                    <input
                      className={`${input} ${value ? '' : 'bg-amber-50/50'}`}
                      value={DATE_FIELDS.has(key) ? formatDob(value) : value}
                      onChange={(e) => onEdit(key, DATE_FIELDS.has(key) ? (parseDate(e.target.value) || e.target.value) : e.target.value)}
                      placeholder={DATE_FIELDS.has(key) ? 'DD/MM/YYYY' : 'Not found — type it in'}
                    />
                  )}
                </label>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => setShowText((s) => !s)} className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1">
              {showText ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showText ? 'Hide' : 'Show'} text read from document
            </button>
            <div className="flex items-center gap-3">
              {doc.previewUrl && (
                <button onClick={onView} className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1" title="Select just the document, rotate it, and read it again">
                  <Crop className="w-3.5 h-3.5" /> Crop / rotate
                </button>
              )}
              <button onClick={onReread} className="text-xs font-semibold text-gray-500 hover:text-blue-700 flex items-center gap-1" title="Discard manual edits and fill the fields again from the text">
                <RotateCcw className="w-3.5 h-3.5" /> Reset fields
              </button>
            </div>
          </div>
          {showText && (
            <pre className="text-[11px] text-gray-600 bg-gray-50 rounded-lg p-3 max-h-56 overflow-auto whitespace-pre-wrap">
              {maskAadhaar(doc.text) || '(no text found)'}
            </pre>
          )}
        </>
      )}
    </div>
  );
}

// Never show a full 12-digit Aadhaar number, even in the raw OCR text.
function maskAadhaar(text: string): string {
  return text.replace(/\b\d{4}(\s?)\d{4}(\s?)(\d{4})\b/g, 'XXXX$1XXXX$2$3');
}

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });

const canvasToFile = (c: HTMLCanvasElement, name: string) =>
  new Promise<File>((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(new File([b], name, { type: 'image/png' })) : reject(new Error('Could not save image'))), 'image/png'));

// Full-size view of a document with a crop & rotate tool: drag a box around
// just the card (cutting out the table, fingers, other papers), rotate it
// upright, and read it again — the fix for photos the OCR can't make sense of.
function Viewer({ doc, onClose, onApply }: { doc: DocItem; onClose: () => void; onApply: (file: File) => void }) {
  const [src, setSrc] = useState(doc.previewUrl);
  const [sel, setSel] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragging = useRef(false);
  const made = useRef<string[]>([]); // object URLs this viewer created

  // Zoom: 100% = whole page fits the screen; up to 500% to read small print.
  const stageRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [fit, setFit] = useState(1);
  const [zoom, setZoom] = useState(1);
  const setZoomClamped = (z: number) => { setZoom(Math.min(5, Math.max(0.5, Math.round(z * 100) / 100))); setSel(null); };
  const measure = () => {
    const img = imgRef.current, stage = stageRef.current;
    if (!img || !stage || !img.naturalWidth) return;
    setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    setFit(Math.min((stage.clientWidth - 32) / img.naturalWidth, (stage.clientHeight - 16) / img.naturalHeight, 1));
  };
  useEffect(() => {
    // Ctrl + mouse wheel zooms (non-passive listener so the page itself doesn't zoom).
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom((z) => Math.min(5, Math.max(0.5, Math.round((z * (e.deltaY < 0 ? 1.15 : 1 / 1.15)) * 100) / 100)));
      setSel(null);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', measure);
    return () => { el.removeEventListener('wheel', onWheel); window.removeEventListener('resize', measure); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => () => made.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const point = (e: React.PointerEvent) => {
    const r = imgRef.current!.getBoundingClientRect();
    return { x: Math.min(Math.max(e.clientX - r.left, 0), r.width), y: Math.min(Math.max(e.clientY - r.top, 0), r.height) };
  };
  const box = sel && {
    left: Math.min(sel.x0, sel.x1), top: Math.min(sel.y0, sel.y1),
    width: Math.abs(sel.x1 - sel.x0), height: Math.abs(sel.y1 - sel.y0),
  };
  const hasBox = !!box && box.width > 12 && box.height > 12;

  const rotateBy = async (deg: 90 | -90) => {
    setBusy(true);
    try {
      const img = await loadImage(src);
      const c = document.createElement('canvas');
      c.width = img.naturalHeight;
      c.height = img.naturalWidth;
      const ctx = c.getContext('2d')!;
      ctx.translate(c.width / 2, c.height / 2);
      ctx.rotate((deg * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      const url = URL.createObjectURL(await canvasToFile(c, 'rotated.png'));
      made.current.push(url);
      setSrc(url);
      setSel(null);
    } finally { setBusy(false); }
  };

  const apply = async () => {
    setBusy(true);
    try {
      const img = await loadImage(src);
      const shown = imgRef.current!.getBoundingClientRect();
      const sx = img.naturalWidth / shown.width, sy = img.naturalHeight / shown.height;
      const r = hasBox
        ? { x: box!.left * sx, y: box!.top * sy, w: box!.width * sx, h: box!.height * sy }
        : { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
      const c = document.createElement('canvas');
      c.width = Math.round(r.w);
      c.height = Math.round(r.h);
      c.getContext('2d')!.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, c.width, c.height);
      const base = doc.file.name.replace(/\.[^.]+$/, '');
      onApply(await canvasToFile(c, `${base}-edited.png`));
    } finally { setBusy(false); }
  };

  const btn = 'flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-40';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <p className="text-xs text-white/70">
          Drag a box around just the document, rotate it upright if needed, then <b className="text-white">Read again</b>.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button className={btn} disabled={busy} onClick={() => rotateBy(-90)} title="Rotate left">
            <RotateCcw className="w-4 h-4" /> Rotate left
          </button>
          <button className={btn} disabled={busy} onClick={() => rotateBy(90)} title="Rotate right">
            <RotateCw className="w-4 h-4" /> Rotate right
          </button>
          <div className="flex items-center rounded-xl bg-white/10 text-white">
            <button className="p-2 hover:bg-white/20 rounded-l-xl disabled:opacity-40" disabled={zoom <= 0.5} onClick={() => setZoomClamped(zoom / 1.25)} title="Zoom out">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <button className="p-2 hover:bg-white/20 disabled:opacity-40" disabled={zoom >= 5} onClick={() => setZoomClamped(zoom * 1.25)} title="Zoom in (or Ctrl + mouse wheel)">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button className="px-2.5 py-2 text-xs font-semibold hover:bg-white/20 rounded-r-xl" onClick={() => setZoomClamped(1)} title="Fit to screen">
              Fit
            </button>
          </div>
          {sel && <button className={btn} disabled={busy} onClick={() => setSel(null)}><X className="w-4 h-4" /> Clear box</button>}
          <button
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40"
            disabled={busy || (!hasBox && src === doc.previewUrl)}
            onClick={apply}
            title={hasBox ? 'Read only the selected part' : 'Read the rotated image'}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crop className="w-4 h-4" />}
            Read again{hasBox ? ' (selected part)' : ''}
          </button>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div ref={stageRef} className="flex-1 min-h-0 overflow-auto p-4 pt-0">
        <div
          className="relative select-none touch-none cursor-crosshair mx-auto w-fit"
          onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); dragging.current = true; const p = point(e); setSel({ x0: p.x, y0: p.y, x1: p.x, y1: p.y }); }}
          onPointerMove={(e) => { if (!dragging.current) return; const p = point(e); setSel((s) => (s ? { ...s, x1: p.x, y1: p.y } : s)); }}
          onPointerUp={() => { dragging.current = false; }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt={doc.file.name}
            draggable={false}
            onLoad={measure}
            className="block max-w-none rounded-lg"
            style={natural
              ? { width: Math.round(natural.w * fit * zoom), height: Math.round(natural.h * fit * zoom) }
              : { maxWidth: '92vw', maxHeight: '78vh' }}
          />
          {box && (
            <div
              className="absolute border-2 border-blue-400 bg-blue-400/10 pointer-events-none"
              style={{ left: box.left, top: box.top, width: box.width, height: box.height, boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comparison table
// ---------------------------------------------------------------------------

const STATUS_STYLE: Record<MatchStatus | 'reference', { cls: string; icon: React.ElementType; label: string }> = {
  match:     { cls: 'text-emerald-700 bg-emerald-50', icon: CheckCircle,   label: 'Match' },
  partial:   { cls: 'text-amber-700 bg-amber-50',     icon: AlertTriangle, label: 'Check' },
  mismatch:  { cls: 'text-red-700 bg-red-50',         icon: XCircle,       label: 'Mismatch' },
  missing:   { cls: 'text-gray-400 bg-gray-50',       icon: MinusCircle,   label: 'Not on doc' },
  reference: { cls: 'text-blue-700 bg-blue-50',       icon: ShieldCheck,   label: 'Reference' },
};

function Badge({ status, note }: { status: MatchStatus | 'reference'; note?: string }) {
  const s = STATUS_STYLE[status];
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.cls}`} title={note}>
      <Icon className="w-3 h-3 flex-shrink-0" />
      {s.label}{note ? ` · ${note}` : ''}
    </span>
  );
}

// Green ≥ 85%, amber ≥ 60%, red below; grey when nothing was compared.
function scoreTone(pct: number | undefined) {
  if (pct === undefined) return { bar: 'bg-gray-300', text: 'text-gray-400', soft: 'bg-gray-50' };
  if (pct >= 85) return { bar: 'bg-emerald-500', text: 'text-emerald-600', soft: 'bg-emerald-50/70' };
  if (pct >= 60) return { bar: 'bg-amber-500', text: 'text-amber-600', soft: 'bg-amber-50/70' };
  return { bar: 'bg-red-500', text: 'text-red-600', soft: 'bg-red-50/70' };
}

function ScoreBar({ pct, height = 'h-2' }: { pct: number | undefined; height?: string }) {
  return (
    <div className={`${height} bg-gray-100 rounded-full overflow-hidden`}>
      <div className={`h-full rounded-full transition-all duration-500 ${scoreTone(pct).bar}`} style={{ width: `${pct ?? 0}%` }} />
    </div>
  );
}

function displayValue(key: CompareField, v: string) {
  return key === 'dob' ? formatDob(parseDate(v) || v) : v;
}

// The whole comparison: column labels, one row per field, and percentages.
// Shared by the on-screen table and the PDF report.
function computeComparison(docs: DocItem[], expected: Expected) {
  // Column headings: "PAN Card", "Aadhaar Card (2)", custom names for "Other"…
  const seen: Record<string, number> = {};
  const all = docs.map(docLabel);
  const labels = all.map((l) => {
    seen[l] = (seen[l] || 0) + 1;
    return all.filter((x) => x === l).length > 1 ? `${l} (${seen[l]})` : l;
  });

  const rows = COMPARE_FIELDS.map(({ key, label, fn }) => {
    // Reference value: the lead's details if entered, else the most trusted document.
    let refValue = expected[key].trim();
    let refDoc: string | null = null;
    let refLabel = 'Lead';
    if (!refValue) {
      for (const t of REFERENCE_PRIORITY[key]) {
        const d = docs.find((x) => x.type === t && x.fields[key].trim());
        if (d) { refValue = d.fields[key]; refDoc = d.id; refLabel = labels[docs.indexOf(d)]; break; }
      }
    }

    const cells = docs.map((d) => {
      const printed = DOC_TYPES[d.type].fields.includes(key);
      const value = d.fields[key].trim();
      if (!value) return { value, printed, result: { status: 'missing' } as MatchResult, isRef: false };
      if (d.id === refDoc) return { value, printed, result: { status: 'match' } as MatchResult, isRef: true };
      if (!refValue) return { value, printed, result: { status: 'missing' } as MatchResult, isRef: false };
      return { value, printed, result: fn(refValue, value), isRef: false };
    });

    const compared = cells.filter((c) => c.value && !c.isRef).map((c) => c.result.status);
    const overall: MatchStatus = !refValue || !compared.length
      ? 'missing'
      : compared.includes('mismatch') ? 'mismatch'
      : compared.includes('partial') ? 'partial'
      : 'match';

    const hasAny = !!expected[key].trim() || cells.some((c) => c.value);
    return { key, label, refValue, refLabel, cells, overall, hasAny };
  }).filter((r) => r.hasAny);

  const tally = rows.reduce(
    (a, r) => ({ ...a, [r.overall]: (a[r.overall] || 0) + 1 }),
    {} as Partial<Record<MatchStatus, number>>,
  );
  const verdict: MatchStatus = tally.mismatch ? 'mismatch' : tally.partial ? 'partial' : tally.match ? 'match' : 'missing';
  const verdictText = {
    match: 'All available details match',
    partial: 'Mostly matching — some fields need a manual look',
    mismatch: 'Some details do not match',
    missing: 'Not enough data to compare yet',
  }[verdict];

  // Percentages: match = 1, check = ½, mismatch = 0, over every value that
  // was compared (the reference value itself and empty cells don't count).
  const scoreOf = (cells: { value: string; isRef: boolean; result: MatchResult }[]) => {
    const scored = cells.filter((c) => c.value && !c.isRef && c.result.status !== 'missing');
    if (!scored.length) return null;
    const pts = scored.reduce((s, c) => s + (c.result.status === 'match' ? 1 : c.result.status === 'partial' ? 0.5 : 0), 0);
    return { pct: Math.round((pts / scored.length) * 100), n: scored.length, matched: scored.filter((c) => c.result.status === 'match').length };
  };
  const total = scoreOf(rows.flatMap((r) => r.cells));
  const perDoc = docs.map((_, i) => scoreOf(rows.map((r) => r.cells[i])));
  const perField = rows.map((r) => scoreOf(r.cells));

  return { labels, rows, tally, verdict, verdictText, total, perDoc, perField };
}

type Comparison = ReturnType<typeof computeComparison>;

// PDF report (built in lib/docReport.ts)
async function downloadReport(cmp: Comparison, docs: DocItem[], expected: Expected, hasLead: boolean, lead: Lead | null) {
  let generatedBy = '';
  try { generatedBy = JSON.parse(localStorage.getItem('crm-auth') || '{}')?.name || ''; } catch { /* ignore */ }
  const { pdf, fileName } = await buildReportPdf({
    labels: cmp.labels,
    fileNames: docs.map((d) => d.file.name),
    rows: cmp.rows,
    total: cmp.total,
    perDoc: cmp.perDoc,
    perField: cmp.perField,
    verdictText: cmp.verdictText,
    expected,
    hasLead,
    lead,
    generatedBy,
  });
  pdf.save(fileName);
}

function Results({
  docs, expected, hasLead, reading, lead,
}: { docs: DocItem[]; expected: Expected; hasLead: boolean; reading: boolean; lead: Lead | null }) {
  const cmp = useMemo(() => computeComparison(docs, expected), [docs, expected]);
  const { labels, rows, tally, verdictText, total, perDoc, perField } = cmp;
  const [exporting, setExporting] = useState(false);

  const download = async () => {
    setExporting(true);
    try { await downloadReport(cmp, docs, expected, hasLead, lead); } finally { setExporting(false); }
  };

  const th = 'px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-400';

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Overall score */}
      <div className="p-5 border-b border-gray-50 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-gray-900">3. Result</p>
            <p className="text-xs text-gray-400">
              {hasLead ? 'Each document is compared with the lead details.' : 'No lead details — each field is compared with the most reliable document that has it.'}
              {reading && ' More documents are still being read…'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['match', 'partial', 'mismatch'] as const).map((s) => tally[s] ? (
              <span key={s} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[s].cls}`}>
                {tally[s]} field{tally[s]! > 1 ? 's' : ''} {s === 'match' ? 'matched' : s === 'partial' ? 'to check' : 'mismatched'}
              </span>
            ) : null)}
            <button
              onClick={download}
              disabled={exporting || reading}
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-black disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-2 rounded-xl"
              title={reading ? 'Wait until all documents are read' : 'Download this match report as a PDF'}
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Download PDF
            </button>
          </div>
        </div>

        <div className={`rounded-2xl p-4 ${scoreTone(total?.pct).soft}`}>
          <div className="flex items-end justify-between gap-3 mb-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Overall match</p>
              <p className={`text-sm font-semibold ${scoreTone(total?.pct).text}`}>{verdictText}</p>
            </div>
            <p className={`text-4xl font-extrabold tabular-nums ${scoreTone(total?.pct).text}`}>
              {total ? `${total.pct}%` : '—'}
            </p>
          </div>
          <ScoreBar pct={total?.pct} height="h-3" />
          {total && (
            <p className="text-[11px] text-gray-500 mt-2">
              {total.matched} of {total.n} compared values match exactly · “Check” counts as half
            </p>
          )}
        </div>

        {/* Per-document scores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {docs.map((d, i) => {
            const s = perDoc[i];
            return (
              <div key={d.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="text-xs font-bold text-gray-800 truncate" title={d.file.name}>{labels[i]}</p>
                  <p className={`text-sm font-extrabold tabular-nums ${scoreTone(s?.pct).text}`}>{s ? `${s.pct}%` : '—'}</p>
                </div>
                <ScoreBar pct={s?.pct} />
                <p className="text-[10px] text-gray-400 mt-1.5">
                  {s ? `${s.matched} of ${s.n} fields match` : 'Used as the reference'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className={`${th} w-36 sticky left-0 bg-gray-50 z-10`}>Field</th>
              <th className={`${th} w-40`}>Overall</th>
              {hasLead && <th className={`${th} min-w-[170px]`}>Lead</th>}
              {docs.map((d, i) => (
                <th key={d.id} className={`${th} min-w-[190px]`}>
                  <span className="block">{labels[i]}</span>
                  {perDoc[i] && (
                    <span className={`block text-[11px] normal-case tracking-normal mt-0.5 ${scoreTone(perDoc[i]!.pct).text}`}>
                      {perDoc[i]!.pct}% match
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={r.key} className="border-t border-gray-50 align-top">
                <td className="px-4 py-3 font-semibold text-gray-700 sticky left-0 bg-white z-10">{r.label}</td>
                <td className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge status={r.overall} />
                    {perField[ri] && (
                      <span className={`text-xs font-bold tabular-nums ${scoreTone(perField[ri]!.pct).text}`}>{perField[ri]!.pct}%</span>
                    )}
                  </div>
                  {perField[ri] && <ScoreBar pct={perField[ri]!.pct} height="h-1" />}
                  {!hasLead && r.refValue && <p className="text-[10px] text-gray-400">vs {r.refLabel}</p>}
                </td>
                {hasLead && (
                  <td className="px-4 py-3 text-gray-900">
                    {expected[r.key].trim() ? displayValue(r.key, expected[r.key]) : <span className="text-gray-300">—</span>}
                  </td>
                )}
                {r.cells.map((c, i) => (
                  <td key={docs[i].id} className="px-4 py-3 space-y-1">
                    {c.value ? (
                      <>
                        <p className="text-gray-900 break-words">{displayValue(r.key, c.value)}</p>
                        <Badge status={c.isRef ? 'reference' : c.result.status} note={c.result.note} />
                      </>
                    ) : c.printed ? (
                      <span className="text-[11px] text-amber-600">Not read — enter it on the card</span>
                    ) : (
                      <span className="text-[11px] text-gray-300">Not on this document</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
