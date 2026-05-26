import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const SOURCE_TEXT = 'Your thoughts are always protected';
const WORDS = SOURCE_TEXT.split(' ');

// Each character needs: word index, char index within word, and the actual char
interface CharInfo {
  char: string;
  wordIdx: number;
  charIdx: number;
}

const ALL_CHARS: CharInfo[] = [];
WORDS.forEach((word, wi) => {
  word.split('').forEach((char, ci) => {
    ALL_CHARS.push({ char, wordIdx: wi, charIdx: ci });
  });
});

function buildLockPoints(count: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const shackleCount = Math.floor(count * 0.35);
  for (let i = 0; i < shackleCount; i++) {
    const angle = Math.PI + (Math.PI * i) / (shackleCount - 1);
    points.push({
      x: 0.5 + Math.cos(angle) * 0.22,
      y: 0.15 + Math.sin(angle) * 0.22,
    });
  }
  const bodyCount = count - shackleCount;
  const side = Math.max(1, Math.floor(bodyCount / 4));
  for (let i = 0; i < side; i++) points.push({ x: 0.28, y: 0.15 + (i / side) * 0.65 });
  for (let i = 0; i < side; i++) points.push({ x: 0.28 + (i / side) * 0.44, y: 0.8 });
  for (let i = 0; i < side; i++) points.push({ x: 0.72, y: 0.8 - (i / side) * 0.65 });
  for (let i = 0; i < side; i++) points.push({ x: 0.72 - (i / side) * 0.44, y: 0.15 });
  return points.slice(0, count);
}

// Build text positions: words centered on rows
function buildTextPositions(): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  // Row 1: "Your thoughts are always"  Row 2: "protected"
  const rows = [
    ['Your', 'thoughts', 'are', 'always'],
    ['protected'],
  ];

  const charWidth = 0.032;
  const wordGap = 0.04;
  const rowY = [0.42, 0.52];

  rows.forEach((row, ri) => {
    // Calculate total row width
    let totalWidth = 0;
    row.forEach((word, wi) => {
      totalWidth += word.length * charWidth;
      if (wi < row.length - 1) totalWidth += wordGap;
    });

    let x = 0.5 - totalWidth / 2;
    row.forEach((word, wi) => {
      for (let ci = 0; ci < word.length; ci++) {
        positions.push({ x: x + ci * charWidth + charWidth / 2, y: rowY[ri] });
      }
      x += word.length * charWidth + wordGap;
    });
  });

  return positions;
}

const textPositions = buildTextPositions();
const lockPositions = buildLockPoints(ALL_CHARS.length);

// Layout constants tuned to remove the dead-scroll trail after the animation:
//   - The sticky surface is sized to fit the letter + tagline content tightly,
//     so when it eventually slides out of view there's no large empty centered
//     band to scroll through.
//   - The outer wrapper is just tall enough to give the sticky a comfortable
//     pin window for the animation to play (OUTER_VH - STICKY_VH = pin travel),
//     then the next section follows immediately.
const STICKY_VH = 60;
const OUTER_VH = 100;
const PIN_TRAVEL_VH = OUTER_VH - STICKY_VH; // = animation scroll duration

const EncryptionAnimation: React.FC = () => {
  const outerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const el = outerRef.current;
      if (!el) return;

      // Pin travel in pixels = how far the user can scroll while the sticky is
      // still pinned. Progress runs 0 → 1 across that range.
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

  // Ease the progress for smoother feel
  const ease = progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;

  return (
    <div ref={outerRef} style={{ height: `${OUTER_VH}vh` }} className="relative">
      <div
        className="sticky top-0 flex flex-col items-center justify-center px-6"
        style={{ height: `${STICKY_VH}vh` }}
      >
        <div className="relative w-full max-w-2xl mx-auto" style={{ height: '320px' }}>
          {ALL_CHARS.map((c, i) => {
            const tp = textPositions[i] || { x: 0.5, y: 0.5 };
            const lp = lockPositions[i] || { x: 0.5, y: 0.5 };
            const x = tp.x + (lp.x - tp.x) * ease;
            const y = tp.y + (lp.y - tp.y) * ease;

            return (
              <span
                key={i}
                className="absolute font-display text-3xl md:text-4xl text-foreground"
                style={{
                  left: `${x * 100}%`,
                  top: `${y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {c.char}
              </span>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mt-8"
        >
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground/50 tracking-widest uppercase flex-wrap">
            <span>AES-256 Encrypted</span>
            <span className="opacity-40">&middot;</span>
            <span>Client-Side</span>
            <span className="opacity-40">&middot;</span>
            <span>Zero Knowledge</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EncryptionAnimation;
