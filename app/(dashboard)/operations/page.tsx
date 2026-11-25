'use client';

// Operations → Overview: how the backend team is doing for a month —
// completion %, cases and amount, per service and type, per team member,
// and the six-month trend.

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Loader2, Briefcase, ClipboardList, ArrowRight } from 'lucide-react';
import * as api from '@/lib/api';
import type { CaseStats } from '@/lib/types';
import { CASE_STATUS, SERVICE_TAB, rupees, thisMonth, monthLabel, pctTone } from '@/lib/opsConfig';
import OpsGate from '@/components/operations/OpsGate';
import BarChart from '@/components/dashboard/BarChart';

export default function OperationsOverviewPage() {
  return <OpsGate>{() => <Overview />}</OpsGate>;
}

const shiftMonth = (m: string, by: number) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1 + by, 1)).toISOString().slice(0, 7);
};

function Overview() {
  const [month, setMonth] = useState(thisMonth());
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    api.getCaseStats(month)
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load'))
      .finally(() => setLoading(false));
  }, [month]);

  const s = stats?.summary;
  const isCurrent = month === thisMonth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-sm shadow-teal-200">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Operations</h1>
            <p className="text-sm text-gray-400">Work after conversion — completion, amount and workload by month</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-gray-200 rounded-xl">
            <button onClick={() => setMonth(shiftMonth(month, -1))} className="p-2.5 hover:bg-gray-50 rounded-l-xl" title="Previous month"><ChevronLeft className="w-4 h-4" /></button>
            <span className="px-3 text-sm font-semibold text-gray-800 min-w-[130px] text-center">{monthLabel(month)}</span>
            <button onClick={() => setMonth(shiftMonth(month, 1))} disabled={isCurrent} className="p-2.5 hover:bg-gray-50 rounded-r-xl disabled:opacity-30" title="Next month"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <Link href={`/operations/cases?month=${month}`} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm shadow-blue-200">
            <ClipboardList className="w-4 h-4" /> Open cases
          </Link>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
      {loading && !stats && <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div>}

      {stats && s && (
        <>
          {/* Completion hero */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Completion · {monthLabel(month)}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {s.completed} of {s.total - s.cancelled} active cases completed{s.cancelled ? ` · ${s.cancelled} cancelled (not counted)` : ''}
                </p>
              </div>
              <p className={`text-5xl font-extrabold tabular-nums ${s.total ? pctTone(s.completionPct).text : 'text-gray-300'}`}>
                {s.total ? `${s.completionPct}%` : '—'}
              </p>
            </div>
            <div className="h-3.5 bg-gray-100 rounded-full overflow-hidden flex">
              {CASE_STATUS.map((st) => {
                const n = s.byStatus[st.key] || 0;
                return n ? <div key={st.key} title={`${st.label}: ${n}`} style={{ width: `${(n / s.total) * 100}%`, background: st.dot }} /> : null;
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
              {CASE_STATUS.map((st) => (
                <Link key={st.key} href={`/operations/cases?month=${month}&status=${st.key}`} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: st.dot }} />
                  {st.short} <b className="tabular-nums">{s.byStatus[st.key] || 0}</b>
                </Link>
              ))}
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Kpi label="Cases this month" value={String(s.total)} sub={`${s.open} still open`} from="from-blue-500" to="to-blue-600" />
            <Kpi label="Completed" value={String(s.completed)} sub={rupees(s.completedAmount) + ' done'} from="from-emerald-500" to="to-emerald-600" />
            <Kpi label="Amount" value={rupees(s.amount)} sub="incl. extra / govt fees" from="from-violet-500" to="to-violet-600" />
            <Link href="/operations/cases?status=open" className="block">
              <Kpi label="Open backlog" value={String(stats.backlog)} sub="all months · view →" from="from-amber-500" to="to-amber-600" />
            </Link>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
            {/* By service */}
            <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <p className="text-sm font-bold text-gray-900">By service & type</p>
                <p className="text-xs text-gray-400">Click a service to see its types</p>
              </div>
              {!stats.byService.length ? (
                <p className="px-5 py-10 text-sm text-gray-400 text-center">No cases in {monthLabel(month)}.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-gray-400 bg-gray-50">
                      <th className="px-4 py-2.5">Service</th>
                      <th className="px-3 py-2.5 text-right">Cases</th>
                      <th className="px-3 py-2.5 text-right">Done</th>
                      <th className="px-3 py-2.5 w-[30%]">Completion</th>
                      <th className="px-4 py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byService.map((row) => {
                      const expanded = open === row.service;
                      return (
                        <Fragment key={row.service}>
                          <tr onClick={() => setOpen(expanded ? null : row.service)} className="border-t border-gray-50 hover:bg-gray-50/70 cursor-pointer">
                            <td className="px-4 py-3 font-semibold text-gray-800">
                              <span className="inline-flex items-center gap-1.5">
                                {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                                {SERVICE_TAB[row.service] ?? row.service}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">{row.total}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{row.completed}</td>
                            <td className="px-3 py-3"><PctBar pct={row.completionPct} /></td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums">{rupees(row.amount)}</td>
                          </tr>
                          {expanded && (
                            <>
                              {row.byType.map((t) => (
                                <tr key={t.type} className="bg-gray-50/60 text-xs">
                                  <td className="pl-10 pr-4 py-2 text-gray-600">{t.type}</td>
                                  <td className="px-3 py-2 text-right tabular-nums">{t.total}</td>
                                  <td className="px-3 py-2 text-right tabular-nums">{t.completed}</td>
                                  <td className="px-3 py-2"><PctBar pct={t.completionPct} small /></td>
                                  <td className="px-4 py-2 text-right tabular-nums">{rupees(t.amount)}</td>
                                </tr>
                              ))}
                              <tr className="bg-gray-50/60">
                                <td colSpan={5} className="pl-10 pr-4 py-2">
                                  <Link href={`/operations/cases?month=${month}&service=${encodeURIComponent(row.service)}`} className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1">
                                    Open {SERVICE_TAB[row.service] ?? row.service} cases <ArrowRight className="w-3 h-3" />
                                  </Link>
                                </td>
                              </tr>
                            </>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* By team member */}
            <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <p className="text-sm font-bold text-gray-900">By team member</p>
                <p className="text-xs text-gray-400">Cases handled this month</p>
              </div>
              {!stats.byHandler.length ? (
                <p className="px-5 py-10 text-sm text-gray-400 text-center">Nothing assigned yet.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {stats.byHandler.map((h) => (
                    <div key={h.handledBy} className="px-5 py-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className={`font-semibold ${h.handledBy === 'Not set' ? 'text-amber-600' : 'text-gray-800'}`}>{h.handledBy === 'Not set' ? 'Unassigned' : h.handledBy}</span>
                        <span className="text-xs text-gray-500 tabular-nums">{h.completed}/{h.total} · {rupees(h.amount)}</span>
                      </div>
                      <div className="mt-1.5"><PctBar pct={h.completionPct} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Trend */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <p className="text-sm font-bold text-gray-900">Last 6 months</p>
                <p className="text-xs text-gray-400">Cases started each month (hover for completion and amount)</p>
              </div>
            </div>
            <BarChart
              data={stats.trend.map((t) => ({
                label: monthLabel(t.month, false).split(' ')[0],
                value: t.total,
                tip: `${monthLabel(t.month)}: ${t.total} cases · ${t.completionPct}% done · ${rupees(t.amount)}`,
              }))}
            />
            <div className="grid grid-cols-6 gap-1 mt-3">
              {stats.trend.map((t) => (
                <div key={t.month} className="text-center">
                  <p className={`text-xs font-bold tabular-nums ${t.total ? pctTone(t.completionPct).text : 'text-gray-300'}`}>{t.total ? `${t.completionPct}%` : '—'}</p>
                  <p className="text-[10px] text-gray-400">{rupees(t.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, from, to }: { label: string; value: string; sub: string; from: string; to: string }) {
  return (
    <div className={`bg-gradient-to-br ${from} ${to} rounded-2xl p-4 sm:p-5 text-white shadow-sm h-full`}>
      <p className="text-white/80 text-[10px] sm:text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold mt-1 tabular-nums">{value}</p>
      <p className="text-white/80 text-[11px] mt-1">{sub}</p>
    </div>
  );
}

function PctBar({ pct, small }: { pct: number; small?: boolean }) {
  const t = pctTone(pct);
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 ${small ? 'h-1.5' : 'h-2'} bg-gray-100 rounded-full overflow-hidden`}>
        <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold tabular-nums w-9 text-right ${t.text}`}>{pct}%</span>
    </div>
  );
}
