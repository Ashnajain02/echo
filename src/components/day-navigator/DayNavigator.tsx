import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { useJournal } from '@/contexts/JournalContext';
import { JournalEntry } from '@/types';
import ScrollEntry from '@/components/shared/ScrollEntry';
import SearchFilterBar from './SearchFilterBar';
import { useIsMobile } from '@/hooks/use-mobile';
import FutureLetterArrivalBanner from '@/components/journal/future-letters/FutureLetterArrivalBanner';

const DayNavigator: React.FC = () => {
  const isMobile = useIsMobile();
  const { entries } = useJournal();

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [matchedEntries, setMatchedEntries] = useState<JournalEntry[]>([]);

  // All entries sorted newest first
  const sortedEntries = useMemo(() => {
    return [...entries].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [entries]);

  const displayEntries = isSearchActive ? matchedEntries : sortedEntries;

  const handleMatchedEntries = useCallback((results: JournalEntry[]) => {
    setMatchedEntries(results);
  }, []);

  const handleSearchActiveChange = useCallback((active: boolean) => {
    setIsSearchActive(active);
  }, []);

  const navHeight = isMobile ? 56 : 64;

  return (
    <div className="fixed inset-0 top-0 flex flex-col" style={{ paddingTop: navHeight }}>
      {/* Collapsible search bar */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden shrink-0"
          >
            <SearchFilterBar
              entries={entries}
              onMatchedEntries={handleMatchedEntries}
              isActive={isSearchActive}
              onActiveChange={handleSearchActiveChange}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vertical scroll feed */}
      {displayEntries.length > 0 ? (
        <div className="flex-1 overflow-y-auto">
          {!isSearchActive && <FutureLetterArrivalBanner />}
          {displayEntries.map((entry) => (
            <ScrollEntry key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">
            {isSearchActive ? 'No entries found' : 'No entries yet'}
          </p>
        </div>
      )}

      {/* Search toggle — fixed to the viewport's top-right corner, same size
          as the "+" new-entry button (bottom-right, see Index.tsx) so the
          two read as a matched pair. Sits just under the site nav rather
          than flush at top-6 like "+" is flush at bottom-6, since a nav bar
          (unlike the bottom edge) is actually there to collide with. */}
      <button
        onClick={() => setIsSearchOpen(prev => !prev)}
        className={`fixed z-40 right-6 flex items-center justify-center h-14 w-14 rounded-full transition-all bg-card/90 backdrop-blur-sm border border-border shadow-lg hover:bg-card ${isSearchOpen ? 'bg-card border-foreground/20' : ''}`}
        style={{ top: navHeight + 12 }}
        aria-label={isSearchOpen ? 'Close search' : 'Open search'}
        aria-expanded={isSearchOpen}
      >
        <Search className="h-6 w-6 text-foreground" />
      </button>
    </div>
  );
};

export default DayNavigator;
