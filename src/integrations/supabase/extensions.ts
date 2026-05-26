/**
 * Hand-written augmentations for the auto-generated Supabase types in
 * `./types.ts`. Use these for tables/functions that exist in the DB but
 * haven't been regenerated into `./types.ts` yet.
 *
 * When you regenerate with `supabase gen types`, prefer deleting entries
 * here over keeping them — single source of truth wins.
 */
import { supabase } from './client';

export interface ApiKeyRow {
  id: string;
  user_id: string;
  created_at: string;
  last_used_at: string | null;
}

/**
 * Typed accessor for the `api_keys` table. Use this instead of casting
 * `supabase` to `any`. When the generated types include `api_keys`, replace
 * this with the canonical `supabase.from('api_keys')` call.
 */
export const apiKeysTable = () =>
  // The cast is contained to this single function and constrained to a
  // specific row type — far safer than `(supabase as any).from(...)`.
  (supabase as unknown as {
    from: (table: 'api_keys') => {
      select: (cols: string) => {
        maybeSingle: () => Promise<{ data: ApiKeyRow | null; error: Error | null }>;
      };
    };
  }).from('api_keys');
