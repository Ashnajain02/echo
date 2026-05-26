import React, { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { WeatherData, Mood } from '@/types';
import {
  deriveWeatherCategory,
  deriveTimeOfDay,
} from '@/components/journal/weather-overlay';
import { useFullscreenWeather } from '@/contexts/WeatherOverlayContext';
import { moodLabels } from '@/constants/moods';
import { formatEntryDate, formatEntryYear, formatEntryTime } from '@/utils/dateUtils';
import { formatTemperature } from '@/utils/temperature';

interface EntryPageLayoutProps {
  // Date/time
  date: string;         // YYYY-MM-DD
  timestamp?: string;   // ISO string
  // Metadata
  mood?: Mood;
  weather?: WeatherData;
  // Weather overlay
  weatherEnabled?: boolean;
  onWeatherToggle?: () => void;
  // Temperature formatting
  formatTemperature?: (celsius: number) => string;
  // Top-right actions slot
  actions?: React.ReactNode;
  // Additional metadata line content
  metadataExtra?: React.ReactNode;
  // Content sections
  children: React.ReactNode;
  // Below-content sections (reflection, comments, etc.)
  footer?: React.ReactNode;
  // Styling
  className?: string;
}

const EntryPageLayout: React.FC<EntryPageLayoutProps> = ({
  date,
  timestamp,
  mood,
  weather,
  weatherEnabled = true,
  onWeatherToggle,
  formatTemperature: formatTemp,
  actions,
  metadataExtra,
  children,
  footer,
  className,
}) => {
  const dateSource = timestamp || date;
  const formattedDate = formatEntryDate(dateSource);
  const formattedYear = formatEntryYear(dateSource);
  const formattedTime = timestamp ? formatEntryTime(timestamp) : '';

  const weatherCategory = weather?.description ? deriveWeatherCategory(weather.description) : null;
  const timeOfDay = deriveTimeOfDay(timestamp || date);

  const tempFormatter = formatTemp || ((celsius: number) => formatTemperature(celsius));

  // Track whether this entry's page surface is currently visible. We can't
  // reuse `weatherEnabled` for this — it's intentionally one-way (see
  // useEntryState / LandingEntry) so the user toggle persists when the
  // notes section expands. Without an independent visibility signal, every
  // entry the user scrolls past stays a publisher and the most-recent one
  // gets stuck on screen after scrolling back up.
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Publish weather state into the single fullscreen overlay portal.
  // Only one overlay is rendered globally (most-recent publisher wins),
  // which prevents multiple ScrollEntry instances from stacking fixed overlays.
  // Gated on `isInView` so off-screen entries don't linger as publishers.
  const overlayOwnerId = useId();
  const { setOverlay } = useFullscreenWeather();
  useEffect(() => {
    if (weatherCategory && weatherEnabled && isInView) {
      setOverlay(overlayOwnerId, { category: weatherCategory, timeOfDay });
    } else {
      setOverlay(overlayOwnerId, null);
    }
    return () => {
      setOverlay(overlayOwnerId, null);
    };
  }, [overlayOwnerId, setOverlay, weatherCategory, weatherEnabled, timeOfDay, isInView]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={cn("relative", className)}
    >
      {/* Page content */}
      <div className="relative z-10">
        {/* Actions — top right */}
        {actions && (
          <div className="flex justify-end mb-6">
            {actions}
          </div>
        )}

        {/* Date — centered hero */}
        <div className="text-center mb-4">
          <h1 className="font-display text-4xl md:text-5xl font-normal text-foreground tracking-tight leading-tight">
            {formattedDate}
          </h1>
        </div>

        {/* Metadata line */}
        <p className="text-center text-sm text-muted-foreground/70 mb-3">
          {formattedYear}
          {formattedTime && <> &middot; {formattedTime}</>}
          {weather && (
            <>
              {' '}&middot; {tempFormatter(weather.temperature)}
              {weather.description && <> &middot; <span className="capitalize">{weather.description}</span></>}
              {weather.location && <> &middot; {weather.location}</>}
            </>
          )}
          {metadataExtra}
        </p>

        {/* Mood + weather toggle — centered */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/50 tracking-widest uppercase mb-6">
          {mood && <span>{moodLabels[mood] || mood}</span>}
          {weatherCategory && onWeatherToggle && (
            <>
              {mood && <span className="opacity-40">&middot;</span>}
              <button
                onClick={onWeatherToggle}
                className="hover:text-muted-foreground transition-colors"
              >
                {weatherEnabled ? 'Weather on' : 'Weather off'}
              </button>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="flex justify-center mb-10">
          <div className="w-12 h-px bg-border" />
        </div>

        {/* Main content */}
        {children}

        {/* Footer (reflection, comments, etc.) */}
        {footer && (
          <>
            <div className="flex justify-center my-10">
              <div className="w-12 h-px bg-border" />
            </div>
            {footer}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default EntryPageLayout;
