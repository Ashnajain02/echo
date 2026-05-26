import { useMemo } from 'react';
import { useJournal } from '@/contexts/JournalContext';
import type { Mood } from '@/types';

export interface JournalStats {
  totalEntries: number;
  moodCounts: Record<Mood, number>;
  longestStreak: number;
  mostCommonTime: string | null;
}

const EMPTY_MOOD_COUNTS: Record<Mood, number> = {
  happy: 0,
  content: 0,
  neutral: 0,
  sad: 0,
  anxious: 0,
  angry: 0,
  emotional: 0,
  'in-love': 0,
  excited: 0,
  tired: 0,
};

/**
 * Derives aggregate stats from the user's entries.
 *
 * Lives as a hook (not as part of JournalContext) so that consumers who only
 * need to render or mutate entries don't get re-rendered when stats recompute.
 * Components that actually need stats can opt in with one call.
 */
export function useJournalStats(): JournalStats {
  const { entries } = useJournal();

  return useMemo(() => {
    const totalEntries = entries.length;

    const moodCounts = { ...EMPTY_MOOD_COUNTS };
    for (const entry of entries) {
      if (entry.mood) moodCounts[entry.mood]++;
    }

    // Longest consecutive-day streak across unique entry dates.
    const uniqueDates = [...new Set(entries.map(e => e.date))].sort();
    let longestStreak = 0;
    let currentStreak = 0;
    let lastDate: Date | null = null;

    for (const dateStr of uniqueDates) {
      const entryDate = new Date(dateStr);
      if (lastDate) {
        const dayDiff = Math.floor(
          (entryDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        currentStreak = dayDiff === 1 ? currentStreak + 1 : 1;
      } else {
        currentStreak = 1;
      }
      longestStreak = Math.max(longestStreak, currentStreak);
      lastDate = entryDate;
    }

    // Most common hour-of-day (formatted as `${h}AM/PM`).
    const hourCounts: Record<number, number> = {};
    for (const entry of entries) {
      if (entry.timestamp) {
        const hour = new Date(entry.timestamp).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    }

    let mostCommonHour = -1;
    let maxCount = 0;
    for (const [hour, count] of Object.entries(hourCounts)) {
      if (count > maxCount) {
        mostCommonHour = parseInt(hour);
        maxCount = count;
      }
    }

    const mostCommonTime = mostCommonHour >= 0
      ? `${mostCommonHour % 12 || 12}${mostCommonHour >= 12 ? 'PM' : 'AM'}`
      : null;

    return { totalEntries, moodCounts, longestStreak, mostCommonTime };
  }, [entries]);
}
