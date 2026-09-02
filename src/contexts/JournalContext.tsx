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

/**
 * `journal_entries.entry_text` holds content AND comments folded into one
 * encrypted JSON blob (see encryptJournalEntry/decryptJournalEntry) — there
 * is no way to update one without rewriting the whole column. Every write
 * below therefore re-fetches the row fresh and applies its change on top of
 * *that*, instead of trusting whatever this tab last loaded into local
 * state — otherwise an entry edited in one tab (or session) and commented
 * on in another silently loses whichever write lands second, with no
 * warning and no merge. This narrows the window to the gap between this
 * fetch and the write below (an unavoidable read-then-write gap without
 * server-side optimistic-concurrency checks or, better, giving comments
 * their own table+rows so they can't collide with content at all — see the
 * audit notes) rather than the entire lifetime of a tab.
 */
async function fetchFreshEntryBlob(
  entryId: string,
  userId: string,
): Promise<{ content: string; comments: JournalComment[] }> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('entry_text')
    .eq('id', entryId)
    .single();
  if (error) throw error;

  const decrypted = await decryptJournalEntry(
    { content: data.entry_text, comments: [] as JournalComment[] },
    userId,
  );
  return { content: decrypted.content, comments: decrypted.comments ?? [] };
}

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
      // Mood/track/weather/reflection genuinely come from this editing
      // session — that's what's being saved. Comments don't: this view
      // doesn't show or edit them (see JournalEditorInline), so carry
      // forward whatever is *actually* on the row right now rather than
      // whatever this session's `updatedEntry.comments` happens to hold
      // (typically whatever was loaded when editing started) — otherwise
      // saving an edit here can silently erase a note added elsewhere in
      // the meantime.
      const fresh = await fetchFreshEntryBlob(updatedEntry.id, userId);
      const encryptedEntry = await encryptJournalEntry(
        { ...updatedEntry, comments: fresh.comments },
        userId,
      );
      const payload = buildDbPayload(updatedEntry, encryptedEntry.content);

      const { error } = await supabase
        .from('journal_entries')
        .update({ ...payload, updated_at: now.toISOString() })
        .eq('id', updatedEntry.id);

      if (error) throw error;

      const withTimestamp = { ...updatedEntry, comments: fresh.comments, updatedAt: now.getTime() };
      setEntries(prev => prev.map(e => e.id === updatedEntry.id ? withTimestamp : e));
    } catch (error: unknown) {
      logger.error('JournalContext', 'updateEntry failed:', error);
      throw error;
    }
  }, [userId]);

  const updateEntryContent = useCallback(async (entryId: string, newContent: string) => {
    if (!userId) throw new Error('Authentication required');
    if (!entries.some(e => e.id === entryId)) throw new Error('Entry not found');

    try {
      const now = new Date();
      // Comments live in the same blob as content (see fetchFreshEntryBlob)
      // — carry forward whatever is actually on the row right now, not this
      // tab's possibly-stale local copy, so a note added elsewhere isn't
      // silently wiped out by this content autosave.
      const fresh = await fetchFreshEntryBlob(entryId, userId);
      const encryptedEntry = await encryptJournalEntry(
        { content: newContent, comments: fresh.comments },
        userId,
      );

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
          ? { ...e, content: newContent, comments: fresh.comments, updatedAt: now.getTime() }
          : e,
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
    if (!entries.some(e => e.id === entryId)) throw new Error('Entry not found');

    try {
      const now = new Date();
      const newComment: JournalComment = {
        // crypto.randomUUID(), not `comment-${Date.now()}`: two comments
        // added within the same millisecond (a double-submit, or just fast
        // clicking) previously collided on id, which the fetch-fresh merge
        // below can't protect against on its own since it's a client-side
        // key collision, not a server race.
        id: crypto.randomUUID(),
        content,
        createdAt: now.getTime(),
      };

      // See fetchFreshEntryBlob: append onto the row as it actually is
      // right now, not this tab's local snapshot.
      const fresh = await fetchFreshEntryBlob(entryId, userId);
      const nextComments = [...fresh.comments, newComment];
      const encryptedEntry = await encryptJournalEntry({ content: fresh.content, comments: nextComments }, userId);

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
          ? { ...e, content: fresh.content, comments: nextComments, updatedAt: now.getTime() }
          : e,
      ));
    } catch (error: unknown) {
      logger.error('JournalContext', 'addCommentToEntry failed:', error);
      throw error;
    }
  }, [entries, userId]);

  const deleteCommentFromEntry = useCallback(async (entryId: string, commentId: string) => {
    if (!userId) return;
    if (!entries.some(e => e.id === entryId)) throw new Error('Entry not found');

    try {
      // See fetchFreshEntryBlob: delete from the row as it actually is
      // right now, not this tab's local snapshot.
      const fresh = await fetchFreshEntryBlob(entryId, userId);
      const nextComments = fresh.comments.filter(c => c.id !== commentId);
      const encryptedEntry = await encryptJournalEntry({ content: fresh.content, comments: nextComments }, userId);

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
          ? { ...e, content: fresh.content, comments: nextComments, updatedAt: now.getTime() }
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
