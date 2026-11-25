'use client';

// Converted leads that don't have an operations case yet (for example leads
// converted before the Operations module existed). One click hands a lead
// over: the case is created pre-filled from the lead and opened for editing.

import { useEffect, useState } from 'react';
import { X, Search, Loader2, CheckCircle, ArrowRight } from 'lucide-react';
import * as api from '@/lib/api';
import type { OpsCase } from '@/lib/types';
import { rupees } from '@/lib/opsConfig';

export default function HandoverModal({ onClose, onCreated, onBulkDone }: {
  onClose: () => void;
  onCreated: (c: OpsCase) => void;
  onBulkDone: (created: number) => void;
}) {
  const [bulkBusy, setBulkBusy] = useState(false);
  const [q, setQ] = useState('');
  const [leads, setLeads] = useState<api.PendingLead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await api.listPendingLeads(q.trim());
        setLeads(r.leads);
        setTotal(r.total);
        setError('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load converted leads');
      }
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handOver = async (id: string) => {
    setBusyId(id);
    try {
      onCreated(await api.createCaseFromLead(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the case');
      setBusyId('');
    }
  };

  const handOverAll = async () => {
    if (!window.confirm(`Create operations cases for all ${total} waiting converted lead${total > 1 ? 's' : ''}? Each case is dated when its lead converted.`)) return;
    setBulkBusy(true);
    setError('');
    try {
      const r = await api.handOverAllPending();
      onBulkDone(r.created);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not hand over the leads');
      setBulkBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-6">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-base font-bold text-gray-900">Hand over a converted lead</p>
            <p className="text-xs text-gray-400">
              Leads marked Converted become cases automatically. These converted leads don&apos;t have a case yet.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100" title="Close"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="px-5 pt-4">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search converted leads by name, phone or order ID…"
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
            />
          </div>
          {!loading && total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
              <p className="text-xs text-gray-400">{total} converted lead{total > 1 ? 's' : ''} waiting{total > leads.length ? ` · showing the latest ${leads.length}` : ''}</p>
              {!q && (
                <button
                  onClick={handOverAll}
                  disabled={bulkBusy || !!busyId}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 px-3 py-1.5 rounded-lg"
                >
                  {bulkBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  {bulkBusy ? 'Handing over…' : `Hand over all ${total}`}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 max-h-[60vh] overflow-y-auto">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-2">{error}</p>}
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-blue-600 animate-spin" /></div>
          ) : !leads.length ? (
            <div className="text-center py-10">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-800">{q ? 'No matching converted lead' : 'Every converted lead is already with operations'}</p>
              <p className="text-xs text-gray-400 mt-1">Mark a lead as Converted in the pipeline and its case appears automatically.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {leads.map((l) => (
                <div key={l.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{l.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {l.mobileNumber} · {l.service}{l.city ? ` · ${l.city}` : ''}{l.amount ? ` · ${rupees(l.amount)}` : ''}
                      {l.convertedAt ? ` · converted ${new Date(l.convertedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handOver(l.id)}
                    disabled={!!busyId}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-2 rounded-xl whitespace-nowrap"
                  >
                    {busyId === l.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    Create case
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
