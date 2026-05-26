import { useState, useEffect, useCallback, useRef } from 'react';
import { WeatherData } from '@/types';
import { getUserLocation, getWeatherForLocation, DEFAULT_COORDINATES } from '@/utils/weatherUtils';
import { logger } from '@/lib/logger';

export function useWeatherData(initialWeather: WeatherData | null = null) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(initialWeather);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Guards against overlapping fetches when handleGetWeather is called
  // both by the auto-fetch effect and manually by the consumer.
  const fetchInProgress = useRef(false);
  // Tracks whether we've already kicked off the initial auto-fetch.
  // Prevents the dep-driven effect from re-firing when its own state updates.
  const didAutoFetch = useRef(false);

  const handleGetWeather = useCallback(async () => {
    if (fetchInProgress.current) return;
    fetchInProgress.current = true;

    setIsLoadingWeather(true);
    setLocationError(null);

    try {
      const coords = await getUserLocation();
      const data = await getWeatherForLocation(coords.latitude, coords.longitude);
      setWeatherData(data);
    } catch (error) {
      logger.error('useWeatherData', 'failed to fetch user location/weather:', error);
      setLocationError(error instanceof Error ? error.message : 'Failed to get location');

      try {
        const fallbackData = await getWeatherForLocation(
          DEFAULT_COORDINATES.lat,
          DEFAULT_COORDINATES.lon,
        );
        setWeatherData(fallbackData);
      } catch (fallbackError) {
        logger.error('useWeatherData', 'fallback weather fetch failed:', fallbackError);
      }
    } finally {
      setIsLoadingWeather(false);
      fetchInProgress.current = false;
    }
  }, []);

  // Auto-fetch on mount when no initial data was provided.
  // Runs exactly once thanks to the didAutoFetch ref — including state we
  // ourselves set in dependencies (weatherData / isLoadingWeather) would
  // otherwise re-trigger this effect on every transition.
  useEffect(() => {
    if (didAutoFetch.current || weatherData) return;
    didAutoFetch.current = true;
    handleGetWeather();
  }, [weatherData, handleGetWeather]);

  return {
    weatherData,
    setWeatherData,
    isLoadingWeather,
    locationError,
    handleGetWeather,
  };
}
