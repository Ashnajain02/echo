import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { WeatherOverlay } from '@/components/journal/weather-overlay';
import type { WeatherCategory, TimeOfDay } from '@/components/journal/weather-overlay';

interface FullscreenWeather {
  category: WeatherCategory;
  timeOfDay: TimeOfDay;
}

interface OverlayEntry {
  ownerId: string;
  weather: FullscreenWeather;
}

interface WeatherOverlayValue {
  setOverlay: (ownerId: string, weather: FullscreenWeather | null) => void;
}

const WeatherOverlayContext = createContext<WeatherOverlayValue | null>(null);

export const WeatherOverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [overlays, setOverlays] = useState<OverlayEntry[]>([]);

  const setOverlay = useCallback((ownerId: string, weather: FullscreenWeather | null) => {
    setOverlays(prev => {
      const without = prev.filter(o => o.ownerId !== ownerId);
      if (weather) {
        return [...without, { ownerId, weather }];
      }
      if (without.length === prev.length) {
        return prev;
      }
      return without;
    });
  }, []);

  const active = overlays.length > 0 ? overlays[overlays.length - 1] : null;

  const value = useMemo(() => ({ setOverlay }), [setOverlay]);

  return (
    <WeatherOverlayContext.Provider value={value}>
      {children}
      {active && (
        <WeatherOverlay
          key={`${active.weather.category}-${active.weather.timeOfDay}`}
          category={active.weather.category}
          timeOfDay={active.weather.timeOfDay}
          isVisible
          opacity={1}
          phase="playing"
          fullscreen
        />
      )}
    </WeatherOverlayContext.Provider>
  );
};

const NOOP: WeatherOverlayValue = { setOverlay: () => {} };

export const useFullscreenWeather = (): WeatherOverlayValue => {
  return useContext(WeatherOverlayContext) ?? NOOP;
};
