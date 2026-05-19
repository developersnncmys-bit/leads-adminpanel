'use client';

import { createContext, useContext, useState } from 'react';
import { MOCK_LEADS } from '@/lib/mockData';
import type { Lead } from '@/lib/types';

interface AddLeadContextType {
  open: boolean;
  openModal: () => void;
  closeModal: () => void;
  leads: Lead[];
  addLead: (lead: Lead) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
}

const AddLeadContext = createContext<AddLeadContextType>({
  open: false,
  openModal: () => {},
  closeModal: () => {},
  leads: [],
  addLead: () => {},
  updateLead: () => {},
  deleteLead: () => {},
});

function loadLeads(): Lead[] {
  if (typeof window === 'undefined') return MOCK_LEADS;
  try {
    const stored = localStorage.getItem('crm-leads');
    if (!stored) return MOCK_LEADS;
    const parsed: Lead[] = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) return MOCK_LEADS;
    // Stale check: if any non-admin lead is missing orderId it was saved before
    // the formData update — reset to fresh mock data so all fields are visible.
    const isStale = parsed.some(
     (l) => l.leadType !== 'manual' && !l.orderId
    );
    if (isStale) {
      // Preserve admin-added leads, replace website mock leads with fresh ones
      const manualLeads = parsed.filter((l) => l.leadType === 'manual');
      const fresh = [...manualLeads, ...MOCK_LEADS];
      localStorage.setItem('crm-leads', JSON.stringify(fresh));
      return fresh;
    }
    return parsed;
  } catch {
    return MOCK_LEADS;
  }
}

export function AddLeadProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>(loadLeads);

  const persist = (next: Lead[]) => {
    localStorage.setItem('crm-leads', JSON.stringify(next));
    return next;
  };

  const addLead = (lead: Lead) =>
    setLeads((prev) => persist([lead, ...prev]));

  const updateLead = (id: string, updates: Partial<Lead>) =>
    setLeads((prev) => persist(prev.map((l) => l.id === id ? { ...l, ...updates } : l)));

  const deleteLead = (id: string) =>
    setLeads((prev) => persist(prev.filter((l) => l.id !== id)));

  return (
    <AddLeadContext.Provider value={{
      open,
      openModal: () => setOpen(true),
      closeModal: () => setOpen(false),
      leads,
      addLead,
      updateLead,
      deleteLead,
    }}>
      {children}
    </AddLeadContext.Provider>
  );
}

export const useAddLead = () => useContext(AddLeadContext);
