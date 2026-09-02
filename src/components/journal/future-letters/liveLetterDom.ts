/**
 * The bridge between an entry's stored HTML (rendered by InteractiveContent
 * via dangerouslySetInnerHTML) and the live, interactive letter card React
 * portals into it.
 *
 * The rule that makes this safe: **React and manual DOM edits never touch the
 * same nodes.** The static sealed-envelope chip baked into the entry HTML is
 * never emptied or rewritten — it's only hidden with a class. The card is
 * portalled into a separate host element we insert next to it, which React
 * owns outright.
 *
 * The previous approach (clearing the chip's innerHTML and portalling into the
 * chip itself) broke the moment the effect re-ran: it wiped the DOM React had
 * rendered there, while React — seeing the same container and key — believed
 * its children were still mounted and patched nothing back in. Opening a
 * letter mutates the letters cache, which re-ran the effect, which is why an
 * opened letter went blank until a page refresh.
 */

/** Marks a host element we created — owned by React, never part of saved content. */
export const LIVE_HOST_ATTR = 'data-future-letter-live';

/** Applied to the static chip while its live card is mounted; purely visual. */
export const CHIP_HIDDEN_CLASS = 'future-letter-chip--live';

export const CHIP_SELECTOR = '[data-future-letter][data-letter-id]';

/**
 * Rendered card markup sitting *inside* a chip — only possible for content
 * saved while the earlier implementation portalled the card into the chip
 * itself. Stripped on serialize so an affected entry heals on its next save.
 */
const LEGACY_INLINED_CARD = '[data-future-letter] .future-letter-card';

/**
 * A selector that finds a specific letter's live host directly — used by the
 * "jump to this letter" flow (see scrollToFutureLetter.ts). The chip itself
 * can't be the target: it's `display:none` once its host is mounted (see
 * CHIP_HIDDEN_CLASS below), and scrollIntoView on a non-rendered element is a
 * no-op.
 */
export function liveHostSelector(letterId: string): string {
  return `[${LIVE_HOST_ATTR}][data-letter-id="${letterId}"]`;
}

/**
 * Returns the host element for `chip`, creating and inserting it if needed.
 * Idempotent: safe to call on every effect run.
 */
export function ensureLiveHost(chip: HTMLElement): HTMLElement {
  const letterId = chip.getAttribute('data-letter-id') || '';
  const existing = chip.nextElementSibling;
  if (existing instanceof HTMLElement && existing.hasAttribute(LIVE_HOST_ATTR)) {
    chip.classList.add(CHIP_HIDDEN_CLASS);
    return existing;
  }

  const host = document.createElement('div');
  host.setAttribute(LIVE_HOST_ATTR, '');
  host.setAttribute('data-letter-id', letterId);
  chip.after(host);
  chip.classList.add(CHIP_HIDDEN_CLASS);
  return host;
}

/**
 * Reverts `chip` to its plain sealed state and drops its host, if any. Used
 * when a letter is no longer eligible for a live card (e.g. it vanished from
 * the query result).
 *
 * Note this removes a node React may still be portalling into. That's fine:
 * React keeps its own reference and simply patches a detached subtree until
 * the next render drops the portal.
 */
export function removeLiveHost(chip: HTMLElement): void {
  chip.classList.remove(CHIP_HIDDEN_CLASS);
  if (!chip.classList.length) chip.removeAttribute('class');

  const sibling = chip.nextElementSibling;
  if (sibling instanceof HTMLElement && sibling.hasAttribute(LIVE_HOST_ATTR)) {
    sibling.remove();
  }
}

/**
 * Serializes `container`'s HTML back to what belongs in the entry, with every
 * trace of the live cards removed.
 *
 * InteractiveContent persists `container.innerHTML` whenever a checklist item
 * is toggled. Without this, that snapshot would swallow the entire rendered
 * letter card — reply box, animation wrappers and all — straight into the
 * entry's stored content.
 */
export function serializeEntryContent(container: HTMLElement): string {
  // Nothing live in there? Skip the clone entirely — this runs on every
  // checkbox toggle, and the overwhelming majority of entries have no letters.
  if (!container.querySelector(`[${LIVE_HOST_ATTR}], ${LEGACY_INLINED_CARD}`)) {
    return container.innerHTML;
  }

  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(`[${LIVE_HOST_ATTR}]`).forEach((el) => el.remove());
  // Heal entries saved while the older implementation portalled the card
  // *into* the chip: any card markup found inside a chip was never content.
  clone.querySelectorAll(LEGACY_INLINED_CARD).forEach((el) => el.remove());
  clone.querySelectorAll(`.${CHIP_HIDDEN_CLASS}`).forEach((el) => {
    el.classList.remove(CHIP_HIDDEN_CLASS);
    if (!el.classList.length) el.removeAttribute('class');
  });
  return clone.innerHTML;
}
