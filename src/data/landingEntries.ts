import { JournalEntry } from '@/types';

export const landingEntries: JournalEntry[] = [
  // Entry 1 — Rainy morning, content mood
  {
    id: 'landing-1',
    date: '2025-11-14',
    timestamp: '2025-11-14T16:22:00.000Z',
    mood: 'content',
    content: `<p>This is <strong>your space to write freely</strong>.</p>
<p>Echo captures everything around a moment — the <strong>weather</strong> outside your window, the <strong>song</strong> stuck in your head, your <strong>mood</strong>, your unfiltered thoughts. Not for anyone else. Just for you.</p>
<p>Every time you open this journal, you're creating a <strong>snapshot of who you are right now</strong>. And one day, you'll scroll back and be grateful you did.</p>`,
    weather: {
      temperature: 12,
      description: 'light rain',
      icon: 'cloud-rain',
      location: 'San Francisco, California',
    },
    track: {
      id: '1604657975',
      name: 'ceilings',
      artist: 'Lizzy McAlpine',
      album: 'five seconds flat',
      albumArt: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/11/6a/64/116a64ee-0db3-4e59-bd86-f44008e47f85/5056167170006.jpg/300x300bb.jpg',
      uri: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/7b/52/b7/7b52b754-157a-6946-1a7f-3885d0d4b45f/mzaf_11031506980503485356.plus.aac.p.m4a',
      durationMs: 182888,
      clipStartSeconds: 0,
      clipEndSeconds: 30,
    },
    createdAt: new Date('2025-11-14T09:22:00.000Z').getTime(),
    comments: [],
  },
  // Entry 4 — Heavy clouds, neutral mood (transitions to encryption)
  {
    id: 'landing-4',
    date: '2026-01-03',
    timestamp: '2026-01-03T18:00:00.000Z',
    mood: 'neutral',
    content: `<p><strong>Your entries are encrypted</strong> before they leave your device.</p>
<p>We use <strong>AES-256 encryption</strong> — the same standard used by banks and governments. Your thoughts are scrambled into unreadable data before they're ever stored. <strong>Not even we can read them.</strong></p>
<p>No ads. No data mining. <strong>No one reading over your shoulder.</strong> This is your journal, and it stays that way.</p>`,
    weather: {
      temperature: 8,
      description: 'heavy clouds',
      icon: 'cloud',
      location: 'London, England',
    },
    track: {
      id: '1122782281',
      name: 'Sparks',
      artist: 'Coldplay',
      album: 'Parachutes',
      albumArt: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/f5/93/8c/f5938c49-964c-31d1-4b33-78b634f71fb7/190295978075.jpg/300x300bb.jpg',
      uri: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/47/db/ce/47dbce82-d89c-0897-0da7-26d06ae7e2f2/mzaf_14852507599380441353.plus.aac.p.m4a',
      durationMs: 227094,
      clipStartSeconds: 0,
      clipEndSeconds: 30,
    },
    createdAt: new Date('2026-01-03T18:30:00.000Z').getTime(),
    comments: [],
  },
];
