import { PaymentStatus } from '@/lib/types';

export default function PaymentBadge({
  status,
  refundStatus,
}: {
  status: PaymentStatus;
  refundStatus?: string;
}) {
  // A refunded lead was paid first — show "Refunded" instead of "Paid".
  // Paytm may report "pending" while it processes the refund async, but the
  // money is on its way back, so treat pending as refunded (same as the detail).
  if (refundStatus === 'refunded' || refundStatus === 'pending') {
    return (
      <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
        Refunded
      </span>
    );
  }
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
