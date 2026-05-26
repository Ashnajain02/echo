import { JournalEntry, Mood, MusicTrack, WeatherData } from '@/types';
import type { Database } from '@/integrations/supabase/types';
import { extractLocalDate } from '@/utils/dateUtils';
import { moodLabels } from '@/constants/moods';
import { logger } from '@/lib/logger';

/**
 * Database row shape for `journal_entries`.
 *
 * Pulls from the generated Supabase types as the source of truth, then layers
 * on columns that exist in the DB but aren't reflected in the generated types
 * yet (regenerate with `supabase gen types` to remove the intersection).
 */
type JournalEntryRow = Database['public']['Tables']['journal_entries']['Row'] & {
  timezone?: string | null;
};

const KNOWN_MOODS = Object.keys(moodLabels) as Mood[];
const KNOWN_MOOD_SET = new Set<string>(KNOWN_MOODS);

/** Coerce a raw DB mood string into a valid Mood, falling back to neutral. */
function parseMood(raw: string): Mood {
  if (KNOWN_MOOD_SET.has(raw)) return raw as Mood;
  logger.warn('journalEntryMapper', `unknown mood "${raw}" — falling back to "neutral"`);
  return 'neutral';
}

function mapTrack(row: JournalEntryRow): MusicTrack | undefined {
  if (!row.spotify_track_uri) return undefined;

  const uri = row.spotify_track_uri;
  // Legacy `spotify:track:abc123` URIs use the last segment as the id.
  // iTunes preview URLs use the full URL as the id.
  const id = uri.startsWith('spotify:') ? uri.split(':').pop() || '' : uri;

  return {
    id,
    name: row.spotify_track_name ?? '',
    artist: row.spotify_track_artist ?? '',
    album: row.spotify_track_album ?? '',
    albumArt: row.spotify_track_image ?? '',
    uri,
    clipStartSeconds: row.spotify_clip_start_seconds ?? 0,
    clipEndSeconds: row.spotify_clip_end_seconds ?? 30,
  };
}

function mapWeather(row: JournalEntryRow): WeatherData | undefined {
  if (row.weather_temperature === null) return undefined;

  return {
    temperature: row.weather_temperature,
    description: row.weather_description ?? '',
    icon: row.weather_icon ?? '',
    location: row.weather_location ?? '',
  };
}

/** Convert a DB row into the in-memory JournalEntry shape. */
export function mapDbRowToJournalEntry(row: JournalEntryRow): JournalEntry {
  return {
    id: row.id,
    content: row.entry_text,
    date: extractLocalDate(row.timestamp_started),
    timestamp: row.timestamp_started,
    timezone: row.timezone ?? undefined,
    mood: parseMood(row.mood),
    weather: mapWeather(row),
    track: mapTrack(row),
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
    user_id: row.user_id,
    comments: [],
    reflectionQuestion: row.reflection_question ?? undefined,
    reflectionAnswer: row.reflection_answer ?? undefined,
  };
}

/**
 * Build the DB insert/update payload from a JournalEntry. Column names keep
 * the legacy `spotify_` prefix for backwards compatibility with the schema.
 * The caller is responsible for passing pre-encrypted content.
 */
export function buildDbPayload(entry: JournalEntry, encryptedContent: string) {
  return {
    entry_text: encryptedContent,
    mood: entry.mood,
    spotify_track_uri: entry.track?.uri ?? null,
    spotify_track_name: entry.track?.name ?? null,
    spotify_track_artist: entry.track?.artist ?? null,
    spotify_track_album: entry.track?.album ?? null,
    spotify_track_image: entry.track?.albumArt ?? null,
    spotify_clip_start_seconds: entry.track?.clipStartSeconds ?? null,
    spotify_clip_end_seconds: entry.track?.clipEndSeconds ?? null,
    weather_temperature: entry.weather?.temperature ?? null,
    weather_description: entry.weather?.description ?? null,
    weather_icon: entry.weather?.icon ?? null,
    weather_location: entry.weather?.location ?? null,
    reflection_question: entry.reflectionQuestion ?? null,
    reflection_answer: entry.reflectionAnswer ?? null,
  };
}

/** Strip HTML tags from content to get plain text. */
export function getPlainTextContent(htmlContent: string): string {
  return htmlContent?.replace(/<[^>]*>/g, '').trim() ?? '';
}

/** Whether an entry has meaningful content worth saving. */
export function hasMeaningfulContent(entry: JournalEntry): boolean {
  const textContent = getPlainTextContent(entry.content);
  return !!(textContent || entry.track || entry.mood !== 'neutral');
}
