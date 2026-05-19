'use client';

import { useState, useEffect, use } from 'react';
import { notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Phone, MessageSquare, Send, X, Calendar,
  Trash2, CheckCircle, Clock, Plus,
} from 'lucide-react';
import { MOCK_USERS } from '@/lib/mockData';
import { STATUS_CONFIG } from '@/lib/constants';
import { Lead, LeadStatus } from '@/lib/types';
import { useAddLead } from '@/context/AddLeadContext';
import { getSchema, resolveField } from '@/lib/formSchemas';

/* ─── Predefined comment chips ─────────────────────────────────── */
const QUICK_COMMENTS = [
  'Disconnect the call.', 'Ekyc Error', 'Login done successfully',
  'Not Interested', 'Ekyc Pending', 'He will Share', 'Form filling pending',
  'We cant process amount refunded via pg', 'Payment pending', 'Picked',
  'Cancelled', 'Documents issue', 'Not interested',
  'Documents pending from client', 'Switch off', 'Not responding',
  'Texted to send documents',
];

/* ─── Small helpers ─────────────────────────────────────────────── */
function EditableField({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 mb-1">{label}:</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white uppercase tracking-wide focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors"
      />
    </div>
  );
}

function ActionBtn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90 ${color}`}
    >
      {label}
    </button>
  );
}

/* ─── Comment modal ─────────────────────────────────────────────── */
function CommentModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (text: string) => void }) {
  const [text, setText] = useState('');
  const [chips, setChips] = useState(QUICK_COMMENTS);
  const [newChip, setNewChip] = useState('');
  const [addingChip, setAddingChip] = useState(false);

  const submit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
    onClose();
  };

  const addChip = () => {
    if (!newChip.trim()) return;
    setChips((c) => [...c, newChip.trim()]);
    setNewChip('');
    setAddingChip(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Comment</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Quick chips */}
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c}
                onClick={() => setText((t) => t ? `${t} ${c}` : c)}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
              >
                {c}
              </button>
            ))}
            {addingChip ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={newChip}
                  onChange={(e) => setNewChip(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addChip()}
                  placeholder="New chip…"
                  className="text-xs px-2 py-1.5 border border-blue-400 rounded-full focus:outline-none w-28"
                />
                <button onClick={addChip} className="text-xs bg-blue-600 text-white px-2 py-1.5 rounded-full">Add</button>
                <button onClick={() => setAddingChip(false)} className="text-xs text-gray-400 px-1">✕</button>
              </div>
            ) : (
              <button
                onClick={() => setAddingChip(true)}
                className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Textarea */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add your comment here"
            rows={4}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white resize-none transition-all"
          />
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-50">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={submit} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors">
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Follow-up date modal ──────────────────────────────────────── */
function FollowUpModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (date: string) => void }) {
  const [date, setDate] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm z-10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Select Follow-up Date</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          />
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-50">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
            Close
          </button>
          <button
            onClick={() => { if (date) { onSubmit(date); onClose(); } }}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Confirm modal ─────────────────────────────────────────────── */
function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm z-10 p-6 text-center">
        <p className="text-sm font-medium text-gray-700 mb-6">{message}</p>
        <div className="flex justify-center gap-3">
          <button onClick={onConfirm} className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors">
            OK
          </button>
          <button onClick={onCancel} className="px-6 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Website lead view ─────────────────────────────────────────── */
function WebsiteLeadView({ leadId }: { leadId: string }) {
  const router = useRouter();
  const { leads, updateLead, deleteLead } = useAddLead();
  const lead = leads.find((l) => l.id === leadId);
  if (!lead) return notFound();

  const schema = getSchema(lead.service);

  const [fields, setFields] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    schema.flat().forEach((f) => {
      if (!f) return;
      const val = resolveField(lead, f);
      init[f.key] = val === '—' ? '' : val;
    });
    return init;
  });

  const [showComment, setShowComment] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [confirm, setConfirm] = useState<{ message: string; action: () => void } | null>(null);
  const [saved, setSaved] = useState(false);
  const [employees, setEmployees] = useState<string[]>(() =>
    MOCK_USERS.filter((u) => u.role === 'employee').map((u) => u.name)
  );

  useEffect(() => {
    const stored = localStorage.getItem('crm-users');
    if (stored) {
      const users = JSON.parse(stored);
      setEmployees(users.filter((u: { role: string }) => u.role === 'employee').map((u: { name: string }) => u.name));
    }
  }, []);

  const setField = (key: string, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    const directUpdates: Record<string, unknown> = {};
    const formDataUpdates: Record<string, string> = { ...(lead.formData || {}) };

    schema.flat().forEach((f) => {
      if (!f) return;
      const value = fields[f.key] ?? '';
      if (f.source === 'formData') {
        formDataUpdates[f.key] = value;
      } else {
        directUpdates[f.key] = f.key === 'amount' ? (Number(value) || 0) : value;
      }
    });

    updateLead(lead.id, { ...(directUpdates as Partial<Lead>), formData: formDataUpdates });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addComment = (text: string) => {
    const note = { id: Date.now().toString(), text, author: 'Deepak Kumar', createdAt: new Date().toISOString().split('T')[0] };
    updateLead(lead.id, { notes: [note, ...lead.notes] });
  };

  const changeStatus = (newStatus: LeadStatus, label: string) => {
    setConfirm({
      message: `Are you sure you want to change status to ${label}?`,
      action: () => { updateLead(lead.id, { status: newStatus }); setConfirm(null); },
    });
  };

  const handleFollowUp = (date: string) => {
    updateLead(lead.id, { status: 'followup', followUpDate: date });
  };

  const handleDelete = () => {
    setConfirm({
      message: 'Are you sure you want to delete this lead? This cannot be undone.',
      action: () => { deleteLead(lead.id); router.push('/leads/new'); },
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Back + Save */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/leads/${lead.status}`} className="p-2 rounded-xl hover:bg-white border border-gray-200 transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Lead Details</h1>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all shadow-sm ${saved ? 'bg-emerald-500' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
        >
          {saved && <CheckCircle className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

        {/* Card title */}
        <div className="py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-blue-600 text-center tracking-wide">Lead Details</h2>
        </div>

        {/* Editable fields grid */}
        <div className="p-5 space-y-4">
          {schema.map((row, ri) => (
            <div key={ri} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {row.map((fieldDef, ci) =>
                fieldDef
                  ? <EditableField
                      key={ci}
                      label={fieldDef.label}
                      value={fields[fieldDef.key] ?? ''}
                      onChange={(v) => setField(fieldDef.key, v)}
                    />
                  : <div key={ci} />
              )}
            </div>
          ))}
        </div>

        {/* Comments section */}
        {lead.notes.length > 0 && (
          <div className="px-5 pb-4 space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" /> Comments
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {lead.notes.map((note) => (
                <div key={note.id} className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-sm text-gray-800">{note.text}</p>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {note.author} · {note.createdAt}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action bar */}
        <div className="border-t border-gray-100 px-5 py-4 flex flex-wrap items-center gap-2.5">
          {/* Call */}
          <a href={`tel:${lead.mobileNumber}`} className="w-9 h-9 rounded-lg bg-red-500 hover:bg-red-600 flex items-center justify-center flex-shrink-0 transition-colors">
            <Phone className="w-4 h-4 text-white" />
          </a>

          {/* WhatsApp */}
          <a
            href={`https://wa.me/91${lead.mobileNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors overflow-hidden bg-[#25D366] hover:bg-[#20b558]"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          <ActionBtn label="Add Comment" color="bg-gray-600"    onClick={() => setShowComment(true)} />
          <ActionBtn label="Follow Up"   color="bg-teal-600"    onClick={() => setShowFollowUp(true)} />
          <ActionBtn label="In Process"  color="bg-teal-800"    onClick={() => changeStatus('inprocess', 'In Process')} />
          <ActionBtn label="Converted"   color="bg-green-700"   onClick={() => changeStatus('converted', 'Converted')} />
          <ActionBtn label="Dead"        color="bg-red-700"     onClick={() => changeStatus('dead', 'Dead')} />

          <div className="ml-auto">
            <button
              onClick={handleDelete}
              className="w-9 h-9 rounded-lg bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        </div>
      </div>

      {showComment  && <CommentModal  onClose={() => setShowComment(false)}  onSubmit={addComment} />}
      {showFollowUp && <FollowUpModal onClose={() => setShowFollowUp(false)} onSubmit={handleFollowUp} />}
      {confirm      && <ConfirmModal  message={confirm.message} onConfirm={confirm.action} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

/* ─── Admin lead view (existing design) ────────────────────────── */
function ManualLeadView({ leadId }: { leadId: string }) {
  const { leads, updateLead } = useAddLead();
  const lead = leads.find((l) => l.id === leadId);
  if (!lead) return notFound();

  const [status, setStatus]         = useState<LeadStatus>(lead.status);
  const [assignedTo, setAssignedTo] = useState(lead.assignedTo);
  const [paymentStatus, setPaymentStatus] = useState(lead.paymentStatus);
  const [employees, setEmployees]   = useState<string[]>(() =>
    MOCK_USERS.filter((u) => u.role === 'employee').map((u) => u.name)
  );
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes]       = useState(lead.notes);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('crm-users');
    if (stored) {
      const users = JSON.parse(stored);
      setEmployees(users.filter((u: { role: string }) => u.role === 'employee').map((u: { name: string }) => u.name));
    }
  }, []);

  const addNote = () => {
    if (!noteText.trim()) return;
    const note = { id: Date.now().toString(), text: noteText, author: 'Deepak Kumar', createdAt: new Date().toISOString().split('T')[0] };
    setNotes((n) => [...n, note]);
    setNoteText('');
  };

  const handleSave = () => {
    updateLead(lead.id, { status, assignedTo, paymentStatus, notes });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const cfg = STATUS_CONFIG[status];

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/leads/${lead.status}`} className="p-2 rounded-xl hover:bg-white border border-gray-200 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{lead.name}</h1>
          <p className="text-sm text-gray-500">Lead #{lead.id} · Added {lead.createdAt}</p>
        </div>
        <button onClick={handleSave} className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
          {saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl font-bold">{lead.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-900">{lead.name}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${paymentStatus === 'paid' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                    {paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Mobile',   value: lead.mobileNumber },
                { label: 'Email',    value: lead.email || '—' },
                { label: 'District', value: lead.district },
                { label: 'Address',  value: lead.address },
                { label: 'Service',  value: lead.service },
                { label: 'Amount',   value: `₹${lead.amount.toLocaleString('en-IN')}` },
                { label: 'Source',   value: lead.source },
                { label: 'Date',     value: lead.date },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 font-medium">{label}</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              Notes & Activity
            </h3>
            <div className="space-y-3 mb-4">
              {notes.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No notes yet.</p>
              ) : notes.map((note) => (
                <div key={note.id} className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-800">{note.text}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{note.author} · {note.createdAt}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea
                placeholder="Add a note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={2}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white resize-none transition-all"
              />
              <button onClick={addNote} className="px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Update Status</h3>
            <div className="space-y-2">
              {(['new','overdue','today','followup','inprocess','converted','dead'] as LeadStatus[]).map((s) => {
                const c = STATUS_CONFIG[s];
                return (
                  <button key={s} onClick={() => setStatus(s)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                      status === s ? `${c.bg} ${c.color} ${c.border}` : 'text-gray-600 border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${c.dot} flex-shrink-0`} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Assigned To</h3>
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-700"
            >
              {employees.map((emp) => <option key={emp} value={emp}>{emp}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Payment Status</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPaymentStatus('paid')}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${paymentStatus === 'paid' ? 'bg-green-600 text-white border-green-600' : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                Paid
              </button>
              <button onClick={() => setPaymentStatus('unpaid')}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${paymentStatus === 'unpaid' ? 'bg-orange-500 text-white border-orange-500' : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                Unpaid
              </button>
            </div>
          </div>

          <button onClick={handleSave} className="sm:hidden w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors">
            {saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Entry point ───────────────────────────────────────────────── */
export default function LeadViewPageClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { leads } = useAddLead();
  const lead = leads.find((l) => l.id === id);
  if (!lead) notFound();

  return <WebsiteLeadView leadId={id} />;
}
