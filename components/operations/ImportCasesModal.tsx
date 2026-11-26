'use client';

// Import the team's existing Google Sheet tabs (PASSPORT, PAN CARD, …) as cases.
// Google Sheets: open the tab -> File -> Download -> Comma-separated values (.csv).

import { useEffect, useMemo, useState } from 'react';
import { X, Upload, Loader2, CheckCircle, AlertTriangle, FileSpreadsheet, Download } from 'lucide-react';
import * as api from '@/lib/api';
import { parseCsv } from '@/lib/csv';
import { IMPORT_FIELDS, sampleCsv, guessMapping, looksLikeHeader, rowToCase, type ImportField, type Mapping } from '@/lib/caseImport';
import { OPS_SERVICES, rupees, statusInfo } from '@/lib/opsConfig';

export default function ImportCasesModal({ defaultService, onClose, onDone }: {
  defaultService: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [service, setService] = useState(defaultService);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<string[][]>([]);
  const [hasHeader, setHasHeader] = useState(false);
  const [map, setMap] = useState<Mapping>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<api.ImportResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const load = (text: string, name: string) => {
    const r = parseCsv(text);
    if (!r.length) { setError('No rows found in that file.'); return; }
    const header = looksLikeHeader(r[0]);
    setRows(r);
    setHasHeader(header);
    setMap(guessMapping(r, header));
    setFileName(name);
    setResult(null);
    setError('');
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    if (!/\.csv$/i.test(f.name) && f.type !== 'text/csv') {
      setError('Please choose a .csv file (Google Sheets: File → Download → Comma-separated values).');
      return;
    }
    load(await f.text(), f.name);
  };

  const downloadSample = () => {
    // Byte-order mark so Excel opens it as UTF-8.
    const blob = new Blob([String.fromCharCode(0xfeff) + sampleCsv(service)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sample-${service.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const toggleHeader = (v: boolean) => { setHasHeader(v); setMap(guessMapping(rows, v)); };

  const dataRows = useMemo(() => (hasHeader ? rows.slice(1) : rows), [rows, hasHeader]);
  const cases = useMemo(() => dataRows.map((r) => rowToCase(r, map, service)), [dataRows, map, service]);
  const valid = cases.filter((c) => c.name);
  const width = Math.max(...rows.slice(0, 20).map((r) => r.length), 0);
  const colLabel = (i: number) => {
    const sample = (hasHeader ? rows[0][i] : dataRows[0]?.[i]) || '';
    return `Column ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''}${sample ? ` — ${sample.slice(0, 22)}` : ''}`;
  };

  const runImport = async () => {
    setBusy(true);
    setError('');
    try {
      let by = 'Import';
      try { by = `Import by ${JSON.parse(localStorage.getItem('crm-auth') || '{}')?.name || 'admin'}`; } catch { /* ignore */ }
      setResult(await api.importCases(valid, by));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const ctl = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-blue-400';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl my-6">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-base font-bold text-gray-900">Import from your sheet</p>
            <p className="text-xs text-gray-400">
              In Google Sheets open one tab (e.g. PASSPORT) → <b>File → Download → Comma-separated values (.csv)</b>, then choose that file here. Repeat for each tab.
              Rows for a customer who is already a converted lead (same mobile + service) are linked to that lead — no second case.
            </p>
            <button onClick={downloadSample} className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800">
              <Download className="w-3.5 h-3.5" /> Download {service} sample CSV
            </button>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100" title="Close"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[74vh] overflow-y-auto">
          {result ? (
            <div className="text-center py-8">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <p className="text-lg font-bold text-gray-900">{result.created + (result.linked || 0)} case{result.created + (result.linked || 0) === 1 ? '' : 's'} imported</p>
              <p className="text-sm text-gray-500 mt-1">
                {result.linked ? `${result.linked} matched a converted lead and were linked to it (no longer waiting for handover). ` : ''}
                {result.merged ? `${result.merged} already had a case from their lead — missing details were filled in, no new case. ` : ''}
                {result.duplicates ? `${result.duplicates} already existed and were skipped. ` : ''}
                {result.errors.length ? `${result.errors.length} row(s) could not be imported.` : ''}
              </p>
              {result.errors.length > 0 && (
                <ul className="text-xs text-left text-red-600 bg-red-50 rounded-lg p-3 mt-3 max-h-40 overflow-auto">
                  {result.errors.slice(0, 50).map((e) => <li key={e.row}>Row {e.row}: {e.reason}</li>)}
                </ul>
              )}
              <div className="flex justify-center gap-2 mt-5">
                <button onClick={() => { setResult(null); setRows([]); setFileName(''); }} className="text-sm font-semibold text-gray-600 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Import another tab</button>
                <button onClick={onDone} className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl">Done</button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-xs font-semibold text-gray-500 mb-1">This file is the tab for</span>
                  <select className={ctl} value={service} onChange={(e) => setService(e.target.value)}>
                    {OPS_SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label
                  className="flex items-center gap-3 border-2 border-dashed border-gray-200 hover:border-blue-300 rounded-xl px-4 py-2.5 cursor-pointer self-end"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
                >
                  {fileName ? <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> : <Upload className="w-5 h-5 text-gray-400" />}
                  <span className="text-sm text-gray-600 truncate">{fileName ? `${fileName} · ${dataRows.length} rows` : 'Choose or drop the .csv file'}</span>
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
                </label>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              {rows.length > 0 && (
                <>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={hasHeader} onChange={(e) => toggleHeader(e.target.checked)} />
                    First row has the column names
                  </label>

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Match the columns</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {IMPORT_FIELDS.map((f) => (
                        <label key={f.key} className="block">
                          <span className="block text-[11px] font-semibold text-gray-500 mb-0.5">{f.label}</span>
                          <select
                            className={`${ctl} py-1.5 ${map[f.key] === undefined || map[f.key]! < 0 ? 'text-gray-400' : ''}`}
                            value={map[f.key] ?? -1}
                            onChange={(e) => setMap((m) => ({ ...m, [f.key as ImportField]: Number(e.target.value) }))}
                          >
                            <option value={-1}>— not in this sheet —</option>
                            {Array.from({ length: width }, (_, i) => <option key={i} value={i}>{colLabel(i)}</option>)}
                          </select>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                      Preview — {valid.length} of {cases.length} rows will be imported
                      {cases.length - valid.length > 0 && <span className="normal-case tracking-normal font-normal text-amber-600"> ({cases.length - valid.length} without a name are skipped)</span>}
                    </p>
                    <div className="overflow-x-auto border border-gray-100 rounded-xl">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-400">
                            <th className="px-2 py-2">Date</th><th className="px-2 py-2">Name</th><th className="px-2 py-2">Phone</th>
                            <th className="px-2 py-2">Type</th><th className="px-2 py-2">Handled by</th><th className="px-2 py-2">Status</th>
                            <th className="px-2 py-2">Login</th><th className="px-2 py-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {valid.slice(0, 6).map((c, i) => (
                            <tr key={i} className="border-t border-gray-50">
                              <td className="px-2 py-1.5 whitespace-nowrap">{c.date || <span className="text-amber-600">today</span>}</td>
                              <td className="px-2 py-1.5 font-semibold">{c.name}</td>
                              <td className="px-2 py-1.5">{c.phone}</td>
                              <td className="px-2 py-1.5">{[c.appType, c.scheme, c.category].filter(Boolean).join(' · ')}</td>
                              <td className="px-2 py-1.5">{c.handledBy}</td>
                              <td className="px-2 py-1.5"><span className={`px-1.5 py-0.5 rounded ${statusInfo(c.status || 'new').cls}`}>{statusInfo(c.status || 'new').short}</span></td>
                              <td className="px-2 py-1.5">{c.portalLoginId}{c.portalPassword ? ' · ••••' : ''}</td>
                              <td className="px-2 py-1.5 text-right whitespace-nowrap">{rupees((c.amount || 0) + (c.extraAmount || 0))}{c.extraAmount ? ` (${c.amount}+${c.extraAmount})` : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {map.name === undefined && (
                      <p className="flex items-center gap-1.5 text-xs text-amber-700 mt-2"><AlertTriangle className="w-3.5 h-3.5" /> Pick which column has the customer name.</p>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {!result && (
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100">
            <p className="text-[11px] text-gray-400">Importing the same file twice is safe — rows already imported are skipped.</p>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="text-sm font-semibold text-gray-600 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Cancel</button>
              <button
                onClick={runImport}
                disabled={busy || !valid.length}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Import {valid.length || ''} case{valid.length === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
