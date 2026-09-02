import { useCallback } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchDueLetters,
  fetchLettersForEntry,
  markLetterOpened,
  saveLetterReply,
} from '@/utils/futureLetters';
import { logger } from '@/lib/logger';
import type { FutureLetter } from '@/types';

const dueKey = (userId: string | undefined) => ['future-letters-due', userId] as const;
const entryKey = (entryId: string | null | undefined) => ['future-letters-for-entry', entryId] as const;

/**
 * Letters change on the order of once a year, and the two queries below are
 * mounted on every entry page. A generous staleTime keeps navigating between
 * entries from re-fetching and re-decrypting the same rows.
 */
const LETTERS_STALE_TIME = 5 * 60 * 1000;

/**
 * Shorter for the arrivals query: it's a single query at the top of the feed,
 * and it's the one that should notice a letter crossing its delivery moment
 * reasonably promptly (immediately, in dev's 30-second delivery mode).
 */
const ARRIVALS_STALE_TIME = 30 * 1000;

/**
 * A letter lives in two caches at once — the feed's due list and its source
 * entry's archive — so every mutation has to touch both, or opening a letter
 * in one place leaves a stale copy in the other. These write to both directly
 * rather than invalidating: the data is already known, and an invalidate would
 * mean a round trip plus a re-decrypt for a change we can apply locally.
 */
function patchLetterEverywhere(
  queryClient: QueryClient,
  userId: string | undefined,
  letter: FutureLetter,
  patch: Partial<FutureLetter>,
): () => void {
  const dueSnapshot = queryClient.getQueryData<FutureLetter[]>(dueKey(userId));
  const entrySnapshot = queryClient.getQueryData<FutureLetter[]>(entryKey(letter.sourceEntryId));

  // Opened letters drop out of the due list by definition (`opened_at IS NULL`).
  queryClient.setQueryData<FutureLetter[]>(dueKey(userId), (prev) =>
    (prev || []).flatMap((l) =>
      l.id !== letter.id ? [l] : patch.openedAt !== undefined ? [] : [{ ...l, ...patch }],
    ),
  );

  if (letter.sourceEntryId) {
    queryClient.setQueryData<FutureLetter[]>(entryKey(letter.sourceEntryId), (prev) =>
      (prev || []).map((l) => (l.id === letter.id ? { ...l, ...patch } : l)),
    );
  }

  return () => {
    queryClient.setQueryData(dueKey(userId), dueSnapshot);
    if (letter.sourceEntryId) {
      queryClient.setQueryData(entryKey(letter.sourceEntryId), entrySnapshot);
    }
  };
}

/**
 * Shared open/reply mutations. Both apply optimistically before the network
 * call so the UI never waits on a round trip, and both roll the cache back if
 * the write fails — otherwise a letter would look opened (or replied to) and
 * silently revert on the next load.
 */
function useLetterMutations(userId: string | undefined) {
  const queryClient = useQueryClient();

  const openLetter = useCallback(
    async (letter: FutureLetter) => {
      if (!userId || letter.openedAt !== undefined) return;

      const rollback = patchLetterEverywhere(queryClient, userId, letter, { openedAt: Date.now() });
      try {
        await markLetterOpened(letter.id, userId);
      } catch (error) {
        logger.error('useFutureLetters', 'failed to open letter:', error);
        rollback();
        toast.error("Couldn't open that letter. Please try again.");
      }
    },
    [queryClient, userId],
  );

  const saveReply = useCallback(
    async (letter: FutureLetter, reply: string) => {
      if (!userId) return;

      const rollback = patchLetterEverywhere(queryClient, userId, letter, {
        reply,
        repliedAt: Date.now(),
      });
      try {
        await saveLetterReply(letter.id, reply, userId);
      } catch (error) {
        logger.error('useFutureLetters', 'failed to save letter reply:', error);
        rollback();
        // Rethrow so the card can keep the draft on screen instead of
        // clearing a reply that was never stored.
        throw error;
      }
    },
    [queryClient, userId],
  );

  return { openLetter, saveReply };
}

/**
 * Letters that have arrived (delivery date passed) and haven't been opened
 * yet — drives the "A letter arrived:" banner at the top of the main feed.
 *
 * Deliberately just a filtered, indexed query (`deliver_at <= now()`), not a
 * background job or a live subscription: "delivered" here means "shows up
 * next time you open Echo," which this is already correct for on every
 * mount (and every window refocus — react-query's default behavior, not
 * anything custom). That's the whole mechanism, and it costs the same
 * whether it's 1 user or 100,000 — no polling, no websocket, no scheduler.
 */
export function useFutureLetterArrivals() {
  const { authState } = useAuth();
  const userId = authState.user?.id;
  const { openLetter, saveReply } = useLetterMutations(userId);

  const { data: dueLetters = [], isLoading } = useQuery<FutureLetter[]>({
    queryKey: dueKey(userId),
    queryFn: () => fetchDueLetters(userId as string),
    enabled: !!userId,
    staleTime: ARRIVALS_STALE_TIME,
  });

  return { dueLetters, isLoading, openLetter, saveReply };
}

/**
 * All letters attached to a given entry (its permanent archive), plus
 * mutations for opening one from here and saving a reply.
 */
export function useEntryFutureLetters(entryId: string | undefined) {
  const { authState } = useAuth();
  const userId = authState.user?.id;
  const { openLetter, saveReply } = useLetterMutations(userId);

  const { data: letters = [] } = useQuery<FutureLetter[]>({
    queryKey: entryKey(entryId),
    queryFn: () => fetchLettersForEntry(userId as string, entryId as string),
    enabled: !!userId && !!entryId,
    staleTime: LETTERS_STALE_TIME,
  });

  return { letters, openLetter, saveReply };
}
