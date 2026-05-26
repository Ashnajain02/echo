import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { JournalEntry } from '@/types';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { encryptJournalEntry, decryptJournalEntry } from '@/utils/encryption';
import { mapDbRowToJournalEntry, buildDbPayload, hasMeaningfulContent, getPlainTextContent } from '@/utils/journalEntryMapper';
import { getLocalDate, getUtcTimestamp, getUserTimezone } from '@/utils/dateUtils';
import { logger } from '@/lib/logger';

interface DraftsContextType {
  drafts: JournalEntry[];
  isLoadingDrafts: boolean;
  currentDraft: JournalEntry | null;
  saveDraft: (entry: JournalEntry) => Promise<string | null>;
  deleteDraft: (draftId: string) => Promise<void>;
  publishDraft: (entry: JournalEntry, addToContext: (entry: JournalEntry) => Promise<void>) => Promise<void>;
  loadDraft: (draftId: string) => void;
  clearCurrentDraft: () => void;
  createNewDraft: () => JournalEntry;
  autoSaveDraft: (entry: JournalEntry, onIdChanged?: (newId: string) => void) => void;
  lastAutoSave: Date | null;
  reloadDrafts: () => void;
}

const DraftsContext = createContext<DraftsContextType | undefined>(undefined);

export function useDrafts(): DraftsContextType {
  const context = useContext(DraftsContext);
  if (!context) {
    throw new Error('useDrafts must be used within a DraftsProvider');
  }
  return context;
}

export function DraftsProvider({ children }: { children: React.ReactNode }) {
  const { authState } = useAuth();
  const [drafts, setDrafts] = useState<JournalEntry[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<JournalEntry | null>(null);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Load drafts from DB ──

  const loadDrafts = useCallback(async () => {
    if (!authState.user) return;

    setIsLoadingDrafts(true);
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', authState.user.id)
        .eq('status', 'draft')
        .order('updated_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const decryptedDrafts: JournalEntry[] = [];
      for (const row of data || []) {
        const journalEntry = mapDbRowToJournalEntry(row);
        const decrypted = await decryptJournalEntry(journalEntry, authState.user.id);
        decryptedDrafts.push(decrypted);
      }

      setDrafts(decryptedDrafts);
    } catch (error: unknown) {
      logger.error('DraftsContext', 'failed to load drafts:', error);
    } finally {
      setIsLoadingDrafts(false);
    }
  }, [authState.user]);

  useEffect(() => {
    if (authState.user) {
      loadDrafts();
    } else {
      setDrafts([]);
    }
  }, [authState.user, loadDrafts]);

  // ── Create new draft (in-memory only, no DB hit) ──

  const createNewDraft = useCallback((): JournalEntry => {
    return {
      id: `draft-${Date.now()}`,
      content: '',
      date: getLocalDate(),
      timestamp: getUtcTimestamp(),
      timezone: getUserTimezone(),
      mood: 'neutral',
      createdAt: Date.now(),
    };
  }, []);

  // ── Save draft to DB (insert or update) ──
  // Returns the real DB id of the saved draft.

  const saveDraft = useCallback(async (entry: JournalEntry): Promise<string | null> => {
    if (!authState.user) return null;
    if (!hasMeaningfulContent(entry)) return null;

    try {
      const encryptedEntry = await encryptJournalEntry(entry, authState.user.id);
      const payload = buildDbPayload(entry, encryptedEntry.content);
      const isTempId = entry.id.startsWith('draft-');

      if (!isTempId) {
        // Already has a real DB id — just update
        const { error } = await supabase
          .from('journal_entries')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', entry.id);

        if (error) throw error;

        const saved = { ...entry, updatedAt: Date.now() };
        setDrafts(prev => [saved, ...prev.filter(d => d.id !== entry.id)]);
        setLastAutoSave(new Date());
        return entry.id;
      }

      // Temp id — check if a draft row already exists for this timestamp
      // (handles the case where a previous save created a row but the callback
      // to update the in-memory id hasn't fired yet)
      const { data: existing } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('user_id', authState.user.id)
        .eq('timestamp_started', entry.timestamp)
        .eq('status', 'draft')
        .maybeSingle();

      let savedId: string;

      if (existing) {
        const { error } = await supabase
          .from('journal_entries')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
        savedId = existing.id;
      } else {
        const { data, error } = await supabase
          .from('journal_entries')
          .insert({
            user_id: authState.user.id,
            ...payload,
            status: 'draft',
            timestamp_started: entry.timestamp,
            timezone: entry.timezone || getUserTimezone(),
            updated_at: new Date().toISOString(),
          })
          .select('id, created_at')
          .single();
        if (error) throw error;
        savedId = data.id;
      }

      const saved = { ...entry, id: savedId, updatedAt: Date.now() };
      setDrafts(prev => [saved, ...prev.filter(d => d.id !== savedId && d.id !== entry.id)]);
      setCurrentDraft(saved);
      setLastAutoSave(new Date());
      return savedId;
    } catch (error: unknown) {
      logger.error('DraftsContext', 'failed to save draft:', error);
      return null;
    }
  }, [authState.user]);

  // ── Auto-save (debounced 1s) ──

  const autoSaveDraft = useCallback((entry: JournalEntry, onIdChanged?: (newId: string) => void) => {
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);

    autoSaveTimeoutRef.current = setTimeout(async () => {
      const savedId = await saveDraft(entry);
      if (savedId && entry.id.startsWith('draft-') && savedId !== entry.id) {
        onIdChanged?.(savedId);
      }
    }, 1000);
  }, [saveDraft]);

  // ── Delete draft ──

  const deleteDraft = useCallback(async (draftId: string) => {
    if (!authState.user) return;

    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);

    // If it's a temp id that was never saved, just clear local state
    if (draftId.startsWith('draft-')) {
      // Check if it was saved to DB by looking it up
      const { data: existing } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('user_id', authState.user.id)
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!existing) {
        // Never saved — just clear local state
        setDrafts(prev => prev.filter(d => d.id !== draftId));
        setCurrentDraft(null);
        return;
      }
      // Was saved — delete from DB using real id
      draftId = existing.id;
    }

    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', draftId);

      if (error) throw error;

      setDrafts(prev => prev.filter(d => d.id !== draftId));
      if (currentDraft?.id === draftId) setCurrentDraft(null);

    } catch (error: unknown) {
      logger.error('DraftsContext', 'failed to delete draft:', error);
    }
  }, [authState.user, currentDraft]);

  // ── Publish draft ──
  // Simple flow: cancel auto-save → ensure draft is saved → flip status to published.

  const publishDraft = useCallback(async (entry: JournalEntry, addToContext: (entry: JournalEntry) => Promise<void>) => {
    if (!authState.user) return;

    if (!getPlainTextContent(entry.content)) {
      return;
    }

    // 1. Cancel any pending auto-save
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);

    try {
      // 2. Ensure draft is saved to DB with latest content (synchronous final save)
      const savedId = await saveDraft(entry);

      if (savedId) {
        // 3. Draft exists in DB — just flip status to published
        const encryptedEntry = await encryptJournalEntry(entry, authState.user.id);
        const payload = buildDbPayload(entry, encryptedEntry.content);

        const { error } = await supabase
          .from('journal_entries')
          .update({ ...payload, status: 'published', updated_at: new Date().toISOString() })
          .eq('id', savedId);

        if (error) throw error;

        const publishedEntry: JournalEntry = { ...entry, id: savedId };
        await addToContext(publishedEntry);
        setDrafts(prev => prev.filter(d => d.id !== savedId && d.id !== entry.id));
      } else {
        // saveDraft returned null (no meaningful content or already handled)
        // Insert directly as published
        const encryptedEntry = await encryptJournalEntry(entry, authState.user.id);
        const payload = buildDbPayload(entry, encryptedEntry.content);

        const { data, error } = await supabase
          .from('journal_entries')
          .insert([{
            user_id: authState.user.id,
            ...payload,
            status: 'published',
            timestamp_started: entry.timestamp,
            timezone: entry.timezone || getUserTimezone(),
          }])
          .select()
          .single();

        if (error) throw error;

        const publishedEntry: JournalEntry = {
          ...entry,
          id: data.id,
          createdAt: new Date(data.created_at).getTime(),
        };
        await addToContext(publishedEntry);
        setDrafts(prev => prev.filter(d => d.id !== entry.id));
      }

      setCurrentDraft(null);
    } catch (error: unknown) {
      logger.error('DraftsContext', 'failed to publish draft:', error);
    }
  }, [authState.user, saveDraft]);

  // ── Load/clear draft ──

  const loadDraft = useCallback((draftId: string) => {
    const draft = drafts.find(d => d.id === draftId);
    if (draft) {
      setCurrentDraft(draft);
    }
  }, [drafts]);

  const clearCurrentDraft = useCallback(() => {
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    setCurrentDraft(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, []);

  const value: DraftsContextType = {
    drafts,
    isLoadingDrafts,
    currentDraft,
    saveDraft,
    deleteDraft,
    publishDraft,
    loadDraft,
    clearCurrentDraft,
    createNewDraft,
    autoSaveDraft,
    lastAutoSave,
    reloadDrafts: loadDrafts,
  };

  return (
    <DraftsContext.Provider value={value}>
      {children}
    </DraftsContext.Provider>
  );
}
