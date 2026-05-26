import React from 'react';
import type { JournalEntry as JournalEntryType } from '@/types';
import JournalEntryCard from './journal/JournalEntryCard';
import JournalEntryFullView from './journal/JournalEntryFullView';

interface JournalEntryProps {
  entry: JournalEntryType;
  className?: string;
  isPreview?: boolean;
  isFullView?: boolean;
  initialWeatherEnabled?: boolean;
}

/**
 * Routing shim. Picks the card vs full-view layout for an entry; both share
 * state via the `useEntryState` hook.
 *
 * Kept as a default export at this path for backwards compatibility with
 * existing callers — internal new code should import the concrete layout
 * (`JournalEntryCard` / `JournalEntryFullView`) directly.
 */
const JournalEntryView: React.FC<JournalEntryProps> = ({
  entry,
  className,
  isPreview = false,
  isFullView = false,
  initialWeatherEnabled,
}) => {
  if (isFullView) {
    return (
      <JournalEntryFullView
        entry={entry}
        className={className}
        isPreview={isPreview}
        initialWeatherEnabled={initialWeatherEnabled}
      />
    );
  }
  return <JournalEntryCard entry={entry} className={className} isPreview={isPreview} />;
};

export default JournalEntryView;
