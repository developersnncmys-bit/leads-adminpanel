'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  UserPlus,
  AlertCircle,
  CalendarCheck,
  UserCheck,
  Clock,
  CheckCircle,
  ArrowRight,
  FileText,
  Calendar,
  ChevronDown,
  Check,
} from 'lucide-react';

import { useAuthUser } from '@/lib/useAuthUser';

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
    color: 'from-gray-400 to-gray-500',
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
    key: 'inprocess',
    label: 'In Process',
    color: 'from-violet-500 to-violet-600',
    href: '/leads/inprocess',
    icon: Clock,
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
  const { leads, openModal, stats: serverStats } = useAddLead();
  const user = useAuthUser();

  // Counts come from the server (authoritative, exact). Fall back to counting
  // the in-memory list only until the first stats response arrives.
  const stats = serverStats ?? {
    new:       leads.filter((l) => l.status === 'new').length,
    overdue:   leads.filter((l) => l.status === 'overdue').length,
    today:     leads.filter((l) => l.status === 'today').length,
    followup:  leads.filter((l) => l.status === 'followup').length,
    inprocess: leads.filter((l) => l.status === 'inprocess').length,
    converted: leads.filter((l) => l.status === 'converted').length,
    dead:      leads.filter((l) => l.status === 'dead').length,
    total:     leads.length,
  };

  const total = stats.total;

  const donutData = [
    { label: 'Active New Leads', value: stats.new, color: '#3b82f6' },
    { label: 'Current Overdue', value: stats.overdue, color: '#9ca3af' },
    { label: "Today's Follow-up", value: stats.today, color: '#14b8a6' },
    { label: 'Pending Follow-up', value: stats.followup, color: '#f59e0b' },
    { label: 'In Process', value: stats.inprocess, color: '#8b5cf6' },
    { label: 'Total Converted', value: stats.converted, color: '#10b981' },
    { label: 'Dead Leads', value: stats.dead, color: '#ef4444' },
  ];

  // Track total + converted per service so we can show the conversion rate
  // (converted / total) instead of just the share of total leads.
  const serviceStats: Record<string, { count: number; converted: number }> = {};
  leads.forEach((l) => {
    if (!serviceStats[l.service]) serviceStats[l.service] = { count: 0, converted: 0 };
    serviceStats[l.service].count++;
    if (l.status === 'converted') serviceStats[l.service].converted++;
  });
  const categoryData = Object.entries(serviceStats).map(([name, s]) => ({
    name,
    count: s.count,
    converted: s.converted,
  }));

  // Leads Overview chart range filter.
  const thisYear = new Date().getFullYear();
  const [range, setRange] = useState<'1m' | '3m' | '6m' | '12m' | 'year' | 'all'>('all');
  const [rangeOpen, setRangeOpen] = useState(false);
  const rangeRef = useRef<HTMLDivElement>(null);
  const RANGE_OPTS: { key: typeof range; label: string }[] = [
    { key: '1m', label: 'Last 30 Days' },
    { key: '3m', label: 'Last 3 Months' },
    { key: '6m', label: 'Last 6 Months' },
    { key: '12m', label: 'Last 12 Months' },
    { key: 'year', label: `This Year (${thisYear})` },
    { key: 'all', label: 'All Time' },
  ];
  const rangeLabel = RANGE_OPTS.find((o) => o.key === range)?.label || '';

  // Close the range dropdown on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rangeRef.current && !rangeRef.current.contains(e.target as Node)) setRangeOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const monthlyData = useMemo(() => {
    const now = new Date();
    if (range === '1m') {
      // Last 30 days, one bar per day.
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      return Array.from({ length: 30 }, (_, i) => {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
        return {
          label: String(d.getDate()),
          tip: `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
          value: leads.filter((l) => {
            const t = new Date(l.createdAt).getTime();
            return t >= d.getTime() && t < next.getTime();
          }).length,
        };
      });
    }

    if (range === 'year') {
      // This calendar year, Jan–Dec.
      return MONTHS.map((label, m) => ({
        label,
        tip: `${label} ${now.getFullYear()}`,
        value: leads.filter((l) => {
          const c = new Date(l.createdAt);
          return c.getFullYear() === now.getFullYear() && c.getMonth() === m;
        }).length,
      }));
    }

    // Monthly buckets. For "all", span from the earliest lead month to now
    // (capped at 36 months) so historical/migrated data actually shows.
    let monthsBack;
    if (range === '3m') monthsBack = 3;
    else if (range === '6m') monthsBack = 6;
    else if (range === '12m') monthsBack = 12;
    else {
      const times = leads.map((l) => new Date(l.createdAt).getTime()).filter((t) => !isNaN(t));
      const earliest = times.length ? new Date(Math.min(...times)) : now;
      monthsBack =
        (now.getFullYear() - earliest.getFullYear()) * 12 +
        (now.getMonth() - earliest.getMonth()) + 1;
      monthsBack = Math.min(Math.max(monthsBack, 1), 36);
    }

    return Array.from({ length: monthsBack }, (_, idx) => {
      const i = monthsBack - 1 - idx;
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear(), m = d.getMonth();
      return {
        // Show the year in the axis label only in January / multi-year spans,
        // and always in the tooltip.
        label: monthsBack > 12 ? `${MONTHS[m]} '${String(y).slice(2)}` : MONTHS[m],
        tip: `${MONTHS[m]} ${y}`,
        value: leads.filter((l) => {
          const c = new Date(l.createdAt);
          return c.getFullYear() === y && c.getMonth() === m;
        }).length,
      };
    });
  }, [leads, range]);

  const rangeSubtitle =
    range === '1m' ? 'Daily lead activity — last 30 days'
    : range === '3m' ? 'Monthly lead activity — last 3 months'
    : range === '6m' ? 'Monthly lead activity — last 6 months'
    : range === '12m' ? 'Monthly lead activity — last 12 months'
    : range === 'year' ? `Monthly lead activity — ${thisYear}`
    : 'Monthly lead activity — all time';

  const [greeting, setGreeting] = useState('');
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
  }, []);

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting ? `${greeting}, ${user.name.split(' ')[0]}! 👋` : ''}
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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

      {/* LEADS OVERVIEW — full width */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Leads Overview</h2>
            <p className="text-xs text-gray-400 mt-1">{rangeSubtitle}</p>
          </div>
          {/* Range filter — dropdown */}
          <div className="relative self-start" ref={rangeRef}>
            <button
              onClick={() => setRangeOpen((v) => !v)}
              className="flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-sm font-semibold text-gray-700 transition-colors shadow-sm"
            >
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>{rangeLabel}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${rangeOpen ? 'rotate-180' : ''}`} />
            </button>

            {rangeOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-gray-100 shadow-xl z-30 overflow-hidden p-1">
                {RANGE_OPTS.map((o) => {
                  const active = range === o.key;
                  return (
                    <button
                      key={o.key}
                      onClick={() => { setRange(o.key); setRangeOpen(false); }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>{o.label}</span>
                      {active && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <BarChart data={monthlyData} />
      </div>

      {/* CATEGORY + LEAD DISTRIBUTION — same row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* CATEGORY DISTRIBUTION */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="font-bold text-gray-900">Category Distribution</h2>
              <p className="text-xs text-gray-400">Overall active leads by services</p>
            </div>
          </div>

          <div className="space-y-5 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
            {categoryData
              .sort((a, b) => b.count - a.count)
              .map((item) => {
                // Conversion rate within this service — i.e. of all the leads
                // for `item.name`, what fraction reached the `converted` status.
                const conversionPct = item.count > 0 ? (item.converted / item.count) * 100 : 0;
                const pctLabel = conversionPct.toFixed(1);

                return (
                  <div key={item.name} className="group cursor-pointer category-card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-bold text-gray-900">{item.converted}/{item.count}</span>
                        <span className="text-xs text-emerald-600 tabular-nums">{pctLabel}% converted</span>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                        style={{ width: `${conversionPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* LEAD DISTRIBUTION */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="mb-5">
            <h2 className="font-bold text-gray-900">Lead Distribution</h2>
            <p className="text-xs text-gray-400 mt-1">Current lead pipeline distribution</p>
          </div>

          <DonutChart data={donutData} />

          <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between text-xs">
            <span className="text-gray-500">Conversion rate</span>
            <span className="font-bold text-emerald-600">
              {total > 0 ? ((stats.converted / total) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}