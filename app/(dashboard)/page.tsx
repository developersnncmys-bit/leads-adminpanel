'use client';

import Link from 'next/link';
import {
  UserPlus,
  AlertCircle,
  CalendarCheck,
  UserCheck,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  FileText,
} from 'lucide-react';

import { STATUS_CONFIG } from '@/lib/constants';
import { MOCK_AUTH_USER } from '@/lib/mockData';

import BarChart from '@/components/dashboard/BarChart';
import DonutChart from '@/components/dashboard/DonutChart';

import { useAddLead } from '@/context/AddLeadContext';

const PIPELINE_TABS = [
  {
    key: 'new',
    label: 'Active New Leads',
    color: 'from-blue-500 to-blue-600',
    href: '/leads/new',
    icon: UserPlus,
  },
  {
    key: 'overdue',
    label: 'Current Overdue',
    color: 'from-red-500 to-red-600',
    href: '/leads/overdue',
    icon: AlertCircle,
  },
  {
    key: 'today',
    label: "Today's Follow-up",
    color: 'from-teal-500 to-teal-600',
    href: '/leads/today',
    icon: CalendarCheck,
  },
  {
    key: 'followup',
    label: 'Pending Follow-up',
    color: 'from-amber-400 to-amber-500',
    href: '/leads/followup',
    icon: UserCheck,
  },
  {
    key: 'converted',
    label: 'Total Converted',
    color: 'from-emerald-500 to-emerald-600',
    href: '/leads/converted',
    icon: CheckCircle,
  },
];

export default function DashboardPage() {
  const { leads, openModal } = useAddLead();
  const user = MOCK_AUTH_USER;

  const stats = {
    new:       leads.filter((l) => l.status === 'new').length,
    overdue:   leads.filter((l) => l.status === 'overdue').length,
    today:     leads.filter((l) => l.status === 'today').length,
    followup:  leads.filter((l) => l.status === 'followup').length,
    inprocess: leads.filter((l) => l.status === 'inprocess').length,
    converted: leads.filter((l) => l.status === 'converted').length,
    dead:      leads.filter((l) => l.status === 'dead').length,
    total:     leads.length,
  };

  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const total = stats.total;

  const donutData = [
    { label: 'Active New Leads', value: stats.new, color: '#3b82f6' },
    { label: 'Current Overdue', value: stats.overdue, color: '#ef4444' },
    { label: "Today's Follow-up", value: stats.today, color: '#14b8a6' },
    { label: 'Pending Follow-up', value: stats.followup, color: '#f59e0b' },
    { label: 'In Process', value: stats.inprocess, color: '#8b5cf6' },
    { label: 'Total Converted', value: stats.converted, color: '#10b981' },
    { label: 'Dead Leads', value: stats.dead, color: '#d1d5db' },
  ];

  const serviceCounts: Record<string, number> = {};
  leads.forEach((l) => { serviceCounts[l.service] = (serviceCounts[l.service] || 0) + 1; });
  const categoryData = Object.entries(serviceCounts).map(([name, count]) => ({ name, count }));

  const greeting = () => {
    const h = new Date().getHours();

    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';

    return 'Good evening';
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting()}, {user.name.split(' ')[0]}! 👋
          </h1>

          <p className="text-sm text-gray-400 mt-1">
            Here's what's happening with your leads today.
          </p>
        </div>

        <button
          onClick={openModal}
          className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add Lead
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {PIPELINE_TABS.map(({ key, label, color, href, icon: Icon }) => {
          const count = stats[key as keyof typeof stats] as number;

          return (
            <Link
              key={key}
              href={href}
              className={`bg-gradient-to-br ${color} rounded-2xl p-5 text-white hover:-translate-y-1 transition-all shadow-sm`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/80 text-xs font-semibold uppercase tracking-wide">
                  {label}
                </span>

                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>

              <p className="text-4xl font-bold">{count}</p>

              <div className="flex items-center gap-1 mt-2 text-white/70 text-xs font-medium">
                <span>View leads</span>

                <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* CHART SECTION */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* LEADS OVERVIEW */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

          <div className="flex items-start justify-between mb-5">

            <div>
              <h2 className="font-bold text-gray-900 text-base">
                Leads Overview
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                Monthly lead activity this year
              </p>
            </div>

            <div className="flex items-center gap-2">

              <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full">
                <TrendingUp className="w-3 h-3" />
                +24%
              </span>

              <span className="text-xs text-gray-400">
                vs last year
              </span>

            </div>
          </div>

          <BarChart />
        </div>

        {/* PIPELINE DISTRIBUTION */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

          <div className="mb-5">

            <h2 className="font-bold text-gray-900">
              Lead Distribution
            </h2>

            <p className="text-xs text-gray-400 mt-1">
              Current lead pipeline distribution
            </p>

          </div>

          <DonutChart data={donutData} />

          <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between text-xs">

            <span className="text-gray-500">
              Conversion rate
            </span>

            <span className="font-bold text-emerald-600">
              {((stats.converted / total) * 100).toFixed(1)}%
            </span>

          </div>
        </div>
      </div>

      {/* TABLE + CATEGORY DISTRIBUTION */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* RECENT LEADS */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">

            <div>
              <h2 className="font-bold text-gray-900">
                Recent Leads
              </h2>

              <p className="text-xs text-gray-400 mt-0.5">
                {total} total leads tracked
              </p>
            </div>

            <Link
              href="/leads/new"
              className="flex items-center gap-1 text-xs text-blue-600 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg"
            >
              View all
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Column headers — desktop only */}
          <div className="hidden sm:grid grid-cols-[1fr_144px_120px_96px] gap-4 px-6 py-2.5 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lead</p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Service</p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Status</p>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Date</p>
          </div>

          <div className="divide-y divide-gray-50">

            {recentLeads.map((lead) => {
              const cfg = STATUS_CONFIG[lead.status];

              return (
                <Link
                  key={lead.id}
                  href={`/leads/view/${lead.id}`}
                  className="block sm:grid sm:grid-cols-[1fr_144px_120px_96px] sm:items-center sm:gap-4 px-4 sm:px-6 py-3.5 hover:bg-gray-50 transition-colors"
                >

                  {/* Mobile layout */}
                  <div className="sm:contents">

                    {/* Row 1: avatar + name + status badge */}
                    <div className="flex items-center justify-between gap-3 sm:contents">

                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">{lead.name[0]}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {lead.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {lead.mobileNumber}
                          </p>
                        </div>
                      </div>

                      {/* Status badge — visible on mobile (right side), hidden on desktop (own column) */}
                      <span className={`sm:hidden inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>

                    {/* Row 2: service + date — mobile only */}
                    <div className="sm:hidden flex items-center justify-between mt-2 pl-11">
                      <p className="text-xs text-gray-500 truncate">{lead.service}</p>
                      <p className="text-xs text-gray-400 flex-shrink-0 ml-3">{lead.date}</p>
                    </div>

                  </div>

                  {/* Desktop-only columns */}
                  <p className="hidden sm:block text-sm text-gray-600 truncate">
                    {lead.service}
                  </p>

                  <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${cfg.bg} ${cfg.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    {cfg.label}
                  </span>

                  <p className="hidden sm:block text-xs text-gray-400 text-right">
                    {lead.date}
                  </p>

                </Link>
              );
            })}
          </div>
        </div>

        {/* CATEGORY DISTRIBUTION */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

          <div className="flex items-center gap-2 mb-5">

            <FileText className="w-5 h-5 text-blue-600" />

            <div>
              <h2 className="font-bold text-gray-900">
                Category Distribution
              </h2>

              <p className="text-xs text-gray-400">
                Overall active leads by services
              </p>
            </div>

          </div>

          {/* CATEGORY LIST */}
          <div className="space-y-5 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">

            {categoryData
              .sort((a, b) => b.count - a.count)
              .map((item, index, arr) => {

                const max = arr[0].count;

                return (
                  <div
                    key={item.name}
                    className="group cursor-pointer category-card"
                  >

                    {/* TOP ROW */}
                    <div className="flex items-center justify-between mb-2">

                      <div className="flex items-center gap-2">

                        <div className="w-2 h-2 rounded-full bg-blue-600" />

                        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                          {item.name}
                        </span>

                      </div>

                      <span className="text-sm font-bold text-gray-900">
                        {item.count}
                      </span>

                    </div>

                    {/* PROGRESS BAR */}
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">

                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                        style={{
                          width: `${(item.count / max) * 100}%`,
                        }}
                      />

                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}