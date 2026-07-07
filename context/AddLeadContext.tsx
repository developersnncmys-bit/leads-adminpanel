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
  // Authoritative counts from the server (accurate regardless of the in-memory
  // list, which can be large/slow to load). Null until first fetched.
  stats: api.LeadStats | null;
  addLead: (lead: Lead) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  addNote: (id: string, text: string, author?: string) => void;
  refresh: () => void;
  // Re-fetch the authoritative counts immediately (e.g. right after a delete)
  // so the sidebar/dashboard numbers update without waiting for the 10s poll.
  reloadStats: () => void;
}

const AddLeadContext = createContext<AddLeadContextType>({
  open: false,
  openModal: () => {},
  closeModal: () => {},
  leads: [],
  loading: true,
  stats: null,
  addLead: () => {},
  updateLead: () => {},
  deleteLead: () => {},
  addNote: () => {},
  refresh: () => {},
  reloadStats: () => {},
});

export function AddLeadProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthUser();
  const [open, setOpen] = useState(false);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<api.LeadStats | null>(null);

  // Employees see only their own counts; admins see the whole pipeline.
  const scopeArg = auth.role && auth.role !== 'admin' ? auth.name : undefined;

  // Mirror of allLeads.length, kept in a ref so the poll can compare against it
  // without re-creating the interval on every list change.
  const countRef = useRef(0);
  useEffect(() => { countRef.current = allLeads.length; }, [allLeads]);

  // Last-seen follow-up bucket signature. The overdue/today/followup buckets are
  // derived from each lead's follow-up date, so a lead can move (followup→today
  // →overdue, e.g. at midnight) WITHOUT the total changing. We must re-fetch the
  // list then too — otherwise the tab count (from fresh stats) shows leads but
  // the tab list (stale cached array) is empty.
  const bucketRef = useRef('');

  // Full (lean) list fetch. The list endpoint omits formData, so this stays
  // small even with ~18k leads. We only call it on first load and whenever the
  // server-side count changes — NOT every 10s, which would re-download MBs.
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

  // Cheap, authoritative counts. Also the new-lead detector: if the global total
  // changed, re-fetch the (heavy) list once. Counts come from here — never from
  // counting the in-memory array — so they're always correct even mid-load.
  const loadStats = useCallback(async () => {
    try {
      const global = await api.getLeadStats();
      const bucketSig = `${global.overdue}-${global.today}-${global.followup}`;
      if (global.total !== countRef.current || bucketSig !== bucketRef.current) {
        await refresh();
      }
      bucketRef.current = bucketSig;
      // Don't show counts until we know who's logged in, otherwise an employee
      // briefly sees the admin's (global) numbers before auth finishes loading.
      if (!auth.role) { setStats(null); return; }
      setStats(scopeArg ? await api.getLeadStats(scopeArg) : global);
    } catch {
      // ignore transient errors (cold start / offline)
    }
  }, [refresh, scopeArg, auth.role]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { loadStats(); }, [loadStats]);

  // Poll the cheap stats every 10s (drives counts + new-lead chime).
  useEffect(() => {
    const id = setInterval(() => { loadStats(); }, 10_000);
    return () => clearInterval(id);
  }, [loadStats]);

  // Background tabs throttle timers — re-check on focus.
  useEffect(() => {
    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadStats();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisible);
      return () => document.removeEventListener('visibilitychange', onVisible);
    }
  }, [loadStats]);

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

  // Until auth loads (role === ''), show NOTHING — otherwise an employee
  // flashes the full admin list for a moment. Admin → everything;
  // employee → only their own leads.
  const leads = !auth.role
    ? []
    : auth.role === 'admin'
      ? allLeads
      : allLeads.filter((l) => l.assignedTo === auth.name);

  return (
    <AddLeadContext.Provider value={{
      open,
      openModal: () => setOpen(true),
      closeModal: () => setOpen(false),
      leads,
      loading,
      stats,
      addLead,
      updateLead,
      deleteLead,
      addNote,
      refresh,
      reloadStats: loadStats,
    }}>
      {children}
    </AddLeadContext.Provider>
  );
}

export const useAddLead = () => useContext(AddLeadContext);
