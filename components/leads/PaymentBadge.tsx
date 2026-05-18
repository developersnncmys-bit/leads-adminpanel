import { PaymentStatus } from '@/lib/types';

export default function PaymentBadge({ status }: { status: PaymentStatus }) {
  return status === 'paid' ? (
    <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
      Paid
    </span>
  ) : (
    <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
      Unpaid
    </span>
  );
}
