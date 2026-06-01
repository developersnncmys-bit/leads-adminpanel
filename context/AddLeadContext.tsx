'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Lead } from '@/lib/types';
import * as api from '@/lib/api';
import { useAuthUser } from '@/lib/useAuthUser';

interface AddLeadContextType {
  open: boolean;
  openModal: () => void;
  closeModal: () => void;
  leads: Lead[];
  loading: boolean;
  addLead: (lead: Lead) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  addNote: (id: string, text: string, author?: string) => void;
  refresh: () => void;
}

const AddLeadContext = createContext<AddLeadContextType>({
  open: false,
  openModal: () => {},
  closeModal: () => {},
  leads: [],
  loading: true,
  addLead: () => {},
  updateLead: () => {},
  deleteLead: () => {},
  addNote: () => {},
  refresh: () => {},
});

export function AddLeadProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthUser();
  const [open, setOpen] = useState(false);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setAllLeads(await api.listLeads());
    } catch {
      // Silent — keep showing the leads we already have. Console.error here
      // would trigger Next.js's dev runtime overlay on every poll cycle
      // whenever the API is briefly unreachable (cold start, offline, etc).
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Poll the API every 10 seconds so a lead submitted on the website rings
  // the admin-panel chime within that window. .catch() is defensive: refresh
  // already swallows its own errors, but we never want the unawaited promise
  // here to surface as an unhandled rejection.
  useEffect(() => {
    const id = setInterval(() => { refresh().catch(() => {}); }, 10_000);
    return () => clearInterval(id);
  }, [refresh]);

  const addLead = async (lead: Lead) => {
    try {
      const created = await api.createLead(lead);
      setAllLeads((prev) => [created, ...prev]);
    } catch (err) {
      console.error('Failed to add lead:', err);
    }
  };

  // Optimistic update, then reconcile with the saved document. On failure we
  // re-fetch so the UI never drifts from the backend.
  const updateLead = async (id: string, updates: Partial<Lead>) => {
    setAllLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
    try {
      const saved = await api.updateLead(id, updates);
      setAllLeads((prev) => prev.map((l) => (l.id === id ? saved : l)));
    } catch (err) {
      console.error('Failed to update lead:', err);
      refresh();
    }
  };

  const deleteLead = async (id: string) => {
    setAllLeads((prev) => prev.filter((l) => l.id !== id));
    try {
      await api.deleteLead(id);
    } catch (err) {
      console.error('Failed to delete lead:', err);
      refresh();
    }
  };

  // Append a single note via the backend's $push endpoint. Existing notes'
  // timestamps are preserved (a full PATCH of the notes array would rewrite
  // them when Mongoose recreates the subdocuments).
  const addNote = async (id: string, text: string, author = 'Admin') => {
    try {
      const saved = await api.addLeadNote(id, text, author);
      setAllLeads((prev) => prev.map((l) => (l.id === id ? saved : l)));
    } catch (err) {
      console.error('Failed to add note:', err);
      refresh();
    }
  };

  // Employees only see leads assigned to them; admins (and the brief moment
  // before auth loads) see everything.
  const leads = (auth.role && auth.role !== 'admin')
    ? allLeads.filter((l) => l.assignedTo === auth.name)
    : allLeads;

  return (
    <AddLeadContext.Provider value={{
      open,
      openModal: () => setOpen(true),
      closeModal: () => setOpen(false),
      leads,
      loading,
      addLead,
      updateLead,
      deleteLead,
      addNote,
      refresh,
    }}>
      {children}
    </AddLeadContext.Provider>
  );
}

export const useAddLead = () => useContext(AddLeadContext);
