'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { getDashboardStats} from '@/lib/mockData';
import { STATUS_CONFIG } from '@/lib/constants';
import { LeadStatus } from '@/lib/types';
import LeadTable from '@/components/leads/LeadTable';
import Link from 'next/link';
import {
  UserPlus, AlertCircle, CalendarCheck, UserCheck,
  Clock, CheckCircle, XCircle, ArrowUpRight,
} from 'lucide-react';
import { useAddLead } from '@/context/AddLeadContext';

const VALID: LeadStatus[] = ['new', 'overdue', 'today', 'followup', 'inprocess', 'converted', 'dead'];

const STATUS_META: Record<LeadStatus, {
  icon: React.ElementType;
  gradient: string;
  lightBg: string;
  textColor: string;
  description: string;
}> = {
  new:       { icon: UserPlus,      gradient: 'from-blue-500 to-blue-600',      lightBg: 'bg-blue-50',    textColor: 'text-blue-600',    description: 'Leads waiting to be contacted' },
  overdue:   { icon: AlertCircle,   gradient: 'from-red-500 to-red-600',        lightBg: 'bg-red-50',     textColor: 'text-red-600',     description: 'Past their follow-up date' },
  today:     { icon: CalendarCheck, gradient: 'from-teal-500 to-teal-600',      lightBg: 'bg-teal-50',    textColor: 'text-teal-600',    description: 'Scheduled for follow-up today' },
  followup:  { icon: UserCheck,     gradient: 'from-amber-400 to-amber-500',    lightBg: 'bg-amber-50',   textColor: 'text-amber-600',   description: 'Awaiting follow-up' },
  inprocess: { icon: Clock,         gradient: 'from-violet-500 to-violet-600',  lightBg: 'bg-violet-50',  textColor: 'text-violet-600',  description: 'Documents being processed' },
  converted: { icon: CheckCircle,   gradient: 'from-emerald-500 to-emerald-600',lightBg: 'bg-emerald-50', textColor: 'text-emerald-600', description: 'Successfully converted leads' },
  dead:      { icon: XCircle,       gradient: 'from-gray-400 to-gray-500',      lightBg: 'bg-gray-100',   textColor: 'text-gray-500',    description: 'Leads that did not convert' },
};

const QUICK_CARDS: { key: LeadStatus; label: string; color: string }[] = [
  { key: 'new',       label: 'New Leads',         color: 'from-blue-500 to-blue-600' },
  { key: 'today',     label: "Today's Follow-up", color: 'from-teal-500 to-teal-600' },
  { key: 'followup',  label: 'Follow-up',          color: 'from-amber-400 to-amber-500' },
  { key: 'inprocess', label: 'In Process',         color: 'from-violet-500 to-violet-600' },
];

export default function LeadStatusPageClient({ params }: { params: Promise<{ status: string }> }) {
  const { status } = use(params);
  const { openModal, leads: allLeads } = useAddLead();
  if (!VALID.includes(status as LeadStatus)) notFound();

  const s = status as LeadStatus;
  const leads = allLeads.filter((lead) => lead.status === s);
  const stats = getDashboardStats();
  const cfg = STATUS_CONFIG[s];
  const meta = STATUS_META[s];
  const Icon = meta.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 bg-gradient-to-br ${meta.gradient} rounded-2xl flex items-center justify-center shadow-sm`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{cfg.label}</h1>
            <p className="text-sm text-gray-400">{meta.description}</p>
          </div>
        </div>
        <button
          onClick={openModal}
          className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-200"
        >
          <UserPlus className="w-4 h-4" />
          Add Lead
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {QUICK_CARDS.map(({ key, label, color }) => {
          const count = stats[key as keyof typeof stats] as number;
          const isActive = key === s;
          return (
            <Link
              key={key}
              href={`/leads/${key}`}
              className={`rounded-2xl p-4 transition-all hover:-translate-y-0.5 ${
                isActive
                  ? `bg-gradient-to-br ${color} shadow-md text-white`
                  : 'bg-white border border-gray-100 shadow-sm hover:shadow-md'
              }`}
            >
              <p className={`text-xs font-semibold mb-2 ${isActive ? 'text-white/80' : 'text-gray-500'}`}>{label}</p>
              <div className="flex items-end justify-between">
                <p className={`text-3xl font-bold ${isActive ? 'text-white' : 'text-gray-900'}`}>{count}</p>
                <div className={`flex items-center gap-1 text-xs font-semibold ${isActive ? 'text-white/70' : 'text-emerald-500'}`}>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{isActive ? 'current' : 'view'}</span>
                </div>
              </div>
              <p className={`text-xs mt-1.5 ${isActive ? 'text-white/60' : 'text-gray-400'}`}>
                {isActive ? 'You are here' : 'Than last week'}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${meta.lightBg} ${meta.textColor}`}>
          {leads.length} lead{leads.length !== 1 ? 's' : ''} in {cfg.label}
        </span>
      </div>

      <LeadTable leads={leads} />
    </div>
  );
}
