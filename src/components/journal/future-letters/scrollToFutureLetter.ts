import { liveHostSelector } from './liveLetterDom';

/**
 * Drives the letter-arrived banner's "Open" click: jump to the letter's
 * source entry and land on the envelope itself, still closed — the user
 * opens it from there, the same one motion as clicking any other arrived
 * letter in the feed.
 *
 * This is a single continuous scroll feed with every entry already mounted
 * (see DayNavigator/ScrollEntry — no virtualization, no per-entry route), so
 * "jump to entry" is a plain scrollIntoView, not a navigation.
 *
 * The live host for this exact letter usually already exists — its own
 * entry's `useEntryFutureLetters` query typically resolves well before a user
 * reads the feed and clicks the banner. But it's a separate query from the
 * one that populated this banner, so it can still be in flight; in that case
 * this scrolls to the entry itself immediately (visible progress, not a
 * dead click) and briefly polls for the envelope to refine onto it once
 * mounted.
 */
const POLL_INTERVAL_MS = 150;
const POLL_MAX_ATTEMPTS = 13; // ~2s — generous relative to how fast that query settles

/** Briefly highlights `el` so it's obvious which envelope, among possibly several, is the one just jumped to. */
function pulse(el: HTMLElement) {
  el.classList.add('future-letter-live-highlight');
  window.setTimeout(() => el.classList.remove('future-letter-live-highlight'), 1600);
}

function findLiveHost(letterId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(liveHostSelector(letterId));
}

export function scrollToFutureLetter(letterId: string, sourceEntryId: string | null): void {
  const immediate = findLiveHost(letterId);
  if (immediate) {
    immediate.scrollIntoView({ behavior: 'smooth', block: 'center' });
    pulse(immediate);
    return;
  }

  // Nowhere to jump to (the source entry was deleted) — nothing left for
  // this to do; the caller falls back to opening the letter in place.
  if (!sourceEntryId) return;

  // Polls for both the entry container and the envelope itself — not just
  // the envelope — because the journal's own entries list (a separate query
  // from the one that populated this banner) can occasionally still be
  // loading too, in which case even `#entry-{id}` doesn't exist yet.
  let scrolledToEntry = false;
  let attempts = 0;
  const poll = () => {
    const host = findLiveHost(letterId);
    if (host) {
      host.scrollIntoView({ behavior: 'smooth', block: 'center' });
      pulse(host);
      return;
    }
    if (!scrolledToEntry) {
      const entryEl = document.getElementById(`entry-${sourceEntryId}`);
      if (entryEl) {
        entryEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        scrolledToEntry = true;
      }
    }
    if (++attempts < POLL_MAX_ATTEMPTS) window.setTimeout(poll, POLL_INTERVAL_MS);
  };
  poll();
}
