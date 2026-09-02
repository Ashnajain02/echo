import React, { useCallback, useState } from 'react';
import type { FutureLetter } from '@/types';
import { useFutureLetterArrivals } from '@/hooks/useFutureLetters';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import FutureLetterCard from './FutureLetterCard';
import { FutureLetterEnvelope } from './FutureLetterEnvelope';
import { scrollToFutureLetter } from './scrollToFutureLetter';

/**
 * "A letter arrived:" — sits at the very top of the main feed, one row per
 * due-and-unopened letter. Clicking a row jumps straight to the letter's own
 * envelope on its source entry, still closed and unread — the same single
 * click-to-open experience as finding it there yourself, just with the
 * feed doing the finding. This is a single continuous scroll page (see
 * DayNavigator/ScrollEntry) so "jump to" is a scroll, not a navigation.
 *
 * The one case that can't jump anywhere: a letter whose source entry was
 * deleted (`source_entry_id` is nullable — see the future_letters migration)
 * has no envelope left to scroll to. That still opens right here, in a
 * dialog, exactly as this banner used to work for every letter.
 */
const FutureLetterArrivalBanner: React.FC = () => {
  const { dueLetters, openLetter, saveReply } = useFutureLetterArrivals();

  // Only ever holds an orphaned letter (no sourceEntryId) — the fallback
  // path. A normal letter never touches this state; scrollToFutureLetter
  // finds and opens it directly on the entry page.
  const [orphanedLetter, setOrphanedLetter] = useState<FutureLetter | null>(null);

  const handleRowClick = useCallback((letter: FutureLetter) => {
    if (!letter.sourceEntryId) {
      setOrphanedLetter(letter);
      return;
    }
    scrollToFutureLetter(letter.id, letter.sourceEntryId);
  }, []);

  const handleOpen = useCallback(
    async (letter: FutureLetter) => {
      setOrphanedLetter((prev) => (prev?.id === letter.id ? { ...prev, openedAt: Date.now() } : prev));
      await openLetter(letter);
    },
    [openLetter],
  );

  const handleSaveReply = useCallback(
    async (letter: FutureLetter, reply: string) => {
      await saveReply(letter, reply);
      setOrphanedLetter((prev) =>
        prev?.id === letter.id ? { ...prev, reply, repliedAt: Date.now() } : prev,
      );
    },
    [saveReply],
  );

  if (dueLetters.length === 0 && !orphanedLetter) return null;

  return (
    <>
      {/* The list can empty out while the orphaned-letter dialog is still up
          — so don't leave its padding behind. */}
      <div className={dueLetters.length > 0 ? 'w-full max-w-3xl mx-auto px-6 md:px-16 pt-8' : undefined}>
        {dueLetters.map((letter) => (
          <button
            key={letter.id}
            type="button"
            onClick={() => handleRowClick(letter)}
            className="future-letter-arrival-row w-full text-left hover:bg-primary/10 transition-colors"
          >
            <FutureLetterEnvelope className="future-letter-envelope-svg--tiny shrink-0" />
            <p className="text-sm text-foreground">
              A letter arrived:{' '}
              <span className="editorial-link text-foreground font-medium">Open</span>
            </p>
          </button>
        ))}
      </div>

      <Dialog open={!!orphanedLetter} onOpenChange={(open) => !open && setOrphanedLetter(null)}>
        {/* No background/border/shadow of its own — FutureLetterCard already
            has its own translucent, blurred surface (see .future-letter-card
            in index.css). Layering the dialog's default opaque bg-background
            behind it doubled up into a flat white rectangle that didn't
            match the entry page's warm, glowing look. */}
        <DialogContent className="max-w-md p-0 overflow-hidden bg-transparent border-none shadow-none">
          <DialogTitle className="sr-only">A letter to your future self</DialogTitle>
          {orphanedLetter && (
            <FutureLetterCard
              letter={orphanedLetter}
              onOpen={handleOpen}
              onSaveReply={handleSaveReply}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FutureLetterArrivalBanner;
