/**
 * Future Letters — a short note or question, written inline while journaling
 * (see futureLetterNode.ts for the composer block), sealed with a delivery
 * date 6 months out, and re-attached to the entry it came from.
 *
 * message/reply are client-side encrypted with the same primitives as entry
 * content (see @/utils/encryption) — same trust level as an entry itself.
 */
import { supabase } from '@/integrations/supabase/client';
import { encryptText, decryptText } from '@/utils/encryption';
import type { FutureLetter, FutureLetterKind } from '@/types';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';

type FutureLetterRow = Database['public']['Tables']['future_letters']['Row'];

const DELIVERY_MONTHS_OUT = 6;

// Dev-only testing aid: in `npm run dev` (import.meta.env.DEV), letters
// arrive 30 seconds after being sealed instead of 6 months out, so the
// arrival/opening experience can be previewed without waiting. This reverts
// automatically in production builds (`vite build`) — nothing to remember
// to undo before shipping.
const DEV_DELIVERY_DELAY_MS = 30_000;

/**
 * Picks the delivery date — 6 months out in production, or 30 seconds out
 * in dev builds (see above). Returns a full ISO timestamp.
 */
export function defaultDeliveryDate(from: Date = new Date()): string {
  if (import.meta.env.DEV) {
    return new Date(from.getTime() + DEV_DELIVERY_DELAY_MS).toISOString();
  }

  const deliver = new Date(from);
  deliver.setMonth(deliver.getMonth() + DELIVERY_MONTHS_OUT);
  return deliver.toISOString();
}

function mapRow(row: FutureLetterRow, decryptedMessage: string, decryptedReply?: string): FutureLetter {
  return {
    id: row.id,
    sourceEntryId: row.source_entry_id,
    kind: row.kind as FutureLetterKind,
    message: decryptedMessage,
    reply: decryptedReply,
    deliverAt: row.deliver_at,
    createdAt: new Date(row.created_at).getTime(),
    openedAt: row.opened_at ? new Date(row.opened_at).getTime() : undefined,
    repliedAt: row.replied_at ? new Date(row.replied_at).getTime() : undefined,
  };
}

async function decryptRow(row: FutureLetterRow, userId: string): Promise<FutureLetter> {
  const message = await decryptText(row.message_encrypted, userId);
  const reply = row.reply_encrypted ? await decryptText(row.reply_encrypted, userId) : undefined;
  return mapRow(row, message, reply);
}

/** Creates a sealed letter for `sourceEntryId`, with a random delivery date unless one is given. */
export async function createFutureLetter(params: {
  userId: string;
  sourceEntryId: string;
  kind: FutureLetterKind;
  message: string;
  deliverAt?: string;
}): Promise<FutureLetter | null> {
  const { userId, sourceEntryId, kind, message } = params;
  const deliverAt = params.deliverAt ?? defaultDeliveryDate();

  try {
    const messageEncrypted = await encryptText(message, userId);
    const { data, error } = await supabase
      .from('future_letters')
      .insert({
        user_id: userId,
        source_entry_id: sourceEntryId,
        kind,
        message_encrypted: messageEncrypted,
        deliver_at: deliverAt,
      })
      .select()
      .single();

    if (error) throw error;
    // We already have the plaintext message in hand — no need to decrypt it back.
    return mapRow(data, message);
  } catch (error) {
    logger.error('futureLetters', 'failed to create future letter:', error);
    return null;
  }
}

/**
 * Letters due (deliver_at has passed) and not yet opened — the feed "a letter
 * arrived" banner.
 *
 * Reads throw rather than returning `[]`, so React Query can retry them and
 * distinguish "no letters" from "couldn't load"; swallowing the error here
 * would cache an empty list and quietly hide a letter that had arrived.
 */
export async function fetchDueLetters(userId: string): Promise<FutureLetter[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('future_letters')
    .select('*')
    .eq('user_id', userId)
    .is('opened_at', null)
    .lte('deliver_at', now)
    .order('deliver_at', { ascending: true });

  if (error) {
    logger.error('futureLetters', 'failed to fetch due letters:', error);
    throw error;
  }
  return Promise.all((data || []).map((row) => decryptRow(row, userId)));
}

/** All letters (any status) written from a given entry — the entry's permanent archive. */
export async function fetchLettersForEntry(userId: string, entryId: string): Promise<FutureLetter[]> {
  const { data, error } = await supabase
    .from('future_letters')
    .select('*')
    .eq('user_id', userId)
    .eq('source_entry_id', entryId)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('futureLetters', 'failed to fetch letters for entry:', error);
    throw error;
  }
  return Promise.all((data || []).map((row) => decryptRow(row, userId)));
}

/**
 * Writes throw too — the callers apply the change optimistically and need to
 * know to roll back. `user_id` is matched alongside `id` so a mismatched
 * write is an explicit no-op rather than relying on RLS alone.
 */
export async function markLetterOpened(letterId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('future_letters')
    .update({ opened_at: new Date().toISOString() })
    .eq('id', letterId)
    .eq('user_id', userId)
    // Never overwrite the original opened-at: re-opening an already-read
    // letter is a no-op, not a new arrival timestamp.
    .is('opened_at', null);

  if (error) {
    logger.error('futureLetters', 'failed to mark letter opened:', error);
    throw error;
  }
}

export async function saveLetterReply(letterId: string, reply: string, userId: string): Promise<void> {
  const replyEncrypted = await encryptText(reply, userId);
  const { error } = await supabase
    .from('future_letters')
    .update({ reply_encrypted: replyEncrypted, replied_at: new Date().toISOString() })
    .eq('id', letterId)
    .eq('user_id', userId);

  if (error) {
    logger.error('futureLetters', 'failed to save letter reply:', error);
    throw error;
  }
}

/**
 * Scans saved entry content for un-processed future-letter chips (see
 * futureLetterNode.ts), creates a future_letters row for each, and returns
 * the content with those chips flagged `data-created` and stripped of their
 * `data-message` attribute — so a chip is only ever sent once, even across
 * repeated edits/saves of the same entry.
 */
export async function processPendingFutureLetters(
  content: string,
  sourceEntryId: string,
  userId: string,
): Promise<{ content: string; created: FutureLetter[] }> {
  if (!content || !content.includes('data-future-letter')) {
    return { content, created: [] };
  }

  const doc = new DOMParser().parseFromString(content, 'text/html');
  const chips = Array.from(doc.querySelectorAll('div[data-future-letter]:not([data-created])'));
  const created: FutureLetter[] = [];

  for (const chip of chips) {
    const kind = (chip.getAttribute('data-kind') as FutureLetterKind) || 'note';
    const message = chip.getAttribute('data-message') || '';
    if (!message.trim()) continue;

    const letter = await createFutureLetter({ userId, sourceEntryId, kind, message: message.trim() });
    if (letter) {
      created.push(letter);
      chip.setAttribute('data-created', 'true');
      chip.setAttribute('data-letter-id', letter.id);
      chip.removeAttribute('data-message');
    }
  }

  if (created.length === 0) return { content, created: [] };
  return { content: doc.body.innerHTML, created };
}
