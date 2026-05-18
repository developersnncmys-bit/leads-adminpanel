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
}

const AddLeadContext = createContext<AddLeadContextType>({
  open: false,
  openModal: () => {},
  closeModal: () => {},
  leads: [],
  addLead: () => {},
});

function loadLeads(): Lead[] {
  if (typeof window === 'undefined') return MOCK_LEADS;
  try {
    const stored = localStorage.getItem('crm-leads');
    if (!stored) return MOCK_LEADS;
    const parsed: Lead[] = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : MOCK_LEADS;
  } catch {
    return MOCK_LEADS;
  }
}

export function AddLeadProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>(loadLeads);

  const addLead = (lead: Lead) => {
    setLeads((prev) => {
      const next = [lead, ...prev];
      localStorage.setItem('crm-leads', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AddLeadContext.Provider value={{
      open,
      openModal: () => setOpen(true),
      closeModal: () => setOpen(false),
      leads,
      addLead,
    }}>
      {children}
    </AddLeadContext.Provider>
  );
}

export const useAddLead = () => useContext(AddLeadContext);
