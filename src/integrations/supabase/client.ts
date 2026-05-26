// Auto-generated bootstrap from Supabase. Edits here are safe — re-run
// `supabase gen types` only regenerates `./types.ts`.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Project URL + publishable (anon) key. These are *intentionally public* —
// they're shipped to the browser and rate-limited / RLS-protected server-side.
// Read from env when available so prod/staging swaps don't require a code edit;
// fall back to the project's known values so local dev keeps working with no
// `.env` file. To override, set in a `.env.local`:
//   VITE_SUPABASE_URL=...
//   VITE_SUPABASE_ANON_KEY=...
const FALLBACK_URL = 'https://veorhexddrwlwxtkuycb.supabase.co';
const FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlb3JoZXhkZHJ3bHd4dGt1eWNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMzM4NzUsImV4cCI6MjA2MTcwOTg3NX0.oXmev5TAFTvRC76BdsXgse3nra15fcxuJl2T610_K7o';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? FALLBACK_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? FALLBACK_ANON_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
