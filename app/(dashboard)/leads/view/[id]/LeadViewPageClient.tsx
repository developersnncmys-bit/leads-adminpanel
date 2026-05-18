'use client';

import { useState, useEffect, use } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Phone, Mail, MapPin, Briefcase, DollarSign,
  User, Calendar, MessageSquare, Send, Edit3, Clock,
} from 'lucide-react';
import { MOCK_USERS } from '@/lib/mockData';
import { STATUS_CONFIG } from '@/lib/constants';
import { LeadStatus } from '@/lib/types';
import StatusBadge from '@/components/leads/StatusBadge';
import PaymentBadge from '@/components/leads/PaymentBadge';
import { useAddLead } from '@/context/AddLeadContext';

const ALL_STATUSES: LeadStatus[] = ['new', 'overdue', 'today', 'followup', 'inprocess', 'converted', 'dead'];

export default function LeadViewPageClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { leads } = useAddLead();
  const lead = leads.find((l) => l.id === id);

  if (!lead) notFound();

  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [assignedTo, setAssignedTo] = useState(lead.assignedTo);
  const [paymentStatus, setPaymentStatus] = useState(lead.paymentStatus);
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
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState(lead.notes);
  const [saved, setSaved] = useState(false);

  const addNote = () => {
    if (!noteText.trim()) return;
    setNotes([...notes, {
      id: Date.now().toString(),
      text: noteText,
      author: 'Deepak Kumar',
      createdAt: new Date().toISOString().split('T')[0],
    }]);
    setNoteText('');
  };

  const handleSave = () => {
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
        <button
          onClick={handleSave}
          className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
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
                  <StatusBadge status={status} />
                  <PaymentBadge status={paymentStatus} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Phone,     label: 'Mobile',   value: lead.mobileNumber },
                { icon: Mail,      label: 'Email',    value: lead.email || '—' },
                { icon: MapPin,    label: 'District', value: lead.district },
                { icon: MapPin,    label: 'Address',  value: lead.address },
                { icon: Briefcase, label: 'Service',  value: lead.service },
                { icon: DollarSign,label: 'Amount',   value: `₹${lead.amount.toLocaleString('en-IN')}` },
                { icon: User,      label: 'Source',   value: lead.source },
                { icon: Calendar,  label: 'Date',     value: lead.date },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
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
                <p className="text-sm text-gray-400 text-center py-6">No notes yet. Add one below.</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-800">{note.text}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{note.author} · {note.createdAt}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <textarea
                placeholder="Add a note or update..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={2}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white resize-none transition-all"
              />
              <button onClick={addNote} className="px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors flex items-center gap-1">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-gray-400" />
              Update Status
            </h3>
            <div className="space-y-2">
              {ALL_STATUSES.map((s) => {
                const c = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
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
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white text-gray-700 cursor-pointer"
            >
              {employees.map((emp) => <option key={emp} value={emp}>{emp}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Payment Status</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentStatus('paid')}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  paymentStatus === 'paid' ? 'bg-green-600 text-white border-green-600' : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Paid
              </button>
              <button
                onClick={() => setPaymentStatus('unpaid')}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  paymentStatus === 'unpaid' ? 'bg-orange-500 text-white border-orange-500' : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Unpaid
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="sm:hidden w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
