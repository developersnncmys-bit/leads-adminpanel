'use client';

import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { canUseOperations } from '@/lib/opsConfig';

// Renders the Operations pages only for admins and the Operations role.
export default function OpsGate({ children }: { children: (role: string) => React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    try { setRole(JSON.parse(localStorage.getItem('crm-auth') || '{}')?.role || ''); } catch { setRole(''); }
  }, []);

  if (role === null) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div>;
  }
  if (!canUseOperations(role)) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
        <ShieldCheck className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-bold text-gray-900">Operations team only</p>
        <p className="text-sm text-gray-400 mt-1">Ask an admin to give your account the Operations role in Team Settings.</p>
      </div>
    );
  }
  return <>{children(role)}</>;
}
