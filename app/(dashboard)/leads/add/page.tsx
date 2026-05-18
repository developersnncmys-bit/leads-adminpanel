'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, CheckCircle } from 'lucide-react';
import { SERVICES, DISTRICTS, LEAD_SOURCES } from '@/lib/constants';
import { MOCK_USERS } from '@/lib/mockData';
import type { User } from '@/lib/types';

interface FormData {
  name: string;
  email: string;
  mobileNumber: string;
  district: string;
  service: string;
  amount: string;
  address: string;
  source: string;
  assignedTo: string;
  followUpDate: string;
}


const INITIAL: FormData = {
  name: '', email: '', mobileNumber: '', district: '',
  service: '', amount: '', address: '', source: '',
  assignedTo: '', followUpDate: '',
};

// Defined outside the page component so React doesn't remount it on every render
function Field({
  label, required, error, children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}

const inputCls = (err?: string) =>
  `w-full px-3.5 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all text-gray-900 placeholder-gray-400 ${
    err ? 'border-red-300 focus:ring-red-400' : 'border-gray-200'
  }`;

export default function AddLeadPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [employees, setEmployees] = useState<string[]>(() =>
    MOCK_USERS.filter((u) => u.role === 'employee').map((u) => u.name)
  );

  useEffect(() => {
    const stored = localStorage.getItem('crm-users');
    if (stored) {
      const users: User[] = JSON.parse(stored);
      setEmployees(users.filter((u) => u.role === 'employee').map((u) => u.name));
    }
  }, []);

  const set = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const e: Partial<FormData> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.mobileNumber.trim()) e.mobileNumber = 'Mobile number is required';
    else if (!/^\d{10}$/.test(form.mobileNumber)) e.mobileNumber = 'Enter a valid 10-digit number';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.service) e.service = 'Please select a service';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSuccess(true);
    setTimeout(() => { setSuccess(false); setForm(INITIAL); }, 3000);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Lead Added Successfully!</h2>
        <p className="text-gray-500 text-sm">The lead has been added to New Leads.</p>
        <div className="flex gap-3 mt-2">
          <button onClick={() => setSuccess(false)} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">
            Add Another
          </button>
          <button onClick={() => router.push('/leads/new')} className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
            View New Leads
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Add New Lead</h1>
          <p className="text-sm text-gray-500">Fill in the lead details below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">

        {/* Contact Information */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-4">Contact Information</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" required error={errors.name}>
              <input
                type="text"
                placeholder="Enter full name"
                value={form.name}
                onChange={set('name')}
                className={inputCls(errors.name)}
              />
            </Field>

            <Field label="Email ID" error={errors.email}>
              <input
                type="email"
                placeholder="Enter email address"
                value={form.email}
                onChange={set('email')}
                className={inputCls(errors.email)}
              />
            </Field>

            <Field label="Mobile Number" required error={errors.mobileNumber}>
              <input
                type="tel"
                placeholder="10-digit mobile number"
                value={form.mobileNumber}
                onChange={set('mobileNumber')}
                maxLength={10}
                className={inputCls(errors.mobileNumber)}
              />
            </Field>

            <Field label="District">
              <select value={form.district} onChange={set('district')} className={inputCls()}>
                <option value="">Select district</option>
                {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>

            <Field label="Address">
              <textarea
                placeholder="Enter full address"
                value={form.address}
                onChange={set('address')}
                rows={2}
                className={`${inputCls()} resize-none`}
              />
            </Field>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Service Details */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-4">Service Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Service" required error={errors.service}>
              <select value={form.service} onChange={set('service')} className={inputCls(errors.service)}>
                <option value="">Select a service</option>
                {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>

            <Field label="Amount (₹)">
              <input
                type="number"
                placeholder="Enter amount"
                value={form.amount}
                onChange={set('amount')}
                min={0}
                className={inputCls()}
              />
            </Field>

            <Field label="Lead Source">
              <select value={form.source} onChange={set('source')} className={inputCls()}>
                <option value="">Select source</option>
                {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Assignment */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-4">Assignment</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Assign To">
              <select value={form.assignedTo} onChange={set('assignedTo')} className={inputCls()}>
                <option value="">Select employee</option>
                {employees.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </Field>

            <Field label="Follow-up Date">
              <input
                type="date"
                value={form.followUpDate}
                onChange={set('followUpDate')}
                className={inputCls()}
              />
            </Field>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-200"
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <UserPlus className="w-4 h-4" />
            }
            {loading ? 'Adding Lead...' : 'Add Lead'}
          </button>
          <button
            type="button"
            onClick={() => { setForm(INITIAL); setErrors({}); }}
            className="px-6 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}
