'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, Download, ChevronUp, ChevronDown, Filter, Trash2 } from 'lucide-react';
import { Lead } from '@/lib/types';
import { MOCK_USERS } from '@/lib/mockData';
import { SERVICES } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { useAddLead } from '@/context/AddLeadContext';
import PaymentBadge from './PaymentBadge';
import Pagination from '../Pagination';

const PAGE_SIZE = 10;

interface Props {
  leads: Lead[];
}

export default function LeadTable({ leads }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { deleteLead, updateLead } = useAddLead();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof Lead>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [assignedFilter, setAssignedFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Pagination is mirrored to `?page=N` so a browser-back from a lead detail
  // page (or a manual refresh) lands the user on the same page they were on.
  const initialPage = Math.max(1, Number(searchParams.get('page')) || 1);
  const [page, setPage] = useState(initialPage);

  // Sync `page` → URL in an effect (not inside setState) so we never call
  // router.replace mid-render — doing that updates Link subscribers while
  // LeadTable is still rendering and throws "Cannot update LinkComponent".
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const urlPage = Math.max(1, Number(params.get('page')) || 1);
    if (urlPage === page) return;
    if (page <= 1) params.delete('page');
    else params.set('page', String(page));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [page, pathname, router, searchParams]);

  // Pick up external URL changes (back/forward, manual edit).
  useEffect(() => {
    const p = Math.max(1, Number(searchParams.get('page')) || 1);
    setPage((prev) => (prev === p ? prev : p));
  }, [searchParams]);
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

  const allFilteredIds = (f: Lead[]) => new Set(f.map((l) => l.id));
  const toggleSelect = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleSelectAll = (filteredLeads: Lead[]) => {
    const ids = filteredLeads.map(l => l.id);
    const allSelected = ids.every(id => selected.has(id));
    if (allSelected) {
      setSelected(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
    }
  };
  const deleteSelected = () => {
    selected.forEach(id => deleteLead(id));
    setSelected(new Set());
  };

  const assignedUsers = [...new Set(leads.map((l) => l.assignedTo))];

  const handleSort = (key: keyof Lead) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = leads
    .filter((l) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.mobileNumber.includes(q) ||
        l.district.toLowerCase().includes(q) ||
        l.service.toLowerCase().includes(q);
      const matchPayment =
      paymentFilter === 'all' || l.paymentStatus === paymentFilter;

      const matchService =
      serviceFilter === 'all' || l.service === serviceFilter;

      const matchAssigned =
      assignedFilter === 'all' || l.assignedTo === assignedFilter;

      return (
      matchSearch &&
      matchPayment &&
      matchService &&
      matchAssigned
      );
    })
    .sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const DATE_KEYS: (keyof Lead)[] = ['date', 'createdAt', 'followUpDate'];
      if (DATE_KEYS.includes(sortKey)) {
        const da = new Date(String(av || '1970-01-01')).getTime();
        const db = new Date(String(bv || '1970-01-01')).getTime();
        return sortDir === 'asc' ? da - db : db - da;
      }
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 when the user actively changes a filter — but NOT on the
  // initial mount (otherwise we'd trample the page restored from the URL).
  const firstFilterRender = useRef(true);
  useEffect(() => {
    if (firstFilterRender.current) { firstFilterRender.current = false; return; }
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, paymentFilter, serviceFilter, assignedFilter]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage((p) => Math.min(p, Math.max(1, totalPages))); }, [totalPages]);

  const downloadCSV = () => {
    const headers = ['Sl.No', 'Date', 'Time', 'Name', 'Mobile', 'District', 'Service', 'Amount', 'Payment', 'Assigned To'];
    const rows = filtered.map((l, i) => [
      i + 1, l.date, l.time || '', l.name, l.mobileNumber, l.district, l.service,
      l.amount, l.paymentStatus, l.assignedTo,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv,' + encodeURIComponent(csv);
    a.download = 'leads.csv';
    a.click();
  };

  const SortIcon = ({ col }: { col: keyof Lead }) =>
    sortKey === col ? (
      sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
    ) : (
      <ChevronUp className="w-3 h-3 opacity-30" />
    );

  const Th = ({ col, label, className = '' }: { col: keyof Lead; label: string; className?: string }) => (
    <th
      onClick={() => handleSort(col)}
      className={`px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 transition-colors whitespace-nowrap ${className}`}
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon col={col} />
      </div>
    </th>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-50">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, district, service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all"
          />
        </div>
      <div className="flex flex-wrap items-center gap-2">

    {/* SERVICE FILTER */}
    <select
    value={serviceFilter}
    onChange={(e) => setServiceFilter(e.target.value)}
    className="px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
    <option value="all">All Services</option>
    {SERVICES.map((s) => (
      <option key={s} value={s}>{s}</option>
    ))}
    </select>

    {/* ASSIGNED TO FILTER */}
    <select
    value={assignedFilter}
    onChange={(e) => setAssignedFilter(e.target.value)}
    className="px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
    <option value="all">All Staff</option>

    {assignedUsers.map((user) => (
      <option key={user} value={user}>
        {user}
      </option>
    ))}
    </select>

    {/* PAYMENT FILTER */}
    <div className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-600">
    <Filter className="w-4 h-4 text-gray-400" />

    <select
      value={paymentFilter}
      onChange={(e) => setPaymentFilter(e.target.value)}
      className="bg-transparent focus:outline-none text-sm cursor-pointer"
     >
      <option value="all">All Payments</option>
      <option value="paid">Paid</option>
      <option value="unpaid">Unpaid</option>
    </select>
   </div>

  {/* EXPORT BUTTON */}
  <button
    onClick={downloadCSV}
    className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
  >
    <Download className="w-4 h-4" />

    <span className="hidden sm:inline">
      Export Excel
    </span>
  </button>

</div>
      </div>

      {/* Bulk action bar — shown when rows are selected */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border-b border-blue-100">
          <span className="text-sm font-semibold text-blue-700">{selected.size} lead{selected.size > 1 ? 's' : ''} selected</span>
          <button
            onClick={deleteSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Selected
          </button>
        </div>
      )}

      {/* Table count */}
      <div className="px-4 py-2.5 bg-gray-50/50 border-b border-gray-50">
        <p className="text-xs text-gray-500 font-medium">
          Showing {filtered.length} of {leads.length} leads
        </p>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="pl-4 pr-2 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && filtered.every(l => selected.has(l.id))}
                  ref={el => { if (el) el.indeterminate = filtered.some(l => selected.has(l.id)) && !filtered.every(l => selected.has(l.id)); }}
                  onChange={() => toggleSelectAll(filtered)}
                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                />
              </th>
              <Th col="slNo" label="Sl.No" className="w-14" />
              <Th col="date" label="Date" />
              <Th col="time" label="Time" />
              <Th col="name" label="Name" />
              <Th col="mobileNumber" label="Mobile" />
              <Th col="district" label="District" />
              <Th col="service" label="Service" />
              <Th col="amount" label="Amount" />
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Payment</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Assigned To</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-gray-400 text-sm">
                  No leads found matching your search.
                </td>
              </tr>
            ) : (
              pageItems.map((lead, index) => (
               <tr
               key={lead.id}
               onClick={() => router.push(`/leads/view?id=${lead.id}`)}
               className={`hover:bg-blue-50/30 transition-colors group cursor-pointer ${selected.has(lead.id) ? 'bg-blue-50/50' : ''}`}
               >
                  <td className="pl-4 pr-2 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-medium">{index + 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatDate(lead.date)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{lead.time || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 text-xs font-bold">{lead.name[0]}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">{lead.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 font-medium whitespace-nowrap">{lead.mobileNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{lead.district}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-40">
                    <span className="truncate block" title={lead.service}>{lead.service}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                    ₹{lead.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <PaymentBadge status={lead.paymentStatus} />
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={lead.assignedTo || 'Unassigned'}
                      onChange={(e) => updateLead(lead.id, { assignedTo: e.target.value })}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 cursor-pointer"
                    >
                      <option value="Unassigned">Select assigned user</option>
                      {employees.map((emp) => (
                        <option key={emp} value={emp}>{emp}</option>
                      ))}
                    </select>
                  </td>
                  
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-gray-50">
        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-400 text-sm">No leads found.</div>
        ) : (
          pageItems.map((lead) => (
            <Link key={lead.id} href={`/leads/view?id=${lead.id}`} className="block px-4 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold">{lead.name[0]}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{lead.name}</p>
                    <p className="text-sm text-gray-500">{lead.mobileNumber}</p>
                  </div>
                </div>
                <PaymentBadge status={lead.paymentStatus} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                <span><span className="font-medium text-gray-700">Service:</span> {lead.service}</span>
                <span><span className="font-medium text-gray-700">District:</span> {lead.district}</span>
                <span><span className="font-medium text-gray-700">Amount:</span> ₹{lead.amount.toLocaleString('en-IN')}</span>
                <span><span className="font-medium text-gray-700">Assigned:</span> {lead.assignedTo}</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">{formatDate(lead.date)}{lead.time ? ` · ${lead.time}` : ''}</p>
            </Link>
          ))
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
}
