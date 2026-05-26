import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useJournal } from '@/contexts/JournalContext';
import { getLocalDate, parseDate } from '@/utils/dateUtils';

const STORAGE_KEY = 'echo:memories-last-visited';

const readSeenDate = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeSeenDate = (date: string) => {
  try {
    localStorage.setItem(STORAGE_KEY, date);
  } catch {
    /* localStorage unavailable (private mode, etc.) — fail silent */
  }
};

/**
 * Tracks whether there's a journal entry from a previous year on today's
 * month + day, and whether the user has visited /memories yet today.
 * Returns `showDot: true` exactly when there's something to show.
 */
export function useOnThisDayIndicator() {
  const { entries } = useJournal();
  const location = useLocation();
  const today = getLocalDate();

  const hasOnThisDay = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();
    return entries.some(e => {
      if (e.date === today) return false;
      const d = parseDate(e.timestamp || e.date);
      return d.getMonth() === month && d.getDate() === day;
    });
  }, [entries, today]);

  const [seenToday, setSeenToday] = useState(() => readSeenDate() === today);

  // Mark as seen the moment the user lands on /memories.
  useEffect(() => {
    if (location.pathname === '/memories' && hasOnThisDay && !seenToday) {
      writeSeenDate(today);
      setSeenToday(true);
    }
  }, [location.pathname, hasOnThisDay, seenToday, today]);

  return {
    showDot: hasOnThisDay && !seenToday,
  };
}
