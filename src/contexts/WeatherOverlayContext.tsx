import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { WeatherOverlay } from '@/components/journal/weather-overlay';
import type { WeatherCategory, TimeOfDay } from '@/components/journal/weather-overlay';

/**
 * Fullscreen weather overlay portal.
 *
 * Model:
 *   - Each journal entry on screen registers its DOM element and its weather
 *     with this provider via `useFullscreenWeather().setEntry(id, payload)`.
 *   - A single shared IntersectionObserver tracks every registered element.
 *     On every visibility change, we pick the entry with the largest visible
 *     viewport area and render its weather.
 *   - When no registered entry is in view (e.g. the landing-page hero, the
 *     email/contact section), the overlay fades out over 500ms.
 *
 * Why a single context rather than per-entry overlays:
 *   The overlay is `position: fixed`, so multiple instances would stack and
 *   read incorrectly. Centralizing the decision also makes "what's focused?"
 *   a single, testable question.
 */

interface FullscreenWeather {
  category: WeatherCategory;
  timeOfDay: TimeOfDay;
}

interface EntryRegistration {
  element: HTMLElement;
  weather: FullscreenWeather;
}

interface WeatherOverlayValue {
  setEntry: (id: string, registration: EntryRegistration | null) => void;
}

const WeatherOverlayContext = createContext<WeatherOverlayValue | null>(null);

const FADE_OUT_MS = 500;

// IntersectionObserver granularity. More thresholds = smoother handoff between
// entries during scroll, at minor CPU cost. Six steps is plenty.
const OBSERVER_THRESHOLDS = [0, 0.1, 0.25, 0.5, 0.75, 1];

function sameWeather(a: FullscreenWeather | null, b: FullscreenWeather | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.category === b.category && a.timeOfDay === b.timeOfDay;
}

function visibleArea(rect: DOMRect): number {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const h = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
  const w = Math.max(0, Math.min(rect.right, vw) - Math.max(rect.left, 0));
  return h * w;
}

export const WeatherOverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // What the observer thinks is currently focused.
  const [focused, setFocused] = useState<FullscreenWeather | null>(null);
  // What's actually mounted in the DOM. Lags `focused` by FADE_OUT_MS when
  // focused becomes null, so the canvas can fade out before unmounting.
  const [displayed, setDisplayed] = useState<FullscreenWeather | null>(null);

  const registryRef = useRef<Map<string, EntryRegistration>>(new Map());

  // Recompute which entry is the most-visible focal entry. Called from the
  // observer callback. Kept stable so it can be safely referenced from a ref.
  const recompute = useCallback(() => {
    let best: FullscreenWeather | null = null;
    let bestArea = 0;
    for (const { element, weather } of registryRef.current.values()) {
      const area = visibleArea(element.getBoundingClientRect());
      if (area > bestArea) {
        bestArea = area;
        best = weather;
      }
    }
    setFocused(prev => (sameWeather(prev, best) ? prev : best));
  }, []);

  // Single observer, lazy-initialized so it exists synchronously by the time
  // consumers call `setEntry` from their own effects.
  const observerRef = useRef<IntersectionObserver | null>(null);
  if (observerRef.current === null && typeof IntersectionObserver !== 'undefined') {
    observerRef.current = new IntersectionObserver(() => recompute(), {
      threshold: OBSERVER_THRESHOLDS,
    });
  }

  // Defer-unmount the displayed overlay so the WeatherOverlay's built-in
  // 500ms opacity transition can complete before we tear down the canvas.
  useEffect(() => {
    if (focused) {
      setDisplayed(focused);
      return;
    }
    const timer = window.setTimeout(() => setDisplayed(null), FADE_OUT_MS);
    return () => window.clearTimeout(timer);
  }, [focused]);

  // Tear down observer on unmount.
  useEffect(() => () => observerRef.current?.disconnect(), []);

  const setEntry = useCallback(
    (id: string, registration: EntryRegistration | null) => {
      const registry = registryRef.current;
      const observer = observerRef.current;
      const existing = registry.get(id);

      if (!registration) {
        if (!existing) return;
        observer?.unobserve(existing.element);
        registry.delete(id);
        recompute();
        return;
      }

      if (existing && existing.element !== registration.element) {
        observer?.unobserve(existing.element);
      }
      if (!existing || existing.element !== registration.element) {
        observer?.observe(registration.element);
      }
      registry.set(id, registration);
      recompute();
    },
    [recompute],
  );

  const value = useMemo<WeatherOverlayValue>(() => ({ setEntry }), [setEntry]);

  return (
    <WeatherOverlayContext.Provider value={value}>
      {/*
        Render the overlay BEFORE children so that, when both the overlay and
        a page-level fixed container (e.g. DayNavigator's `fixed inset-0` wrapper)
        end up as siblings in the root stacking context at the same z-level,
        DOM order makes the page win the tie-break and paint over the overlay.
        Reordering here costs nothing and avoids negative-z-index hacks.
      */}
      {displayed && (
        <WeatherOverlay
          key={`${displayed.category}-${displayed.timeOfDay}`}
          category={displayed.category}
          timeOfDay={displayed.timeOfDay}
          isVisible
          opacity={focused ? 1 : 0}
          phase="playing"
          fullscreen
        />
      )}
      {children}
    </WeatherOverlayContext.Provider>
  );
};

const NOOP: WeatherOverlayValue = { setEntry: () => {} };

export const useFullscreenWeather = (): WeatherOverlayValue => {
  return useContext(WeatherOverlayContext) ?? NOOP;
};
