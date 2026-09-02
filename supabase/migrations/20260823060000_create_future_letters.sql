-- Future Letters: a short note or question, written inline while journaling,
-- sealed with a random future delivery date (1-2 years out), delivered as a
-- self-contained "letter" experience, and re-attached to the entry it came
-- from once opened.
--
-- "Delivered" just means: shows up in a plain `deliver_at <= now()` query
-- the next time the app loads. No background job, no scheduler — see
-- useFutureLetterArrivals.
--
-- message/reply are client-side encrypted the same way journal_entries.entry_text
-- is (AES-GCM, key derived from user id) — this is private content, same trust
-- level as an entry itself. kind/dates/status are plaintext metadata, same
-- distinction the app already makes for mood/weather/track on entries.
--
-- Written to be safe to re-run: every statement is guarded (IF NOT EXISTS /
-- DROP POLICY IF EXISTS) in case an earlier partial run got interrupted.
CREATE TABLE IF NOT EXISTS public.future_letters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  -- Nullable + ON DELETE SET NULL: if the source entry is later deleted, the
  -- letter still arrives and still opens — it just loses its "written in"
  -- backlink instead of disappearing along with the entry.
  source_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('note', 'question')),
  message_encrypted text NOT NULL,
  reply_encrypted text,
  -- timestamptz (not date) so delivery can carry a precise time — needed for
  -- the dev-only fast-delivery testing mode (see randomDeliveryDate).
  deliver_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  opened_at timestamp with time zone,
  replied_at timestamp with time zone
);

-- Self-heal if an earlier partial run created the table with the original
-- `date` column before it was widened to timestamptz.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'future_letters'
      AND column_name = 'deliver_at' AND data_type = 'date'
  ) THEN
    ALTER TABLE public.future_letters
      ALTER COLUMN deliver_at TYPE timestamp with time zone
      USING deliver_at::timestamp with time zone;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS future_letters_user_due_idx
  ON public.future_letters (user_id, deliver_at)
  WHERE opened_at IS NULL;

CREATE INDEX IF NOT EXISTS future_letters_source_entry_idx
  ON public.future_letters (source_entry_id);

ALTER TABLE public.future_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own letters" ON public.future_letters;
CREATE POLICY "Users can view their own letters" ON public.future_letters
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own letters" ON public.future_letters;
CREATE POLICY "Users can insert their own letters" ON public.future_letters
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own letters" ON public.future_letters;
CREATE POLICY "Users can update their own letters" ON public.future_letters
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own letters" ON public.future_letters;
CREATE POLICY "Users can delete their own letters" ON public.future_letters
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
