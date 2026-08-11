import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface TimelineMoment {
  year: string;
  mood: string;
  snippet: string;
}

// A deliberate arc, oldest → newest (top → bottom), so scrolling down reads
// as moving forward in time — the point isn't "look what happened," it's
// "look how far you've come."
const MOMENTS: TimelineMoment[] = [
  {
    year: '2023',
    mood: 'Frustrated',
    snippet: "Started another ‘Monday reset.’ Same goal I’ve written a hundred times before.",
  },
  {
    year: '2024',
    mood: 'Determined',
    snippet: "Down 18 pounds. Slower than I hoped, but I haven’t quit this time — and that’s new for me.",
  },
  {
    year: '2025',
    mood: 'Proud',
    snippet: "Ran my first 5K this morning. Didn’t think about the scale once.",
  },
];

// Scroll-scrubbed phase boundaries (as fractions of pin-travel progress).
// Each row's reveal window, then rail growth spans from the first row's
// start to the last row's end, then the closing line.
const ROW_PHASES = [
  { start: 0.06, end: 0.3 },
  { start: 0.36, end: 0.6 },
  { start: 0.66, end: 0.9 },
];
const RAIL_START = ROW_PHASES[0].start;
const RAIL_END = ROW_PHASES[ROW_PHASES.length - 1].end;
const OUTRO_START = 0.92;
const OUTRO_END = 1;
const DOT_POP_SPAN = 0.06; // dot scales in over the first slice of its row's window

function remap(t: number, start: number, end: number): number {
  if (end === start) return t >= end ? 1 : 0;
  return Math.max(0, Math.min(1, (t - start) / (end - start)));
}

// Layout: outer wrapper is tall enough to give the sticky surface a long
// pin window (OUTER_VH - STICKY_VH = scroll distance the animation scrubs
// across); the sticky surface itself holds the actual visible content.
// Same technique as EncryptionAnimation, so scrolling up unwinds it exactly
// as scrolling down winds it forward — it's a pure function of scroll
// position, not a one-shot "trigger and play."
const STICKY_VH = 100;
const OUTER_VH = 240;
const PIN_TRAVEL_VH = OUTER_VH - STICKY_VH;

/**
 * Landing page feature showcase for "On this day" (the real /memories
 * behavior: past entries surfaced on the same month + day, in previous
 * years). Deliberately not styled like a journal entry — no date header,
 * no weather/location chrome — this is a feature demo, not a mock entry.
 * The realistic entry look lives entirely in the first landing section.
 */
const OnThisDayShowcase: React.FC = () => {
  const outerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

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

  const railT = remap(progress, RAIL_START, RAIL_END);
  const outroT = remap(progress, OUTRO_START, OUTRO_END);

  return (
    <section className="px-6">
      <div className="w-full max-w-3xl mx-auto px-6 md:px-16">
        {/* Scroll-scrubbed timeline — pinned while you scroll through it,
            rewinds exactly in reverse when you scroll back up. The header
            lives inside the sticky surface too, so it stays in frame
            together with the timeline instead of scrolling away above it. */}
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
              className="text-center mb-12"
            >
              <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground/70 mb-4">
                On This Day
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-normal text-foreground tracking-tight leading-tight">
                Same day. Every year.
              </h2>
              <p className="text-xl md:text-2xl text-foreground/80 leading-relaxed mt-3">
                See how far you've come.
              </p>
            </motion.div>

            <div className="relative pl-10 max-w-xl mx-auto w-full">
              <div
                className="absolute left-[6.5px] top-2 bottom-2 w-px bg-border origin-top"
                style={{ transform: `scaleY(${railT})` }}
              />

              {MOMENTS.map((moment, i) => {
                const isCurrent = i === MOMENTS.length - 1;
                const { start, end } = ROW_PHASES[i];
                const rowT = remap(progress, start, end);
                const dotT = remap(progress, start, start + DOT_POP_SPAN);

                return (
                  <div
                    key={moment.year}
                    className="relative pb-12 last:pb-0"
                    style={{ opacity: rowT, transform: `translateX(${(1 - rowT) * -12}px)` }}
                  >
                    <span
                      className={
                        isCurrent
                          ? "absolute -left-10 top-2 h-3.5 w-3.5 rounded-full bg-primary"
                          : "absolute -left-10 top-2 h-3.5 w-3.5 rounded-full bg-card border-2 border-border"
                      }
                      style={{ transform: `scale(${dotT})` }}
                    />
                    <div className="flex items-baseline gap-4 mb-2">
                      <span className="font-display text-3xl md:text-4xl text-foreground">{moment.year}</span>
                      <span className="text-sm uppercase tracking-wider text-muted-foreground/70">
                        {moment.mood}
                      </span>
                    </div>
                    <p className="text-lg md:text-xl text-foreground/80 italic leading-relaxed">
                      {moment.snippet}
                    </p>
                  </div>
                );
              })}
            </div>

            <p
              className="text-center text-lg text-muted-foreground/60 italic mt-8"
              style={{ opacity: outroT }}
            >
              Same date. Three completely different people. All still you.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OnThisDayShowcase;
