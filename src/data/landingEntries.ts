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
];
