import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkle } from 'lucide-react';
import { toast } from 'sonner';
import type { FutureLetter } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatShortDate } from '@/utils/dateUtils';
import { FutureLetterEnvelope } from './FutureLetterEnvelope';

interface FutureLetterCardProps {
  letter: FutureLetter;
  /** Called once, right when the envelope is clicked (not when the reveal animation finishes). */
  onOpen: (letter: FutureLetter) => void;
  onSaveReply: (letter: FutureLetter, reply: string) => Promise<void>;
}

/** Length of the seal-break animation before the message is revealed. */
const REVEAL_DELAY_MS = 650;

/** Scatter positions/delays for the twinkle around the envelope — hand-placed, not procedural. */
const SPARKLES = [
  { top: '-8%', left: '8%', size: 14, delay: 0 },
  { top: '4%', left: '86%', size: 10, delay: 0.4 },
  { top: '68%', left: '92%', size: 12, delay: 0.8 },
  { top: '78%', left: '2%', size: 9, delay: 1.2 },
];

/**
 * The "Unified Card" — arrived-and-waiting-to-open, or already-read. Only
 * ever mounted for a letter that's actually due: while a letter is still
 * sealed, its entry just shows the plain static envelope baked into the
 * HTML (see futureLetterNode.ts) — nothing here to render yet. Once due,
 * useFutureLetterPortalTargets portals this live component directly into
 * that same envelope's position in the entry — same envelope, now
 * twinkling and clickable — and also reuses it inside the feed's arrival
 * dialog (FutureLetterArrivalBanner). Regardless of how long ago the entry
 * was written, "due" is checked against today, so this works exactly the
 * same on a two-year-old entry as a fresh one.
 */
const FutureLetterCard: React.FC<FutureLetterCardProps> = ({ letter, onOpen, onSaveReply }) => {
  const [stage, setStage] = useState<'closed' | 'opening' | 'revealed'>(letter.openedAt ? 'revealed' : 'closed');
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');
  const [isSavingReply, setIsSavingReply] = useState(false);
  const revealTimerRef = useRef<number>();

  // The same letter can be open in the feed's arrival dialog and on its entry
  // page at once. If it gets opened elsewhere mid-animation, skip straight to
  // the message rather than sitting on a closed envelope that no longer is.
  useEffect(() => {
    if (letter.openedAt && stage === 'closed') setStage('revealed');
  }, [letter.openedAt, stage]);

  // A card can be unmounted mid-reveal — the arrival dialog closes, or the
  // entry content re-renders and remounts the portal host.
  useEffect(() => () => window.clearTimeout(revealTimerRef.current), []);

  // One click does the whole thing — no separate confirm step. The reveal is
  // deliberately not awaited on the write: the message is already decrypted in
  // memory, so there's nothing to wait for, and onOpen rolls its own state
  // back (and warns) if the write fails.
  const handleOpen = () => {
    if (stage !== 'closed') return;
    setStage('opening');
    void onOpen(letter);
    revealTimerRef.current = window.setTimeout(() => setStage('revealed'), REVEAL_DELAY_MS);
  };

  const handleSaveReply = async () => {
    const trimmed = replyDraft.trim();
    if (!trimmed || isSavingReply) return;
    setIsSavingReply(true);
    try {
      await onSaveReply(letter, trimmed);
      setIsReplyOpen(false);
      setReplyDraft('');
    } catch {
      // Keep the composer open with the draft intact so nothing is lost.
      toast.error("Couldn't save your reply. Please try again.");
    } finally {
      setIsSavingReply(false);
    }
  };

  return (
    // Boxed surface only once there's a message to hold — the arrived-but-
    // unopened state stays unboxed and left-aligned, the same plain object
    // sitting in the text as the sealed chip it replaced, not a card
    // dropped over it.
    <div className={stage === 'revealed' ? 'future-letter-card' : undefined}>
      <AnimatePresence mode="wait">
        {stage !== 'revealed' ? (
          <motion.button
            key="envelope"
            type="button"
            onClick={handleOpen}
            className="future-letter-open-trigger"
            aria-label="Open your letter"
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.3, ease: 'easeIn' } }}
          >
            <div className="future-letter-open-visual">
              {/* Envelope painted first so it sits under the sparkles —
                  order alone isn't reliable here (the animated transform
                  below promotes it into the same stacking layer as the
                  absolutely-positioned sparkles), so z-index pins it too;
                  see .future-letter-envelope-motion / .future-letter-sparkle. */}
              <motion.div
                className="future-letter-envelope-motion"
                animate={
                  stage === 'opening'
                    ? { scale: [1, 1.12, 0.94], rotate: [-3, 4, 0] }
                    : { rotate: [-3, -1, -3], y: [0, -2, 0] }
                }
                transition={
                  stage === 'opening'
                    ? { duration: 0.5, ease: 'easeInOut' }
                    : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                }
              >
                <FutureLetterEnvelope />
              </motion.div>

              {stage === 'closed' &&
                SPARKLES.map((s, i) => (
                  <motion.span
                    key={i}
                    className="future-letter-sparkle"
                    style={{ top: s.top, left: s.left }}
                    animate={{ opacity: [0.25, 1, 0.25], scale: [0.7, 1.15, 0.7], rotate: [0, 25, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: s.delay }}
                  >
                    <Sparkle size={s.size} fill="currentColor" strokeWidth={0} />
                  </motion.span>
                ))}

              {stage === 'closed' && (
                <span className="future-letter-open-sticker">open it!</span>
              )}
            </div>
            {stage === 'closed' && (
              <span className="future-letter-open-caption">A letter has arrived</span>
            )}
          </motion.button>
        ) : (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="future-letter-revealed"
          >
            <div className="flex items-center gap-2 mb-3">
              <FutureLetterEnvelope className="future-letter-envelope-svg--tiny" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                A letter to your future self &middot; sealed {formatShortDate(letter.createdAt)}
              </span>
            </div>

            <p className="font-script text-2xl leading-relaxed text-foreground whitespace-pre-wrap">
              {letter.message}
            </p>

            {letter.reply ? (
              <div className="future-letter-reply mt-5 pt-4 border-t border-border/50">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Your reply</p>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{letter.reply}</p>
              </div>
            ) : isReplyOpen ? (
              <div className="mt-5 pt-4 border-t border-border/50">
                <Textarea
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  placeholder="Write back to yourself..."
                  className="min-h-[80px] text-sm"
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsReplyOpen(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveReply} disabled={isSavingReply || !replyDraft.trim()}>
                    {isSavingReply ? 'Saving...' : 'Save reply'}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsReplyOpen(true)}
                className="editorial-link text-xs text-muted-foreground hover:text-foreground mt-4 transition-colors"
              >
                + Add a reply
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FutureLetterCard;
