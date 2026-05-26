import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { JournalEntry, Mood, JournalComment } from '@/types';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

import { encryptJournalEntry, decryptJournalEntry } from '@/utils/encryption';
import { mapDbRowToJournalEntry, buildDbPayload } from '@/utils/journalEntryMapper';
import { getLocalDate, getUtcTimestamp, getUserTimezone } from '@/utils/dateUtils';
import { logger } from '@/lib/logger';

interface JournalContextType {
  entries: JournalEntry[];
  currentEntry: JournalEntry | null;
  addEntry: (entry: JournalEntry) => Promise<void>;
  updateEntry: (entry: JournalEntry) => Promise<void>;
  updateEntryContent: (entryId: string, newContent: string) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  getEntryById: (id: string) => JournalEntry | undefined;
  getEntriesByDate: (date: string) => JournalEntry[];
  getEntriesByMood: (mood: Mood) => JournalEntry[];
  createNewEntry: (date?: string) => JournalEntry;
  setCurrentEntry: (entry: JournalEntry | null) => void;
  searchEntries: (query: string) => JournalEntry[];
  addCommentToEntry: (entryId: string, content: string) => Promise<void>;
  deleteCommentFromEntry: (entryId: string, commentId: string) => Promise<void>;
  getRandomEntries: (count: number) => JournalEntry[];
  isLoading: boolean;
}

const JournalContext = createContext<JournalContextType | undefined>(undefined);

export const useJournal = () => {
  const context = useContext(JournalContext);
  if (!context) {
    throw new Error('useJournal must be used within a JournalProvider');
  }
  return context;
};

interface JournalProviderProps {
  children: React.ReactNode;
}

export const JournalProvider = ({ children }: JournalProviderProps) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { authState } = useAuth();
  const hasLoadedEntriesRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    const fetchEntries = async () => {
      if (!authState.user) {
        setEntries([]);
        setIsLoading(false);
        hasLoadedEntriesRef.current = false;
        currentUserIdRef.current = null;
        return;
      }

      if (hasLoadedEntriesRef.current && currentUserIdRef.current === authState.user.id) {
        setIsLoading(false);
        return;
      }

      if (currentUserIdRef.current !== authState.user.id) {
        setIsLoading(true);
        
        try {
          const { data, error } = await supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', authState.user.id)
            .eq('status', 'published')
            .order('timestamp_started', { ascending: false });

          if (error) throw error;

          const transformedEntries: JournalEntry[] = [];
          
          for (const row of data) {
            const journalEntry = mapDbRowToJournalEntry(row);
            const decryptedEntry = await decryptJournalEntry(journalEntry, authState.user.id);
            transformedEntries.push(decryptedEntry);
          }

          setEntries(transformedEntries);
          hasLoadedEntriesRef.current = true;
          currentUserIdRef.current = authState.user.id;
        } catch (error: unknown) {
          logger.error('JournalContext', 'failed to load journal entries:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchEntries();
  }, [authState.user?.id]);
  
  const userId = authState.user?.id;

  const getRandomEntries = useCallback((count: number): JournalEntry[] => {
    const today = getLocalDate();
    const pastEntries = entries.filter(e => e.date !== today);
    if (pastEntries.length === 0) return [];
    const shuffled = [...pastEntries].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }, [entries]);

  const addEntry = useCallback(async (entry: JournalEntry) => {
    if (!userId) return;
    // Entry is already in DB (inserted by publishDraft) — just update local state.
    setEntries(prev => {
      const exists = prev.some(e => e.id === entry.id);
      return exists
        ? prev.map(e => e.id === entry.id ? entry : e)
        : [entry, ...prev];
    });
  }, [userId]);

  const updateEntry = useCallback(async (updatedEntry: JournalEntry) => {
    if (!userId) return;

    try {
      const now = new Date();
      const encryptedEntry = await encryptJournalEntry(updatedEntry, userId);
      const payload = buildDbPayload(updatedEntry, encryptedEntry.content);

      const { error } = await supabase
        .from('journal_entries')
        .update({ ...payload, updated_at: now.toISOString() })
        .eq('id', updatedEntry.id);

      if (error) throw error;

      const withTimestamp = { ...updatedEntry, updatedAt: now.getTime() };
      setEntries(prev => prev.map(e => e.id === updatedEntry.id ? withTimestamp : e));
    } catch (error: unknown) {
      logger.error('JournalContext', 'updateEntry failed:', error);
      throw error;
    }
  }, [userId]);

  const updateEntryContent = useCallback(async (entryId: string, newContent: string) => {
    if (!userId) throw new Error('Authentication required');

    const entryToUpdate = entries.find(e => e.id === entryId);
    if (!entryToUpdate) throw new Error('Entry not found');

    try {
      const now = new Date();
      const updatedEntry: JournalEntry = { ...entryToUpdate, content: newContent };
      const encryptedEntry = await encryptJournalEntry(updatedEntry, userId);

      const { error } = await supabase
        .from('journal_entries')
        .update({
          entry_text: encryptedEntry.content,
          updated_at: now.toISOString(),
        })
        .eq('id', entryId);

      if (error) throw error;

      setEntries(prev => prev.map(e =>
        e.id === entryId ? { ...e, content: newContent, updatedAt: now.getTime() } : e,
      ));
    } catch (error: unknown) {
      logger.error('JournalContext', 'updateEntryContent failed:', error);
      throw error;
    }
  }, [entries, userId]);

  const deleteEntry = useCallback(async (id: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase.from('journal_entries').delete().eq('id', id);
      if (error) throw error;
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (error: unknown) {
      logger.error('JournalContext', 'deleteEntry failed:', error);
      throw error;
    }
  }, [userId]);

  const getEntryById = useCallback(
    (id: string) => entries.find(e => e.id === id),
    [entries],
  );
  const getEntriesByDate = useCallback(
    (date: string) => entries.filter(e => e.date === date),
    [entries],
  );
  const getEntriesByMood = useCallback(
    (mood: Mood) => entries.filter(e => e.mood === mood),
    [entries],
  );

  const searchEntries = useCallback((query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return entries.filter(e =>
      e.content.toLowerCase().includes(lowercaseQuery) ||
      e.weather?.location?.toLowerCase().includes(lowercaseQuery) ||
      e.track?.name?.toLowerCase().includes(lowercaseQuery) ||
      e.track?.artist?.toLowerCase().includes(lowercaseQuery),
    );
  }, [entries]);

  const addCommentToEntry = useCallback(async (entryId: string, content: string) => {
    if (!userId) return;

    const entryToUpdate = entries.find(e => e.id === entryId);
    if (!entryToUpdate) throw new Error('Entry not found');

    try {
      const now = new Date();
      const newComment: JournalComment = {
        id: `comment-${Date.now()}`,
        content,
        createdAt: now.getTime(),
      };

      const updatedEntry: JournalEntry = {
        ...entryToUpdate,
        comments: [...(entryToUpdate.comments || []), newComment],
      };

      const encryptedEntry = await encryptJournalEntry(updatedEntry, userId);

      const { error } = await supabase
        .from('journal_entries')
        .update({
          entry_text: encryptedEntry.content,
          updated_at: now.toISOString(),
        })
        .eq('id', entryId);

      if (error) throw error;

      setEntries(prev => prev.map(e =>
        e.id === entryId
          ? { ...e, comments: [...(e.comments || []), newComment], updatedAt: now.getTime() }
          : e,
      ));
    } catch (error: unknown) {
      logger.error('JournalContext', 'addCommentToEntry failed:', error);
      throw error;
    }
  }, [entries, userId]);

  const deleteCommentFromEntry = useCallback(async (entryId: string, commentId: string) => {
    if (!userId) return;

    const entryToUpdate = entries.find(e => e.id === entryId);
    if (!entryToUpdate) throw new Error('Entry not found');

    try {
      const updatedComments = (entryToUpdate.comments || []).filter(c => c.id !== commentId);
      const updatedEntry: JournalEntry = { ...entryToUpdate, comments: updatedComments };
      const encryptedEntry = await encryptJournalEntry(updatedEntry, userId);

      const now = new Date();
      const { error } = await supabase
        .from('journal_entries')
        .update({
          entry_text: encryptedEntry.content,
          updated_at: now.toISOString(),
        })
        .eq('id', entryId);

      if (error) throw error;

      setEntries(prev => prev.map(e =>
        e.id === entryId
          ? { ...e, comments: updatedComments, updatedAt: now.getTime() }
          : e,
      ));
    } catch (error: unknown) {
      logger.error('JournalContext', 'deleteCommentFromEntry failed:', error);
      throw error;
    }
  }, [entries, userId]);

  const createNewEntry = useCallback((date?: string): JournalEntry => ({
    id: `temp-${Date.now()}`,
    content: '',
    date: date || getLocalDate(),
    timestamp: getUtcTimestamp(),
    timezone: getUserTimezone(),
    mood: 'neutral',
    createdAt: Date.now(),
    comments: [],
  }), []);

  const value = React.useMemo(() => ({
    entries,
    currentEntry,
    addEntry,
    updateEntry,
    updateEntryContent,
    deleteEntry,
    getEntryById,
    getEntriesByDate,
    getEntriesByMood,
    createNewEntry,
    setCurrentEntry,
    searchEntries,
    addCommentToEntry,
    deleteCommentFromEntry,
    getRandomEntries,
    isLoading,
  }), [
    entries,
    currentEntry,
    isLoading,
    addEntry,
    updateEntry,
    updateEntryContent,
    deleteEntry,
    getEntryById,
    getEntriesByDate,
    getEntriesByMood,
    createNewEntry,
    searchEntries,
    addCommentToEntry,
    deleteCommentFromEntry,
    getRandomEntries,
  ]);

  return (
    <JournalContext.Provider value={value}>
      {children}
    </JournalContext.Provider>
  );
};
