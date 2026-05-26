import { useEffect, useMemo, useRef, useState } from 'react';
import type { JournalEntry } from '@/types';
import {
  deriveWeatherCategory,
  deriveTimeOfDay,
  useWeatherAnimation,
} from '@/components/journal/weather-overlay';

interface ContentAreaBounds {
  top: number;
  bottom: number;
}

/**
 * Card-only weather state. Wires `useWeatherAnimation` (the button-driven
 * 8-second weather animation) to the article DOM rect so the overlay can
 * dodge the content area while playing.
 *
 * The full-view layout uses the global fullscreen weather overlay instead
 * (see `WeatherOverlayContext`) — that flow has no animation button and no
 * content-area dodge, so it doesn't need any of this.
 */
export function useEntryCardWeather(entry: JournalEntry) {
  const articleRef = useRef<HTMLElement>(null);

  const weatherCategory = useMemo(
    () => (entry.weather?.description ? deriveWeatherCategory(entry.weather.description) : null),
    [entry.weather?.description],
  );

  const timeOfDay = useMemo(
    () => deriveTimeOfDay(entry.timestamp || entry.date),
    [entry.timestamp, entry.date],
  );

  const animation = useWeatherAnimation(entry.id);

  const [contentAreaBounds, setContentAreaBounds] = useState<ContentAreaBounds | undefined>();

  // While the weather animation is visible, compute the content area as a
  // percentage of the article height. The overlay uses this to avoid drawing
  // particles directly over the text.
  useEffect(() => {
    if (!animation.isVisible || !articleRef.current) {
      setContentAreaBounds(undefined);
      return;
    }

    const article = articleRef.current;
    const contentRect = article
      .querySelector<HTMLElement>('[data-entry-content]')
      ?.getBoundingClientRect();
    if (!contentRect) return;

    const articleRect = article.getBoundingClientRect();
    setContentAreaBounds({
      top: ((contentRect.top - articleRect.top) / articleRect.height) * 100,
      bottom: ((contentRect.bottom - articleRect.top) / articleRect.height) * 100,
    });
  }, [animation.isVisible]);

  return {
    articleRef,
    weatherCategory,
    timeOfDay,
    contentAreaBounds,
    isWeatherPlaying: animation.isPlaying,
    isWeatherVisible: animation.isVisible,
    weatherOpacity: animation.opacity,
    weatherPhase: animation.phase,
    playWeatherAnimation: animation.playAnimation,
  };
}
