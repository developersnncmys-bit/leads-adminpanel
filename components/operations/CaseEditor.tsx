'use client';

// Edit an operations case (cases come from converted leads or a sheet import). Mirrors the columns of the team's sheet,
// with dropdown suggestions that change per service (see lib/opsConfig.ts).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Loader2, Eye, EyeOff, Trash2, ExternalLink, KeyRound, Lock, MessageSquare } from 'lucide-react';
import * as api from '@/lib/api';
import type { Lead, OpsCase } from '@/lib/types';
import {
  CASE_STATUS, CASE_SOURCES, OPS_SERVICES, PAYMENT_MODES, rupees, serviceFields, isAutoCompleteCase, statusInfo,
} from '@/lib/opsConfig';
import { getSchema, resolveField } from '@/lib/formSchemas';

type Form = Omit<OpsCase, 'id' | 'caseNo' | 'hasPortalPassword' | 'createdAt' | 'updatedAt' | 'completedAt'>;

const todayIST = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const toDateInput = (iso?: string) =>
  iso ? new Date(new Date(iso).getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10) : todayIST();

const blank = (service: string): Form => ({
  date: todayIST(), service, serviceDetail: '', source: '', city: '', handledBy: '',
  appType: '', scheme: '', category: '', name: '', phone: '', email: '',
  status: 'new', portalLoginId: '', appointmentDate: '', applicationNo: '',
  amount: 0, extraAmount: 0, paymentMode: '', remarks: '', leadId: undefined, orderId: '',
});

export default function CaseEditor({
  initial, team, canDelete, onClose, onSaved, onDeleted,
}: {
  initial: OpsCase;
  team: string[];
  canDelete: boolean;
  onClose: () => void;
  onSaved: (c: OpsCase) => void;
  onDeleted: (id: string) => void;
}) {
  const [form, setForm] = useState<Form>(() => ({ ...blank(initial.service), ...initial, date: toDateInput(initial.date) }));
  const [newPassword, setNewPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [shownPassword, setShownPassword] = useState<string | null>(null);
  const [loadingPw, setLoadingPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fields = serviceFields(form.service);
  // Cases from a converted lead: handled-by and service come from the lead and
  // are locked; PAN Card cases are completed automatically and stay completed.
  const fromLead = !!initial.leadId;
  const autoDone = isAutoCompleteCase(initial);

  // PAN Card: show the full lead (all form details + comments) inside the case.
  const [lead, setLead] = useState<Lead | null>(null);
  const [leadLoading, setLeadLoading] = useState(false);
  useEffect(() => {
    if (!autoDone || !initial.leadId) return;
    let active = true;
    setLeadLoading(true);
    api.getLead(initial.leadId)
      .then((l) => { if (active) setLead(l); })
      .catch(() => {})
      .finally(() => { if (active) setLeadLoading(false); });
    return () => { active = false; };
  }, [autoDone, initial.leadId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const total = (Number(form.amount) || 0) + (Number(form.extraAmount) || 0);

  const showPassword = async () => {
    if (shownPassword !== null) { setShownPassword(null); return; }
    setLoadingPw(true);
    try { setShownPassword(await api.getCasePassword(initial.id)); } catch { setShownPassword(''); }
    setLoadingPw(false);
  };

  const save = async () => {
    if (!form.name.trim()) { setError('Customer name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload: Partial<OpsCase> = {
        ...form,
        amount: Number(form.amount) || 0,
        extraAmount: Number(form.extraAmount) || 0,
      };
      // Never send the locked fields (the server ignores them too).
      if (fromLead) { delete payload.handledBy; delete payload.service; }
      if (autoDone) delete payload.status;
      if (newPassword.trim()) payload.portalPassword = newPassword.trim();
      const saved = await api.updateCase(initial.id, payload);
      onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete case #${initial.caseNo} (${initial.name})? This cannot be undone.`)) return;
    setSaving(true);
    try { await api.deleteCase(initial.id); onDeleted(initial.id); } catch (e) { setError(e instanceof Error ? e.message : 'Could not delete'); setSaving(false); }
  };

  const input = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 bg-white';

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-base font-bold text-gray-900">Case #{initial.caseNo} · {initial.name}</p>
            <p className="text-xs text-gray-400">
              {initial.createdBy ? `Added by ${initial.createdBy}` : 'Operations case'}
              {initial.leadId && (
                <> · <Link href={`/leads/view?id=${initial.leadId}`} className="text-blue-600 hover:underline inline-flex items-center gap-0.5">open lead <ExternalLink className="w-3 h-3" /></Link></>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100" title="Close"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="px-5 py-4 space-y-5 max-h-[72vh] overflow-y-auto">
          {autoDone && <LeadDetails lead={lead} loading={leadLoading} />}

          <Section title="Service">
            <Field label="Service">
              {fromLead ? (
                <LockedValue value={form.service} hint="From the lead" />
              ) : (
                <select className={input} value={form.service} onChange={(e) => set('service', e.target.value)}>
                  {OPS_SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </Field>
            <Field label={fields.typeLabel}>
              <input className={input} list="case-types" value={form.appType} onChange={(e) => set('appType', e.target.value.toUpperCase())} placeholder="Pick or type" />
              <datalist id="case-types">{fields.types.map((t) => <option key={t} value={t} />)}</datalist>
            </Field>
            {fields.scheme && (
              <Field label="Scheme">
                <select className={input} value={form.scheme} onChange={(e) => set('scheme', e.target.value)}>
                  <option value="">—</option>
                  {fields.scheme.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            )}
            {fields.category && (
              <Field label="Category">
                <select className={input} value={form.category} onChange={(e) => set('category', e.target.value)}>
                  <option value="">—</option>
                  {fields.category.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            )}
            {form.serviceDetail && <Field label="As on the lead"><input className={`${input} bg-gray-50`} value={form.serviceDetail} readOnly /></Field>}
          </Section>

          <Section title="Customer">
            <Field label="Name *"><input className={input} value={form.name} onChange={(e) => set('name', e.target.value.toUpperCase())} placeholder="MR / MS FULL NAME" /></Field>
            <Field label="Phone"><input className={input} value={form.phone} onChange={(e) => set('phone', e.target.value)} inputMode="tel" /></Field>
            <Field label="Email"><input className={input} value={form.email} onChange={(e) => set('email', e.target.value)} type="email" /></Field>
            <Field label="City"><input className={input} value={form.city} onChange={(e) => set('city', e.target.value.toUpperCase())} /></Field>
          </Section>

          <Section title="Work">
            <Field label="Status">
              {autoDone ? (
                <LockedValue value={statusInfo('completed').label} hint="PAN Card: completed when converted" tone="text-emerald-700" />
              ) : (
                <select className={input} value={form.status} onChange={(e) => set('status', e.target.value as Form['status'])}>
                  {CASE_STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              )}
            </Field>
            <Field label="Handled by">
              {fromLead ? (
                <LockedValue value={form.handledBy || 'Not assigned on the lead'} hint="Who the lead was assigned to when it converted" />
              ) : (
                <>
                  <input className={input} list="case-team" value={form.handledBy} onChange={(e) => set('handledBy', e.target.value.toUpperCase())} placeholder="Team member" />
                  <datalist id="case-team">{team.map((t) => <option key={t} value={t} />)}</datalist>
                </>
              )}
            </Field>
            <Field label="Source">
              <input className={input} list="case-sources" value={form.source} onChange={(e) => set('source', e.target.value.toUpperCase())} />
              <datalist id="case-sources">{CASE_SOURCES.map((t) => <option key={t} value={t} />)}</datalist>
            </Field>
            <Field label="Case date"><input className={input} type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></Field>
            {fields.appointment && (
              <Field label="Appointment date"><input className={input} type="date" value={form.appointmentDate} onChange={(e) => set('appointmentDate', e.target.value)} /></Field>
            )}
            <Field label={fields.applicationNoLabel}><input className={input} value={form.applicationNo} onChange={(e) => set('applicationNo', e.target.value.toUpperCase())} /></Field>
          </Section>

          {(fields.portal || form.portalLoginId || initial.hasPortalPassword) && (
            <Section title="Customer's portal login">
              <Field label="Login ID"><input className={input} value={form.portalLoginId} onChange={(e) => set('portalLoginId', e.target.value)} autoComplete="off" /></Field>
              <Field label={initial.hasPortalPassword ? 'Password' : 'Password (optional)'}>
                {initial.hasPortalPassword && !changingPw ? (
                  <div className="flex items-center gap-2">
                    <div className={`${input} font-mono flex-1 bg-gray-50`}>{shownPassword ?? '••••••••'}</div>
                    <button type="button" onClick={showPassword} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50" title={shownPassword !== null ? 'Hide' : 'Show password'}>
                      {loadingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : shownPassword !== null ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button type="button" onClick={() => setChangingPw(true)} className="text-xs font-semibold text-blue-600 px-2">Change</button>
                  </div>
                ) : (
                  <input className={`${input} font-mono`} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" placeholder={changingPw ? 'New password' : 'Saved masked — shown only on click'} autoFocus={changingPw} />
                )}
              </Field>
              <p className="sm:col-span-2 text-[11px] text-gray-400 flex items-center gap-1"><KeyRound className="w-3 h-3" /> The password is hidden in lists and exports; it is shown only when someone clicks the eye.</p>
            </Section>
          )}

          <Section title="Payment">
            <Field label="Government fee (₹)"><input className={input} type="number" min={0} value={form.extraAmount || ''} onChange={(e) => set('extraAmount', Number(e.target.value))} placeholder="e.g. 2000" /></Field>
            <Field label="MMD service fee (₹)"><input className={input} type="number" min={0} value={form.amount || ''} onChange={(e) => set('amount', Number(e.target.value))} /></Field>
            <Field label="Payment mode">
              <input className={input} list="case-pay" value={form.paymentMode} onChange={(e) => set('paymentMode', e.target.value)} />
              <datalist id="case-pay">{PAYMENT_MODES.map((t) => <option key={t} value={t} />)}</datalist>
            </Field>
            <Field label="Total amount">
              <div className={`${input} bg-gray-50`}>
                <p className="font-semibold">{rupees(total)}</p>
                <p className="text-[11px] text-gray-500">Govt fee {rupees(form.extraAmount || 0)} + MMD fee {rupees(form.amount || 0)}</p>
              </div>
            </Field>
          </Section>

          <Field label="Remarks">
            <textarea className={input} rows={2} value={form.remarks} onChange={(e) => set('remarks', e.target.value)} />
          </Field>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100">
          {canDelete ? (
            <button onClick={remove} disabled={saving} className="flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-sm font-semibold text-gray-600 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Cancel</button>
            <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

// A value that cannot be edited on this case, with why.
function LockedValue({ value, hint, tone = 'text-gray-800' }: { value: string; hint: string; tone?: string }) {
  return (
    <div className="w-full px-3 py-2 text-sm border border-gray-100 rounded-xl bg-gray-50">
      <p className={`font-semibold flex items-center gap-1.5 ${tone}`}><Lock className="w-3.5 h-3.5 text-gray-400" />{value}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>
    </div>
  );
}

// PAN Card cases: every detail the customer gave on the lead, and its comments.
function LeadDetails({ lead, loading }: { lead: Lead | null; loading: boolean }) {
  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-gray-400 py-3"><Loader2 className="w-4 h-4 animate-spin" /> Loading lead details…</div>;
  }
  if (!lead) return null;

  const seen = new Set<string>();
  const items = getSchema(lead).flat()
    .filter((f): f is NonNullable<typeof f> => !!f && !!f.key && !seen.has(f.key) && !!seen.add(f.key))
    .map((f) => ({ label: f.label, value: resolveField(lead, f) }));
  const notes = [...(lead.notes ?? [])].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Lead details</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2 bg-blue-50/40 border border-blue-100 rounded-xl p-3">
          {items.map((it) => (
            <div key={it.label} className="min-w-0">
              <p className="text-[11px] text-gray-400">{it.label}</p>
              <p className="text-sm text-gray-900 break-words">{it.value}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" /> Comments ({notes.length})
        </p>
        {notes.length ? (
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id || `${n.createdAt}-${n.text.slice(0, 20)}`} className="border border-gray-100 rounded-xl px-3 py-2">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.text}</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {n.author || 'Unknown'}
                  {n.createdAt ? ` · ${new Date(n.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No comments on this lead.</p>
        )}
      </div>
    </div>
  );
}
