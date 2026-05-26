import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useJournal } from '@/contexts/JournalContext';
import { supabase } from '@/integrations/supabase/client';
import type { JournalEntry, TemperatureUnit } from '@/types';
import { formatTemperature } from '@/utils/temperature';
import { logger } from '@/lib/logger';

interface UserPreferences {
  temperature_unit: TemperatureUnit | null;
  disable_song_blur: boolean | null;
}

interface UseEntryStateOptions {
  entry: JournalEntry;
  isPreview: boolean;
  initialWeatherEnabled?: boolean;
}

/**
 * Shared state and handlers for a published journal entry. Used by both the
 * card layout (Memories scroll) and the full-view layout (editorial page).
 *
 * Co-locates everything that's "per-entry, shared between layouts":
 *   - edit-mode toggle
 *   - song click-to-play tracking (drives content blur)
 *   - debounced content saving (TipTap checklist toggles, etc.)
 *   - weather-enabled state synced from an intersection observer parent
 *   - user preference fetch (temperature unit, blur preference)
 *   - delete / comment handlers wired to JournalContext
 *
 * Returns are plain React state + callbacks; no JSX. Components compose this
 * with their layout-specific concerns (e.g. the card layout adds its own
 * `useWeatherAnimation` for the in-card animation button).
 */
export function useEntryState({ entry, isPreview, initialWeatherEnabled }: UseEntryStateOptions) {
  const { authState } = useAuth();
  const { deleteEntry, addCommentToEntry, deleteCommentFromEntry, updateEntryContent } = useJournal();

  const [isEditing, setIsEditing] = useState(false);
  const [hasClickedToPlay, setHasClickedToPlay] = useState(false);
  const [weatherEnabled, setWeatherEnabled] = useState(initialWeatherEnabled ?? true);
  const [localContent, setLocalContent] = useState(entry.content);

  const contentRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef(entry.content);

  // Auto-enable weather when the parent observer reports the entry is in view.
  // Intentionally one-way: scrolling out (or expanding the Notes section, which
  // shrinks the intersection ratio) MUST NOT auto-disable. Toggling off is the
  // user's job via the "Weather on/off" button.
  useEffect(() => {
    if (initialWeatherEnabled === true) {
      setWeatherEnabled(true);
    }
  }, [initialWeatherEnabled]);

  // Sync local content when entry.content changes externally (e.g. another
  // tab edits it). Compare against last-saved so we don't clobber in-flight
  // local edits.
  useEffect(() => {
    if (entry.content !== lastSavedContentRef.current) {
      setLocalContent(entry.content);
      lastSavedContentRef.current = entry.content;
    }
  }, [entry.content]);

  // Cleanup debounce timer on unmount.
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleContentChange = useCallback((newContent: string) => {
    setLocalContent(newContent);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (newContent === lastSavedContentRef.current) return;
      try {
        await updateEntryContent(entry.id, newContent);
        lastSavedContentRef.current = newContent;
      } catch (error) {
        logger.error('useEntryState', 'failed to save inline content edit:', error);
        // Roll back optimistic update so the UI doesn't show unsaved state.
        setLocalContent(lastSavedContentRef.current);
      }
    }, 300);
  }, [entry.id, updateEntryContent]);

  // User preferences (temperature unit + blur preference). React Query handles
  // caching + dedupe across multiple entry cards on the same page.
  const { data: userProfile } = useQuery<UserPreferences | null>({
    queryKey: ['user-profile-settings', authState.user?.id],
    queryFn: async () => {
      if (!authState.user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('temperature_unit, disable_song_blur')
        .eq('id', authState.user.id)
        .single();
      if (error) {
        logger.error('useEntryState', 'failed to fetch profile preferences:', error);
        return null;
      }
      return data as UserPreferences;
    },
    enabled: !!authState.user,
  });

  const shouldBlurContent = useMemo(() => {
    if (userProfile?.disable_song_blur) return false;
    return Boolean(entry.track && !hasClickedToPlay);
  }, [userProfile?.disable_song_blur, entry.track, hasClickedToPlay]);

  const formatTemp = useCallback(
    (celsius: number) => formatTemperature(celsius, userProfile?.temperature_unit ?? undefined),
    [userProfile?.temperature_unit],
  );

  // Wire write operations to JournalContext.
  const handleDelete = useCallback(() => deleteEntry(entry.id), [deleteEntry, entry.id]);
  const handleAddComment = useCallback(
    (content: string) => addCommentToEntry(entry.id, content),
    [addCommentToEntry, entry.id],
  );
  const handleDeleteComment = useCallback(
    (commentId: string) => deleteCommentFromEntry(entry.id, commentId),
    [deleteCommentFromEntry, entry.id],
  );

  // ReflectionModule writes directly via its own context-aware handlers.
  // We retain this callback only because the prop is required by the component.
  const handleReflectionUpdate = useCallback(async () => {}, []);

  // Track play state from the TrackClipPlayer; the first click unblurs content.
  const handleTrackPlayStateChange = useCallback((playing: boolean) => {
    if (playing) setHasClickedToPlay(true);
  }, []);

  const toggleWeather = useCallback(() => {
    setWeatherEnabled(prev => !prev);
  }, []);

  return {
    // edit state
    isEditing,
    startEditing: () => setIsEditing(true),
    stopEditing: () => setIsEditing(false),

    // play state
    hasClickedToPlay,
    handleTrackPlayStateChange,

    // content
    localContent,
    handleContentChange: isPreview ? undefined : handleContentChange,
    contentRef,

    // weather
    weatherEnabled,
    toggleWeather,

    // derived
    shouldBlurContent,
    formatTemp,

    // write handlers
    handleDelete,
    handleAddComment,
    handleDeleteComment,
    handleReflectionUpdate,
  };
}
