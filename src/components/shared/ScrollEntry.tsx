import React, { useState, useRef, useEffect } from 'react';
import { JournalEntry as JournalEntryType } from '@/types';
import JournalEntryView from '@/components/JournalEntry';
import { formatTimeAgo } from '@/utils/timeAgo';

interface ScrollEntryProps {
  entry: JournalEntryType;
  isPreview?: boolean;
  showTimeAgo?: boolean;
}

/**
 * Wraps a JournalEntryView in a full-viewport scroll section.
 * Weather activates only when the entry is scrolled into view (40% threshold),
 * matching the landing page behavior.
 */
const ScrollEntry: React.FC<ScrollEntryProps> = ({ entry, isPreview = false, showTimeAgo = false }) => {
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([e]) => setIsInView(e.isIntersecting),
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      // Targeted by the letter-arrived banner (FutureLetterArrivalBanner) to
      // scroll a clicked notification to its source entry — this is a single
      // continuous scroll feed with every entry already mounted, so a plain
      // element id is all "jump to entry" needs; no route to navigate.
      id={`entry-${entry.id}`}
      className="min-h-screen flex items-center justify-center py-20"
    >
      <div className="w-full max-w-3xl mx-auto px-6 md:px-16">
        {showTimeAgo && (
          <div className="text-center mb-2">
            <span className="text-xs text-muted-foreground/50 tracking-widest uppercase">
              {formatTimeAgo(entry.timestamp)}
            </span>
          </div>
        )}
        <JournalEntryView
          entry={entry}
          isFullView
          isPreview={isPreview}
          initialWeatherEnabled={isInView}
        />
      </div>
    </div>
  );
};

export default ScrollEntry;
