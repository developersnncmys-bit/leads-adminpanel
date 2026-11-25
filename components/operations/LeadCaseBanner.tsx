'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, ArrowRight } from 'lucide-react';
import * as api from '@/lib/api';
import type { OpsCase } from '@/lib/types';
import { useAuthUser } from '@/lib/useAuthUser';
import { canUseOperations, statusInfo } from '@/lib/opsConfig';

// On a converted lead: shows the operations case it was handed over as.
export default function LeadCaseBanner({ leadId, status, phone }: { leadId: string; status: string; phone?: string }) {
  const user = useAuthUser();
  const [c, setC] = useState<OpsCase | null>(null);

  useEffect(() => {
    if (status !== 'converted' || !leadId) { setC(null); return; }
    let active = true;
    const load = (retry: boolean) =>
      api.getCaseByLead(leadId)
        .then((x) => {
          if (!active) return;
          setC(x);
          // The case is created right after conversion — check once more.
          if (!x && retry) setTimeout(() => load(false), 1500);
        })
        .catch(() => {});
    load(true);
    return () => { active = false; };
  }, [leadId, status]);

  if (status !== 'converted' || !c) return null;
  const st = statusInfo(c.status);

  return (
    <div className="flex flex-wrap items-center gap-3 bg-teal-50 border border-teal-100 rounded-2xl px-4 py-3">
      <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center flex-shrink-0">
        <Briefcase className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">
          Handed over to Operations · Case #{c.caseNo}
          <span className={`ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.short}</span>
        </p>
        <p className="text-xs text-gray-500">{c.handledBy ? `Handled by ${c.handledBy}` : 'Not yet assigned to a team member'}</p>
      </div>
      {canUseOperations(user.role) && (
        <Link
          href={`/operations/cases?q=${encodeURIComponent(phone || c.phone || c.name)}`}
          className="text-xs font-semibold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1"
        >
          Open case <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}
