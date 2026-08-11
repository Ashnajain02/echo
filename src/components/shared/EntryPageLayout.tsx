import React, { useEffect, useId, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { WeatherData, Mood } from '@/types';
import {
  deriveWeatherCategory,
  deriveTimeOfDay,
} from '@/components/journal/weather-overlay';
import { useFullscreenWeather } from '@/contexts/WeatherOverlayContext';
import { moodLabels } from '@/constants/moods';
import { formatEntryDayName, formatEntryDateWithYear, formatEntryTime } from '@/utils/dateUtils';
import { formatTemperature } from '@/utils/temperature';

interface EntryPageLayoutProps {
  // Date/time
  date: string;         // YYYY-MM-DD
  timestamp?: string;   // ISO string
  // Metadata
  mood?: Mood;
  weather?: WeatherData;
  // Weather overlay — whether it's shown for this entry right now (gated by
  // the account-wide "Show weather effects" setting upstream; see Settings >
  // Display). There's no per-entry toggle.
  weatherEnabled?: boolean;
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
  formatTemperature: formatTemp,
  actions,
  metadataExtra,
  children,
  footer,
  className,
}) => {
  const dateSource = timestamp || date;
  const formattedDayName = formatEntryDayName(dateSource);
  const formattedDateWithYear = formatEntryDateWithYear(dateSource);
  const formattedTime = timestamp ? formatEntryTime(timestamp) : '';

  const weatherCategory = weather?.description ? deriveWeatherCategory(weather.description) : null;
  const timeOfDay = deriveTimeOfDay(timestamp || date);

  const tempFormatter = formatTemp || ((celsius: number) => formatTemperature(celsius));

  const hasLocation = Boolean(weather?.location?.trim());
  const hasLedgerData = Boolean(formattedTime || hasLocation || weather || mood);

  // Register this entry with the fullscreen overlay portal. The portal owns
  // a single shared IntersectionObserver and picks whichever registered
  // entry has the most visible area as the focal one. We just declare
  // "here's my surface and here's my weather" — visibility tracking and
  // tie-breaking live in the context, not here.
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayOwnerId = useId();
  const { setEntry } = useFullscreenWeather();
  useEffect(() => {
    const element = containerRef.current;
    if (!element || !weatherCategory || !weatherEnabled) {
      setEntry(overlayOwnerId, null);
      return;
    }
    setEntry(overlayOwnerId, {
      element,
      weather: { category: weatherCategory, timeOfDay },
    });
    return () => setEntry(overlayOwnerId, null);
  }, [overlayOwnerId, setEntry, weatherCategory, weatherEnabled, timeOfDay]);

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

        {/* Date — eyebrow day name + full date hero */}
        <div className="text-center mb-2">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground">
            {formattedDayName}
          </p>
        </div>
        <div className="text-center mb-6">
          <h1 className="font-display text-4xl md:text-5xl font-normal text-foreground tracking-tight leading-tight">
            {formattedDateWithYear}
          </h1>
          {metadataExtra && (
            <p className="text-xs text-muted-foreground/70 mt-2">{metadataExtra}</p>
          )}
        </div>

        {/* Metadata ledger — Time / Location / Weather / Mood */}
        {hasLedgerData && (
          <dl className="entry-ledger mb-6">
            {formattedTime && (
              <div className="entry-ledger-field">
                <dt>Time</dt>
                <dd>{formattedTime}</dd>
              </div>
            )}
            {hasLocation && (
              <div className="entry-ledger-field">
                <dt>Location</dt>
                <dd>{weather!.location}</dd>
              </div>
            )}
            {weather && (
              <div className="entry-ledger-field">
                <dt>Weather</dt>
                <dd className="capitalize">
                  {tempFormatter(weather.temperature)}
                  {weather.description && <> &middot; {weather.description}</>}
                </dd>
              </div>
            )}
            {mood && (
              <div className="entry-ledger-field">
                <dt>Mood</dt>
                <dd>{moodLabels[mood] || mood}</dd>
              </div>
            )}
          </dl>
        )}

        {/* Divider */}
        <div className="flex justify-center mb-10">
          <div className="w-12 h-px bg-muted-foreground/30" />
        </div>

        {/* Main content */}
        {children}

        {/* Footer (reflection, comments, etc.) */}
        {footer && (
          <>
            <div className="flex justify-center my-10">
              <div className="w-12 h-px bg-muted-foreground/30" />
            </div>
            {footer}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default EntryPageLayout;
