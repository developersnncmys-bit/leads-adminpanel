'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, CheckCircle } from 'lucide-react';
import { useAddLead } from '@/context/AddLeadContext';
import { useAuthUser } from '@/lib/useAuthUser';
import { SERVICES, LEAD_SOURCES } from '@/lib/constants';
import type { Lead } from '@/lib/types';


interface FormData {
  name: string;
  email: string;
  mobileNumber: string;
  service: string;
  address: string;
  source: string;
}

const INITIAL: FormData = {
  name: '',
  email: '',
  mobileNumber: '',
  service: '',
  address: '',
  source: '',
};

// Field defined outside to prevent remount on each render
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
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

const inputCls = (err?: string) =>
  `w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all text-gray-900 placeholder-gray-400 ${
    err ? 'border-red-300 focus:ring-red-400' : 'border-gray-200'
  }`;

export default function AddLeadModal() {
  const { open, closeModal, addLead, leads } = useAddLead();
  const auth = useAuthUser();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  

  

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeModal]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const set = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const e: Partial<FormData> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.mobileNumber.trim()) e.mobileNumber = 'Required';
    else if (!/^\d{10}$/.test(form.mobileNumber)) e.mobileNumber = 'Enter valid 10-digit number';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.service) e.service = 'Please select a service';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    const newLead: Lead = {
    slNo: leads.length + 1,
    id: crypto.randomUUID(),

    name: form.name,
    email: form.email,
    mobileNumber: form.mobileNumber,

    district: '',
    service: form.service,

    amount: 0,

    address: form.address,

    source: form.source,

    // Employees who create a lead get it auto-assigned to themselves so it
    // shows up in their own filtered list. Admins leave it Unassigned so
    // they can pick the right employee from the lead's detail page later.
    assignedTo: auth.role === 'employee' && auth.name ? auth.name : 'Unassigned',

    followUpDate: '',

    status: 'new',

    paymentStatus: 'unpaid',

    date: new Date().toISOString().split('T')[0],
    notes: [],
    createdAt: new Date().toISOString(),
    leadType: 'manual',
    };
    addLead(newLead);
    setLoading(false);
    setSuccess(true);
  };

  const handleClose = () => {
    closeModal();
    setTimeout(() => { setForm(INITIAL); setErrors({}); setSuccess(false); }, 300);
  };

  const handleAddAnother = () => {
    setForm(INITIAL);
    setErrors({});
    setSuccess(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Add New Lead</h2>
              <p className="text-xs text-gray-400">Fill in the details below</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {success ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Lead Added Successfully!</h3>
              <p className="text-sm text-gray-400">The lead has been added to New Leads.</p>
              <div className="flex gap-3 mt-1">
                <button
                  onClick={handleAddAnother}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Add Another
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form id="add-lead-form" onSubmit={handleSubmit} className="space-y-5">

              {/* Contact */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Contact Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Full Name" required error={errors.name}>
                    <input type="text" placeholder="Enter full name" value={form.name} onChange={set('name')} className={inputCls(errors.name)} />
                  </Field>
                  <Field label="Email ID" error={errors.email}>
                    <input type="email" placeholder="Enter email address" value={form.email} onChange={set('email')} className={inputCls(errors.email)} />
                  </Field>
                  <Field label="Mobile Number" required error={errors.mobileNumber}>
                    <input type="tel" placeholder="10-digit mobile number" value={form.mobileNumber} onChange={set('mobileNumber')} maxLength={10} className={inputCls(errors.mobileNumber)} />
                  </Field>
                  <Field label="Address">
                    <textarea placeholder="Enter address" value={form.address} onChange={set('address')} rows={2} className={`${inputCls()} resize-none`} />
                  </Field>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Service */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Service Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Service" required error={errors.service}>
                    <select value={form.service} onChange={set('service')} className={inputCls(errors.service)}>
                      <option value="">Select a service</option>
                      {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
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

              
            </form>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-lead-form"
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-200"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <UserPlus className="w-4 h-4" />
              }
              {loading ? 'Adding...' : 'Add Lead'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
