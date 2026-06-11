'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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

  // Mirror of allLeads.length, kept in a ref so the poll can compare against it
  // without re-creating the interval on every list change.
  const countRef = useRef(0);
  useEffect(() => { countRef.current = allLeads.length; }, [allLeads]);

  // Full (lean) list fetch. The list endpoint omits formData, so this stays
  // small even with ~18k leads. We only call it on first load and whenever the
  // server-side count changes (see the stats poll below) — NOT every 10s, which
  // would re-download megabytes repeatedly.
  const refresh = useCallback(async () => {
    try {
      const leads = await api.listLeads();
      setAllLeads(leads);
      countRef.current = leads.length;
    } catch {
      // Silent — keep showing the leads we already have.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Poll only the cheap stats every 10s. If the total lead count changed (a new
  // website lead arrived, or one was removed), re-fetch the full list — which
  // updates the chime/notifications. Otherwise we skip the heavy download.
  useEffect(() => {
    const check = async () => {
      try {
        const stats = await api.getLeadStats();
        if (stats.total !== countRef.current) await refresh();
      } catch {
        // ignore transient errors (cold start / offline)
      }
    };
    const id = setInterval(check, 10_000);
    return () => clearInterval(id);
  }, [refresh]);

  // When the tab regains focus, re-check immediately (background tabs throttle
  // timers), refetching only if the count drifted.
  useEffect(() => {
    const onVisible = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        try {
          const stats = await api.getLeadStats();
          if (stats.total !== countRef.current) await refresh();
        } catch { /* ignore */ }
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisible);
      return () => document.removeEventListener('visibilitychange', onVisible);
    }
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
