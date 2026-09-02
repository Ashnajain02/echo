
export type Mood = 'happy' | 'content' | 'neutral' | 'sad' | 'anxious' | 'angry' | 'emotional' | 'in-love' | 'excited' | 'tired';

export interface MoodOption {
  value: Mood;
  label: string;
}

export type TemperatureUnit = 'celsius' | 'fahrenheit';

export interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
  location: string;
}

export interface MusicTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  uri: string;
  durationMs?: number;
  clipStartSeconds?: number;
  clipEndSeconds?: number;
}

/** @deprecated Use MusicTrack instead */
export type SpotifyTrack = MusicTrack;

export interface JournalComment {
  id: string;
  content: string;
  createdAt: number;
  updatedAt?: number;
}

export interface JournalEntry {
  id: string;
  content: string;
  date: string;
  timestamp: string;
  timezone?: string; // IANA timezone e.g. "America/New_York"
  mood: Mood;
  weather?: WeatherData;
  track?: MusicTrack;
  createdAt: number;
  updatedAt?: number;
  user_id?: string;
  comments?: JournalComment[];
  reflectionQuestion?: string;
  reflectionAnswer?: string;
}

export type FutureLetterKind = 'note' | 'question';

/**
 * A short note or question written inline while journaling, sealed with a
 * random future delivery date, and re-attached to the entry it came from.
 * `message`/`reply` are decrypted client-side the same way entry content is —
 * never stored or transmitted in plaintext.
 */
export interface FutureLetter {
  id: string;
  sourceEntryId: string | null;
  kind: FutureLetterKind;
  message: string;
  reply?: string;
  deliverAt: string; // ISO 8601 timestamp (timestamptz) — carries a time, not just a date
  createdAt: number;
  openedAt?: number;
  repliedAt?: number;
}
