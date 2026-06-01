// Light-colored badge for a lead's service. Each service gets its own pastel
// background + matching darker text. Mirrors the PaymentBadge pattern so the
// table reads visually as a series of tinted chips instead of plain text.

const SERVICE_COLORS: Record<string, string> = {
  'Insurance':                             'bg-blue-50 text-blue-700 border-blue-100',
  'Tourist Visa':                          'bg-teal-50 text-teal-700 border-teal-100',
  'Rental Agreement':                      'bg-amber-50 text-amber-700 border-amber-100',
  'Lease Agreement':                       'bg-yellow-50 text-yellow-700 border-yellow-100',
  'Passport':                              'bg-indigo-50 text-indigo-700 border-indigo-100',
  'PAN Card':                              'bg-emerald-50 text-emerald-700 border-emerald-100',
  'Senior Citizen Card':                   'bg-rose-50 text-rose-700 border-rose-100',
  'Police Verification Certificate (PVC)': 'bg-violet-50 text-violet-700 border-violet-100',
  'MSME Certificate':                      'bg-cyan-50 text-cyan-700 border-cyan-100',
  'Police Clearance Certificate (PCC)':    'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
  'Affidavits/Annexure':                   'bg-orange-50 text-orange-700 border-orange-100',
};

const FALLBACK = 'bg-gray-100 text-gray-700 border-gray-200';

export default function ServiceBadge({ service }: { service: string }) {
  const cls = SERVICE_COLORS[service] ?? FALLBACK;
  return (
    <span
      className={`inline-flex items-center max-w-full text-xs font-semibold px-2.5 py-1 rounded-lg border ${cls}`}
      title={service}
    >
      <span className="truncate">{service}</span>
    </span>
  );
}
