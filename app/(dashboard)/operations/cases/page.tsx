'use client';

// Operations → Cases: the backend team's working sheet inside the CRM.
// One tab per service (like the Google Sheet tabs), filters, inline status
// changes, editing and CSV export. Cases only come from converted leads
// (automatically, or "Hand over lead" for older ones) or a sheet import.

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Loader2, Download, ArrowLeft, ClipboardList, RefreshCw, Upload, UserCheck, ArrowRight, Pencil, Copy, Check, Eye } from 'lucide-react';
import * as api from '@/lib/api';
import type { OpsCase, CaseStatus } from '@/lib/types';
import {
  CASE_STATUS, OPS_SERVICES, SERVICE_TAB, statusInfo, rupees, thisMonth, monthLabel, pctTone, isAutoCompleteCase,
} from '@/lib/opsConfig';
import OpsGate from '@/components/operations/OpsGate';
import CaseEditor from '@/components/operations/CaseEditor';
import HandoverModal from '@/components/operations/HandoverModal';
import ImportCasesModal from '@/components/operations/ImportCasesModal';

export default function CasesPage() {
  return (
    <OpsGate>
      {(role) => (
        <Suspense fallback={null}>
          <Cases isAdmin={role === 'admin'} />
        </Suspense>
      )}
    </OpsGate>
  );
}

const fmtDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' }) : '';
// 26/11/2026 — full date, like the sheet.
const fmtDay = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '';
const fmtYmd = (ymd: string) => {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
};

function Cases({ isAdmin }: { isAdmin: boolean }) {
  const sp = useSearchParams();
  // ?q= (from a lead page) searches every month for that customer.
  const initialQ = sp.get('q') ?? '';
  const [month, setMonth] = useState(sp.get('month') ?? (initialQ ? '' : thisMonth()));
  const [tab, setTab] = useState(sp.get('service') ?? '');
  const [status, setStatus] = useState(sp.get('status') ?? '');
  const [handledBy, setHandledBy] = useState('');
  const [q, setQ] = useState(initialQ);
  const [search, setSearch] = useState(initialQ);
  const [rows, setRows] = useState<OpsCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [team, setTeam] = useState<string[]>([]);
  const [editing, setEditing] = useState<OpsCase | null>(null);
  const [showHandover, setShowHandover] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [pending, setPending] = useState(0); // converted leads without a case

  const loadPending = useCallback(() => {
    api.listPendingLeads().then((r) => setPending(r.total)).catch(() => setPending(0));
  }, []);
  useEffect(() => { loadPending(); }, [loadPending]);

  // Debounce the search box.
  useEffect(() => { const t = setTimeout(() => setSearch(q.trim()), 300); return () => clearTimeout(t); }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // "open" = everything not completed/cancelled, from any month.
      const open = status === 'open';
      setRows(await api.listCases({ month: open ? '' : month, status: open ? '' : status, open, handledBy, search }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load cases');
    } finally {
      setLoading(false);
    }
  }, [month, status, handledBy, search]);

  useEffect(() => { load(); }, [load]);

  // Team names for "Handled by": all active team members.
  useEffect(() => {
    api.listUsers()
      .then((us) => setTeam(us.filter((u) => u.status !== 'inactive').map((u) => u.name.toUpperCase())))
      .catch(() => setTeam([]));
  }, []);
  const teamOptions = useMemo(
    () => [...new Set([...team, ...rows.map((r) => r.handledBy).filter(Boolean)])].sort(),
    [team, rows],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach((r) => { c[r.service] = (c[r.service] || 0) + 1; });
    return c;
  }, [rows]);
  const tabs = OPS_SERVICES.filter((s) => counts[s] || s === tab || ['Passport', 'PAN Card', 'Police Verification Certificate (PVC)', 'Senior Citizen Card', 'Affidavits / Annexure', 'Complaint Copy'].includes(s));
  const visible = tab ? rows.filter((r) => r.service === tab) : rows;
  // PAN Card has no category, portal login/password or appointment — hide those columns.
  const panTab = tab === 'PAN Card';
  // Oldest first, like the sheet, so Sl No runs 1, 2, 3 … down the page.
  const sorted = useMemo(
    () => [...visible].sort((a, b) => String(a.date).localeCompare(String(b.date)) || a.caseNo - b.caseNo),
    [visible],
  );

  // Pagination — back to page 1 whenever the filters or tab change.
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => { setPage(1); }, [tab, month, status, handledBy, search, pageSize]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const offset = (safePage - 1) * pageSize;

  const sum = useMemo(() => {
    const completed = visible.filter((r) => r.status === 'completed').length;
    const cancelled = visible.filter((r) => r.status === 'cancelled').length;
    const live = visible.length - cancelled;
    const done = visible.filter((r) => r.status === 'completed');
    const mmd = (list: OpsCase[]) => list.reduce((s, r) => s + (r.amount || 0), 0);
    const govt = (list: OpsCase[]) => list.reduce((s, r) => s + (r.extraAmount || 0), 0);
    return {
      total: visible.length, completed,
      pct: live ? Math.round((completed / live) * 100) : 0,
      mmd: mmd(visible), govt: govt(visible),
      doneMmd: mmd(done), doneGovt: govt(done),
    };
  }, [visible]);

  const changeStatus = async (c: OpsCase, s: CaseStatus) => {
    setRows((rs) => rs.map((r) => (r.id === c.id ? { ...r, status: s } : r)));
    try {
      const saved = await api.updateCase(c.id, { status: s });
      setRows((rs) => rs.map((r) => (r.id === c.id ? saved : r)));
    } catch {
      setRows((rs) => rs.map((r) => (r.id === c.id ? c : r)));
      window.alert('Could not update the status — please try again.');
    }
  };

  const exportCsv = () => {
    const head = ['Sl No', 'Date', 'Service', 'Type', 'Scheme', 'Category', 'Source', 'City', 'Handled by', 'Name', 'Mobile', 'Email', 'Status', 'Portal login ID', 'Appointment', 'Ack / application no', 'MMD fee', 'Govt fee', 'Total', 'Payment mode', 'Remarks'];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = sorted.map((r, i) => [
      i + 1, fmtDay(r.date), r.service, r.appType, r.scheme, r.category, r.source, r.city, r.handledBy, r.name, r.phone, r.email,
      statusInfo(r.status).label, r.portalLoginId, fmtYmd(r.appointmentDate), r.applicationNo, r.amount, r.extraAmount,
      (r.amount || 0) + (r.extraAmount || 0), r.paymentMode, r.remarks,
    ].map(esc).join(','));
    const blob = new Blob(['﻿' + [head.map(esc).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `operations-${(tab ? SERVICE_TAB[tab] ?? tab : 'all').replace(/\W+/g, '-')}-${status === 'open' ? 'open' : month || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onSaved = (c: OpsCase) => {
    setRows((rs) => (rs.some((r) => r.id === c.id) ? rs.map((r) => (r.id === c.id ? c : r)) : [c, ...rs]));
    setEditing(null);
  };

  const ctl = 'px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-blue-400';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/operations" className="p-2 rounded-xl border border-gray-200 hover:bg-white" title="Operations overview">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-sm shadow-teal-200">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Operations cases</h1>
            <p className="text-sm text-gray-400">Converted leads land here automatically — track each one to completion</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} disabled={!visible.length} className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50">
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50" title="Import your existing Google Sheet tabs">
            <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Import sheet</span>
          </button>
          <button onClick={() => setShowHandover(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm shadow-blue-200">
            <UserCheck className="w-4 h-4" /> Hand over lead
            {pending > 0 && <span className="bg-white/25 text-[11px] px-1.5 rounded-full">{pending}</span>}
          </button>
        </div>
      </div>

      {/* How cases arrive */}
      {pending > 0 ? (
        <button onClick={() => setShowHandover(true)} className="w-full flex items-center gap-3 text-left bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 hover:bg-amber-100/60">
          <UserCheck className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span className="flex-1 text-sm text-amber-800">
            <b>{pending} converted lead{pending > 1 ? 's are' : ' is'} waiting</b> to be handed over to operations (converted before this module, or not picked up yet).
          </span>
          <ArrowRight className="w-4 h-4 text-amber-600" />
        </button>
      ) : null}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-2">
        <input type="month" className={ctl} value={month} onChange={(e) => setMonth(e.target.value)} disabled={status === 'open'} title="Month the case started" />
        {month && status !== 'open' && <button onClick={() => setMonth('')} className="text-xs font-semibold text-gray-500 hover:text-gray-800">All months</button>}
        <select className={ctl} value={tab} onChange={(e) => setTab(e.target.value)} title="Service">
          <option value="">All services</option>
          {OPS_SERVICES.map((s) => <option key={s} value={s}>{s}{counts[s] ? ` (${counts[s]})` : ''}</option>)}
        </select>
        <select className={ctl} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="open">Open (any month)</option>
          {CASE_STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select className={ctl} value={handledBy} onChange={(e) => setHandledBy(e.target.value)}>
          <option value="">Whole team</option>
          {teamOptions.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input className={`${ctl} w-full pl-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone, email, application no…" />
        </div>
        <button onClick={load} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50" title="Refresh"><RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      {/* Service tabs — like the sheet's tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[['', 'All'] as const, ...tabs.map((s) => [s, SERVICE_TAB[s] ?? s] as const)].map(([key, label]) => {
          const n = key ? counts[key] || 0 : rows.length;
          const active = tab === key;
          return (
            <button
              key={key || 'all'}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold px-3.5 py-2 rounded-xl border transition-colors ${
                active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
              }`}
            >
              {label}
              <span className={`text-[11px] px-1.5 rounded-full ${active ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>{n}</span>
            </button>
          );
        })}
      </div>

      {/* Summary of what's shown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label={status === 'open' ? 'Open cases' : month ? `Cases · ${monthLabel(month, false)}` : 'Cases'} value={String(sum.total)} />
        <Stat
          label="Completed"
          value={String(sum.completed)}
          lines={[`Govt fee ${rupees(sum.doneGovt)}`, `MMD fee ${rupees(sum.doneMmd)}`, `Total ${rupees(sum.doneGovt + sum.doneMmd)}`]}
        />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Completion</p>
          <p className={`text-2xl font-extrabold ${pctTone(sum.pct).text}`}>{sum.total ? `${sum.pct}%` : '—'}</p>
          <div className="h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden"><div className={`h-full ${pctTone(sum.pct).bar}`} style={{ width: `${sum.pct}%` }} /></div>
        </div>
        <Stat
          label="Total amount"
          value={rupees(sum.govt + sum.mmd)}
          lines={[`Govt fee ${rupees(sum.govt)}`, `MMD fee ${rupees(sum.mmd)}`]}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {error ? (
          <p className="p-6 text-sm text-red-600">{error}</p>
        ) : loading && !rows.length ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div>
        ) : !visible.length ? (
          <div className="text-center py-14">
            <p className="text-sm font-semibold text-gray-700">No cases here yet</p>
            <p className="text-xs text-gray-400 mt-1">Leads marked Converted appear here automatically. Older work: use “Import sheet”.</p>
          </div>
        ) : (
          // Sheet-style: one column per field, oldest first with Sl. No 1…N,
          // text selectable, copy buttons on the fields people paste elsewhere.
          // Edit with the pencil at the end of the row.
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] select-text">
              <thead>
                <tr className="bg-gray-50 text-left text-[10px] font-bold uppercase tracking-wide text-gray-400 whitespace-nowrap">
                  <th className="px-2.5 py-3">Sl No</th>
                  <th className="px-2.5 py-3">Date</th>
                  <th className="px-2.5 py-3">Source</th>
                  <th className="px-2.5 py-3">City</th>
                  <th className="px-2.5 py-3">Handled by</th>
                  <th className="px-2.5 py-3">Type</th>
                  {!panTab && <th className="px-2.5 py-3">Category</th>}
                  <th className="px-2.5 py-3 min-w-[170px]">Name</th>
                  <th className="px-2.5 py-3">Mobile</th>
                  <th className="px-2.5 py-3">Email</th>
                  <th className="px-2.5 py-3 min-w-[140px]">Status</th>
                  {!panTab && <th className="px-2.5 py-3">ID</th>}
                  {!panTab && <th className="px-2.5 py-3">Password</th>}
                  {!panTab && <th className="px-2.5 py-3">Appointment</th>}
                  <th className="px-2.5 py-3 text-right">Amount</th>
                  <th className="px-2.5 py-3">Mode</th>
                  <th className="px-2.5 py-3" />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => {
                  const st = statusInfo(r.status);
                  const td = 'px-2.5 py-2.5 align-top whitespace-nowrap';
                  return (
                    <tr key={r.id} className="border-t border-gray-50 hover:bg-blue-50/30">
                      <td className={`${td} text-gray-400 tabular-nums`}>{offset + i + 1}</td>
                      <td className={`${td} text-gray-600`}>{fmtDay(r.date)}</td>
                      <td className={`${td} text-gray-600`}>{r.source || '—'}</td>
                      <td className={`${td} text-gray-600`}>{r.city || '—'}</td>
                      <td className={`${td} font-semibold text-gray-700`}>{r.handledBy || <span className="text-amber-600 font-normal">Unassigned</span>}</td>
                      <td className={`${td} text-gray-700`}>
                        {r.appType || '—'}
                        {!tab && <span className="block text-[11px] text-gray-400">{SERVICE_TAB[r.service] ?? r.service}{r.scheme ? ` · ${r.scheme}` : ''}</span>}
                        {tab && r.scheme && <span className="block text-[11px] text-gray-400">{r.scheme}</span>}
                      </td>
                      {!panTab && <td className={`${td} text-gray-700`}>{r.category || '—'}</td>}
                      <td className="px-2.5 py-2.5 align-top font-semibold text-gray-900">
                        {r.name}
                        {r.applicationNo && <span className="block text-[11px] font-normal text-gray-400">Ack/App: <CopyCell value={r.applicationNo} /></span>}
                      </td>
                      <td className={td}><CopyCell value={r.phone} /></td>
                      <td className={td}><CopyCell value={r.email} /></td>
                      <td className={td}>
                        {isAutoCompleteCase(r) ? (
                          // PAN Card from a converted lead: completed automatically, not changeable.
                          <span className={`inline-block text-xs font-semibold rounded-lg px-2.5 py-1.5 ${statusInfo('completed').cls}`} title="PAN Card: completed when the lead converted">
                            {statusInfo('completed').short}
                          </span>
                        ) : (
                          <select
                            value={r.status}
                            onChange={(e) => changeStatus(r, e.target.value as CaseStatus)}
                            className={`text-xs font-semibold rounded-lg px-2 py-1.5 border-0 ${st.cls}`}
                          >
                            {CASE_STATUS.map((s) => <option key={s.key} value={s.key}>{s.short}</option>)}
                          </select>
                        )}
                      </td>
                      {!panTab && <td className={td}><CopyCell value={r.portalLoginId} /></td>}
                      {!panTab && <td className={td}><PasswordCell c={r} /></td>}
                      {!panTab && <td className={`${td} text-gray-600`}>{fmtYmd(r.appointmentDate) || '—'}</td>}
                      <td className={`${td} text-right`}>
                        <span className="font-semibold text-gray-900">{rupees((r.amount || 0) + (r.extraAmount || 0))}</span>
                        <span className="block text-[11px] text-gray-400">
                          {r.extraAmount ? `Govt ${rupees(r.extraAmount)} · MMD ${rupees(r.amount || 0)}` : `MMD ${rupees(r.amount || 0)}`}
                        </span>
                      </td>
                      <td className={`${td} text-gray-600`}>{r.paymentMode || '—'}</td>
                      <td className={td}>
                        <button onClick={() => setEditing(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50" title="Edit case">
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {sorted.length > 0 && (
          <Pager
            page={safePage}
            totalPages={totalPages}
            total={sorted.length}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={setPageSize}
          />
        )}
      </div>

      {showHandover && (
        <HandoverModal
          onClose={() => setShowHandover(false)}
          onCreated={(c) => {
            setShowHandover(false);
            setRows((rs) => [c, ...rs.filter((r) => r.id !== c.id)]);
            loadPending();
            setEditing(c); // straight into assigning it / filling the details
          }}
          onBulkDone={(created) => {
            setShowHandover(false);
            loadPending();
            setMonth(''); // old leads span many months — show them all
            load();
            window.alert(`${created} case${created === 1 ? '' : 's'} created from converted leads.`);
          }}
        />
      )}

      {showImport && (
        <ImportCasesModal
          defaultService={tab || 'Passport'}
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); load(); }}
        />
      )}

      {editing && (
        <CaseEditor
          initial={editing}
          team={teamOptions}
          canDelete={isAdmin}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
          onDeleted={(id) => { setRows((rs) => rs.filter((r) => r.id !== id)); setEditing(null); }}
        />
      )}
    </div>
  );
}

// Footer: "Showing 1–10 of 57", rows-per-page, and First / ‹ 1 2 3 … › / Last.
function Pager({ page, totalPages, total, pageSize, onPage, onPageSize }: {
  page: number; totalPages: number; total: number; pageSize: number;
  onPage: (p: number) => void; onPageSize: (n: number) => void;
}) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const nums: (number | 'gap')[] = [];
  if (totalPages <= 7) for (let i = 1; i <= totalPages; i++) nums.push(i);
  else {
    nums.push(1);
    if (page > 3) nums.push('gap');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) nums.push(i);
    if (page < totalPages - 2) nums.push('gap');
    nums.push(totalPages);
  }
  const btn = 'min-w-[34px] h-[34px] px-2 rounded-lg text-sm font-semibold flex items-center justify-center transition-colors';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span>Showing <b className="text-gray-800">{from}–{to}</b> of <b className="text-gray-800">{total}</b></span>
        <label className="flex items-center gap-1.5">
          <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white">
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </label>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button onClick={() => onPage(1)} disabled={page === 1} className={`${btn} text-gray-500 hover:bg-white disabled:opacity-30`} title="First page">«</button>
          <button onClick={() => onPage(page - 1)} disabled={page === 1} className={`${btn} text-gray-500 hover:bg-white disabled:opacity-30`} title="Previous">‹</button>
          {nums.map((n, i) => n === 'gap'
            ? <span key={`g${i}`} className="px-1 text-gray-400">…</span>
            : (
              <button key={n} onClick={() => onPage(n)} className={`${btn} ${n === page ? 'bg-blue-600 text-white shadow-sm shadow-blue-200' : 'text-gray-600 hover:bg-white border border-transparent hover:border-gray-200'}`}>
                {n}
              </button>
            ))}
          <button onClick={() => onPage(page + 1)} disabled={page === totalPages} className={`${btn} text-gray-500 hover:bg-white disabled:opacity-30`} title="Next">›</button>
          <button onClick={() => onPage(totalPages)} disabled={page === totalPages} className={`${btn} text-gray-500 hover:bg-white disabled:opacity-30`} title="Last page">»</button>
        </div>
      )}
    </div>
  );
}

// A value with a copy button (mobile, email, login ID, application no.).
function CopyCell({ value }: { value?: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="text-gray-300">—</span>;
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* ignore */ }
  };
  return (
    <span className="inline-flex items-center gap-1 group">
      <span className="text-gray-800 tabular-nums">{value}</span>
      <button onClick={copy} className="p-0.5 rounded text-gray-300 hover:text-blue-600 opacity-60 group-hover:opacity-100" title="Copy">
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </span>
  );
}

// Portal password: hidden until "show", then copyable.
function PasswordCell({ c }: { c: OpsCase }) {
  const [pw, setPw] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!c.hasPortalPassword) return <span className="text-gray-300">—</span>;
  if (pw !== null) return <CopyCell value={pw} />;
  return (
    <button
      onClick={async () => { setBusy(true); try { setPw(await api.getCasePassword(c.id)); } catch { setPw(''); } setBusy(false); }}
      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
      title="Show password"
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />} ••••••
    </button>
  );
}

function Stat({ label, value, lines }: { label: string; value: string; lines?: string[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-2xl font-extrabold text-gray-900 tabular-nums">{value}</p>
      {lines?.map((l) => <p key={l} className="text-[11px] text-gray-500 tabular-nums">{l}</p>)}
    </div>
  );
}
