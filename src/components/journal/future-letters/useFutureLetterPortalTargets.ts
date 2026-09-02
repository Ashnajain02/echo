import { useEffect, useState, type RefObject } from 'react';
import type { FutureLetter } from '@/types';
import { CHIP_SELECTOR, ensureLiveHost, removeLiveHost } from './liveLetterDom';

interface PortalTarget {
  letter: FutureLetter;
  mountEl: HTMLElement;
}

/** A letter is live once it's been opened, or once its delivery moment has passed. */
function isLive(letter: FutureLetter, now: number): boolean {
  if (letter.openedAt !== undefined) return true;
  const deliverAt = new Date(letter.deliverAt).getTime();
  return Number.isFinite(deliverAt) && deliverAt <= now;
}

/**
 * Only arm a timer for a letter arriving within the next day. Delivery is
 * normally 6 months out, and setTimeout silently fires immediately past
 * ~24.8 days (32-bit overflow) — so anything beyond the horizon is left to
 * the next page load, which is the delivery model anyway.
 */
const DUE_TIMER_HORIZON_MS = 24 * 60 * 60 * 1000;

/** Cheap identity check so we only re-render when the mounted set really changed. */
function sameTargets(a: PortalTarget[], b: PortalTarget[]): boolean {
  return (
    a.length === b.length &&
    a.every((t, i) => t.letter.id === b[i].letter.id && t.mountEl === b[i].mountEl)
  );
}

/**
 * Finds the sealed-letter chips in the rendered entry content whose letters
 * are live (due, or already opened) and hands back a DOM node to portal the
 * interactive FutureLetterCard into — for each, in place. Letters that
 * haven't arrived stay as the plain static envelope already baked into the
 * HTML (see futureLetterNode.ts): nothing to mount, nothing to fetch.
 *
 * This is what lets the whole lifecycle (sealed → arrived → opened → reply)
 * live in the one box in the text, instead of a second one bolted on below
 * the entry.
 *
 * The chips themselves are never rewritten — see liveLetterDom.ts for why
 * that matters. Letter *data* changes (opening, replying) flow through the
 * returned targets without any DOM work at all; the effect only reacts to the
 * set of live letter ids, so clicking "open" no longer disturbs the card the
 * user is looking at.
 */
export function useFutureLetterPortalTargets(
  containerRef: RefObject<HTMLElement>,
  content: string,
  letters: FutureLetter[],
): PortalTarget[] {
  const [hosts, setHosts] = useState<PortalTarget[]>([]);
  // Bumped when a letter crosses its delivery moment with the page open, to
  // re-evaluate `liveKey` (which is time-dependent) without any polling.
  const [dueTick, setDueTick] = useState(0);

  // Re-run only when the *set* of live letters changes, not on every field
  // edit (openedAt / reply), which is what re-renders the card in place.
  const liveKey = letters
    .filter((l) => isLive(l, Date.now()))
    .map((l) => l.id)
    .join(',');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      setHosts((prev) => (prev.length ? [] : prev));
      return;
    }

    const now = Date.now();
    const byId = new Map(letters.map((l) => [l.id, l]));
    const chips = Array.from(container.querySelectorAll<HTMLElement>(CHIP_SELECTOR));
    const next: PortalTarget[] = [];

    for (const chip of chips) {
      const letter = byId.get(chip.getAttribute('data-letter-id') as string);
      if (!letter || !isLive(letter, now)) {
        removeLiveHost(chip);
        continue;
      }
      next.push({ letter, mountEl: ensureLiveHost(chip) });
    }

    setHosts((prev) => (sameTargets(prev, next) ? prev : next));

    // A letter can cross its delivery moment while the page is open — most
    // visibly in dev builds, where letters arrive 30s after sealing. One
    // timer for the soonest one; no polling.
    const nextDue = letters.reduce<number | null>((soonest, l) => {
      if (isLive(l, now)) return soonest;
      const at = new Date(l.deliverAt).getTime();
      if (!Number.isFinite(at) || at - now > DUE_TIMER_HORIZON_MS) return soonest;
      return soonest === null || at < soonest ? at : soonest;
    }, null);

    if (nextDue === null) return;
    const timer = window.setTimeout(
      () => setDueTick((t) => t + 1),
      Math.max(nextDue - now, 0) + 50,
    );
    return () => window.clearTimeout(timer);
    // `content` re-runs this because dangerouslySetInnerHTML replaces the chip
    // nodes wholesale; `letters` is read but deliberately not a dependency —
    // `liveKey` is the part of it that can require DOM work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, content, liveKey, dueTick]);

  // Pair the mounted hosts back up with the current letter objects, so an
  // open/reply re-renders the card without touching a single DOM node.
  const byId = new Map(letters.map((l) => [l.id, l]));
  return hosts.flatMap(({ letter, mountEl }) => {
    const current = byId.get(letter.id);
    return current ? [{ letter: current, mountEl }] : [];
  });
}
