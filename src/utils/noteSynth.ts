/**
 * Tiny Web Audio synthesizer for short, plucky "note" sounds — no audio
 * files, just an oscillator with a fast attack / short decay envelope.
 * Used by MusicWaveformShowcase to play a note per letter as it resolves.
 *
 * The AudioContext is created lazily, only from inside a real user gesture
 * (a click), since browsers block audio playback until one occurs — do not
 * call getAudioContext() on mount or from a scroll handler.
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }
  return audioContext;
}

/**
 * Unlocks/resumes the shared AudioContext. Call this directly inside a
 * click handler (the user gesture itself) before any playNote() calls.
 */
export function unlockAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {
      /* ignore — playNote() will just no-op if this never unlocks */
    });
  }
}

/**
 * Plays a single short tone at the given frequency (Hz). Silently does
 * nothing if Web Audio isn't available or hasn't been unlocked yet.
 */
export function playNote(frequency: number): void {
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'running') return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle'; // softer than a sine, brighter than a square
  osc.frequency.value = frequency;

  // Quick attack, gentle exponential decay — a soft mallet/music-box pluck.
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.16, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.55);
}

// C major pentatonic — no "wrong" notes no matter the order, so letters can
// trigger in quick succession without ever sounding dissonant.
const PENTATONIC_SEMITONES = [0, 2, 4, 7, 9];
const BASE_FREQUENCY = 523.25; // C5
// Caps how high the ascent climbs. A 27-letter sentence would otherwise
// plateau at C7–A7 (2–3.5kHz) for its whole back half — genuinely shrill,
// especially on phone speakers. Capping at +1 octave keeps the tail end in
// a comfortable chime register (C6–A6, ~1–1.8kHz) instead.
const MAX_OCTAVE_RISE = 1;

/**
 * Maps a sequence index (e.g. letter position in a sentence) to a frequency
 * that climbs the pentatonic scale as the index increases, capping the
 * octave rise so a long sequence doesn't climb into painfully high pitches —
 * it plateaus and keeps cycling through the top octave's five notes instead.
 */
export function noteForIndex(index: number): number {
  const degree = PENTATONIC_SEMITONES[index % PENTATONIC_SEMITONES.length];
  const octave = Math.min(MAX_OCTAVE_RISE, Math.floor(index / PENTATONIC_SEMITONES.length));
  const semitones = degree + octave * 12;
  return BASE_FREQUENCY * Math.pow(2, semitones / 12);
}
