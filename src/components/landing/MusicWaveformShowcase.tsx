import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Music2, Volume2, VolumeX } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { noteForIndex, playNote, unlockAudio } from '@/utils/noteSynth';

// The phrase the waveform resolves into — written like a line from an entry,
// not a marketing tagline. Punctuation-free, matching how EncryptionAnimation
// treats its source text (keeps character-position math simple).
const ROWS = [
  ['I', 'remember', 'exactly'],
  ['how', 'this', 'felt'],
];

interface CharInfo {
  char: string;
  x: number; // fractional (0–1) canvas position
  y: number; // fractional (0–1) canvas position
  amplitude: number; // this character's "bar" height before it collapses into text
}

// Letter spacing is a fraction of the canvas width, but the canvas itself
// spans a very different pixel width on mobile (~260px, after the section's
// double horizontal padding) vs desktop (up to 768px) while the font only
// jumps once at the md: breakpoint — so a single spacing constant is either
// too tight on mobile (letters collide) or too sparse on desktop. Tuned
// separately per breakpoint instead, matching Tailwind's own md: cutoff via
// useIsMobile so both switch at the same viewport width.
function buildChars(isMobile: boolean): CharInfo[] {
  // Tighter than a typeset font would want — Caveat is a connected script,
  // so letters need to sit close enough to read as one flowing word rather
  // than individual floating characters.
  const charWidth = isMobile ? 0.05 : 0.038;
  const wordGap = isMobile ? 0.03 : 0.050;
  // Rows sit far enough apart that each row's tallest bars (amplitude below)
  // can never reach into the other row's — that's what was causing the two
  // rows of bars to visually collide into one cluttered band.
  const rowY = [0.28, 0.72];
  const chars: CharInfo[] = [];

  ROWS.forEach((row, ri) => {
    let totalWidth = 0;
    row.forEach((word, wi) => {
      totalWidth += word.length * charWidth;
      if (wi < row.length - 1) totalWidth += wordGap;
    });

    let x = 0.5 - totalWidth / 2;
    row.forEach((word) => {
      for (let ci = 0; ci < word.length; ci++) {
        chars.push({
          char: word[ci],
          x: x + ci * charWidth + charWidth / 2,
          y: rowY[ri],
          // Vowels read as "louder" (taller bars) purely for visual rhythm —
          // not meaningful, just keeps the waveform from looking uniform.
          amplitude: 'aeiouAEIOU'.includes(word[ci]) ? 0.16 + Math.random() * 0.1 : 0.08 + Math.random() * 0.1,
        });
      }
      x += word.length * charWidth + wordGap;
    });
  });

  return chars;
}

// Each character gets its own sweep window so the collapse ripples left to
// right instead of every bar dropping at once — the wave visibly becomes
// the sentence, one syllable at a time.
const SWEEP_START = 0.06;
const SWEEP_END = 0.82;
const CHAR_WINDOW = 0.14;
const NOTE_COUNT = 6;
const OUTRO_START = 0.88;
const OUTRO_END = 1;

function remap(t: number, start: number, end: number): number {
  if (end === start) return t >= end ? 1 : 0;
  return Math.max(0, Math.min(1, (t - start) / (end - start)));
}

function ease(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Symmetric 0 → 1 → 0 pulse, for the drifting music notes — a pure function
// of scroll progress, so it "plays" forward and "unplays" in reverse exactly
// like everything else here.
function pulse(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return Math.sin(clamped * Math.PI);
}

const NOTES = Array.from({ length: NOTE_COUNT }, (_, i) => {
  const t = i / (NOTE_COUNT - 1);
  return {
    // Travels above the sweep, roughly tracking where the collapse currently is.
    x: 0.08 + t * 0.84,
    y: 0.16 + (i % 2 === 0 ? 0 : 0.06),
    start: SWEEP_START + t * (SWEEP_END - SWEEP_START - 0.1),
    rotate: (i % 2 === 0 ? -1 : 1) * (8 + Math.random() * 10),
  };
});
const NOTE_WINDOW = 0.16;

const STICKY_VH = 100;
const OUTER_VH = 220;
const PIN_TRAVEL_VH = OUTER_VH - STICKY_VH;
const CANVAS_HEIGHT = 260;

/**
 * Landing page feature showcase for adding a song to an entry. A row of
 * waveform bars collapses into the words of a sentence as you scroll — sound
 * becoming memory, made literal — with a few music notes drifting past along
 * the way. Fully scroll-scrubbed (same pinned-progress technique as
 * EncryptionAnimation / OnThisDayShowcase): scroll down to play it forward,
 * scroll up and it unwinds exactly in reverse.
 */
const NOTE_TRIGGER_THRESHOLD = 0.5;

const MusicWaveformShowcase: React.FC = () => {
  const outerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const isMobile = useIsMobile();
  const chars = useMemo(() => buildChars(isMobile), [isMobile]);
  const prevCharProgressRef = useRef<number[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      const el = outerRef.current;
      if (!el) return;
      const pinTravelPx = window.innerHeight * (PIN_TRAVEL_VH / 100);
      if (pinTravelPx <= 0) return;
      const scrolled = -el.getBoundingClientRect().top;
      const t = scrolled / pinTravelPx;
      setProgress(Math.max(0, Math.min(1, t)));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const charProgress = useMemo(() => {
    const denom = Math.max(1, chars.length - 1);
    return chars.map((_, i) => {
      const start = SWEEP_START + (i / denom) * (SWEEP_END - SWEEP_START - CHAR_WINDOW);
      return ease(remap(progress, start, start + CHAR_WINDOW));
    });
  }, [progress, chars]);

  // Play a note the instant a letter crosses the "resolved" threshold while
  // scrolling forward — never on the way back up, so rewinding stays silent
  // even though the visual fully unwinds. Comparing against the previous
  // frame's values (rather than tracking a "has played" flag) means scrolling
  // down past a letter again later naturally replays its note too.
  useEffect(() => {
    const prev = prevCharProgressRef.current;
    if (soundEnabled) {
      charProgress.forEach((t, i) => {
        const prevT = prev[i] ?? 0;
        if (prevT < NOTE_TRIGGER_THRESHOLD && t >= NOTE_TRIGGER_THRESHOLD) {
          playNote(noteForIndex(i));
        }
      });
    }
    prevCharProgressRef.current = charProgress;
  }, [charProgress, soundEnabled]);

  const handleToggleSound = () => {
    if (!soundEnabled) {
      // Must be called synchronously inside this click handler — this is the
      // user gesture browsers require before they'll let audio play at all.
      unlockAudio();
    }
    setSoundEnabled((prev) => !prev);
  };

  const outroT = remap(progress, OUTRO_START, OUTRO_END);

  return (
    <section className="px-6">
      <div className="w-full max-w-3xl mx-auto px-6 md:px-16">
        <div ref={outerRef} className="relative" style={{ height: `${OUTER_VH}vh` }}>
          <div
            className="sticky top-0 flex flex-col items-center justify-center"
            style={{ height: `${STICKY_VH}vh` }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-10"
            >
              <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground/70 mb-4">
                Add A Song
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-normal text-foreground tracking-tight leading-tight">
                Sound becomes memory.
              </h2>

              <button
                type="button"
                onClick={handleToggleSound}
                aria-pressed={soundEnabled}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/30"
              >
                {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                {soundEnabled ? 'Sound on' : 'Turn on sound'}
              </button>
            </motion.div>

            {/* Waveform → words canvas */}
            <div className="relative w-full max-w-3xl mx-auto" style={{ height: `${CANVAS_HEIGHT}px` }}>
              {NOTES.map((note, i) => {
                const p = pulse(remap(progress, note.start, note.start + NOTE_WINDOW));
                return (
                  <Music2
                    key={i}
                    className="absolute text-primary/50"
                    style={{
                      left: `${note.x * 100}%`,
                      top: `${note.y * 100}%`,
                      width: '1.25rem',
                      height: '1.25rem',
                      opacity: p,
                      transform: `translate(-50%, ${(1 - p) * 10}px) rotate(${note.rotate}deg) scale(${0.7 + p * 0.4})`,
                    }}
                  />
                );
              })}

              {chars.map((c, i) => {
                const t = charProgress[i];
                const barHeight = (1 - t) * c.amplitude * CANVAS_HEIGHT;
                return (
                  <React.Fragment key={i}>
                    <div
                      className="absolute bg-primary/50 rounded-full"
                      style={{
                        left: `${c.x * 100}%`,
                        top: `${c.y * 100}%`,
                        width: '3px',
                        height: `${barHeight}px`,
                        opacity: 1 - t,
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                    <span
                      className="absolute font-script text-4xl md:text-6xl text-foreground"
                      style={{
                        left: `${c.x * 100}%`,
                        top: `${c.y * 100}%`,
                        opacity: t,
                        transform: `translate(-50%, -50%) translateY(${(1 - t) * 6}px)`,
                      }}
                    >
                      {c.char}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>

            <p
              className="flex items-center justify-center gap-3 text-sm text-muted-foreground/50 tracking-widest uppercase flex-wrap mt-2"
              style={{ opacity: outroT }}
            >
              <span>Search Any Song</span>
              <span className="opacity-40">&middot;</span>
              <span>30-Second Clips</span>
              <span className="opacity-40">&middot;</span>
              <span>Woven Into The Memory</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MusicWaveformShowcase;
