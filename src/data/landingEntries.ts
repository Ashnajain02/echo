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
  // Entry 2 — Clear sky evening, emotional mood (sun glow)
  {
    id: 'landing-2',
    date: '2025-06-21',
    timestamp: '2025-06-22T00:30:00.000Z',
    mood: 'emotional',
    content: `<p><strong>Every entry is a moment frozen in time.</strong></p>
<p>Come back a week later, a month later, a year later — and <strong>rediscover what you were feeling</strong>, what you were listening to, what the sky looked like. Your future self will read these words and feel something you forgot you felt.</p>
<p>That's the magic. Not in the writing — <strong>in the revisiting</strong>.</p>`,
    weather: {
      temperature: 20,
      description: 'clear sky',
      icon: 'thermometer-sun',
      location: 'New York, New York',
    },
    track: {
      id: '1739659142',
      name: 'BIRDS OF A FEATHER',
      artist: 'Billie Eilish',
      album: 'HIT ME HARD AND SOFT',
      albumArt: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/92/9f/69/929f69f1-9977-3a44-d674-11f70c852d1b/24UMGIM36186.rgb.jpg/300x300bb.jpg',
      uri: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/34/31/d3/3431d34e-847f-5d66-df83-0bce688d997e/mzaf_18106743962423782018.plus.aac.p.m4a',
      durationMs: 210373,
      clipStartSeconds: 0,
      clipEndSeconds: 30,
    },
    createdAt: new Date('2025-06-21T22:45:00.000Z').getTime(),
    comments: [],
    reflectionQuestion: 'What moment from your past would you most want to revisit?',
    reflectionAnswer: 'The morning I woke up with nowhere to be, sunlight through the curtains, and nowhere I wanted to go. I didn\'t know it was special then. I do now.',
  },
  // Entry 3 — Clear night sky, happy mood (stars + shooting stars)
  {
    id: 'landing-3',
    date: '2026-03-08',
    timestamp: '2026-03-09T05:00:00.000Z',
    mood: 'happy',
    content: `<p><strong>Search for any song</strong> and it becomes part of your entry.</p>
<p>A 30-second clip plays right here — not a link, not a redirect. The <strong>music is woven into the memory</strong>. When you come back to read this entry, the song plays and suddenly you're back in that exact moment.</p>
<p><strong>Try pressing play.</strong> You'll see what we mean.</p>`,
    weather: {
      temperature: 15,
      description: 'clear sky',
      icon: 'moon',
      location: 'Los Angeles, California',
    },
    track: {
      id: '900672692',
      name: 'Like Real People Do',
      artist: 'Hozier',
      album: 'Hozier (Expanded Edition)',
      albumArt: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/5e/1b/f1/5e1bf1de-e5f1-e73e-0752-e7882b4f2d57/886444718820.jpg/300x300bb.jpg',
      uri: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/fc/ac/c7/fcacc74c-0af0-96c2-5242-413edf274c8c/mzaf_13137692970460201319.plus.aac.p.m4a',
      durationMs: 198029,
      clipStartSeconds: 0,
      clipEndSeconds: 30,
    },
    createdAt: new Date('2026-03-08T21:30:00.000Z').getTime(),
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
