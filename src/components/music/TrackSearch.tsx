import React, { useState, useEffect, useRef } from 'react';
import { MusicTrack } from '@/types';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Music, Loader2, AlertCircle } from 'lucide-react';
import { invokeFunctionWithTimeout } from '@/lib/invokeFunction';
import { logger } from '@/lib/logger';

interface TrackSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackSelect: (track: MusicTrack) => void;
}

interface ITunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
  previewUrl: string;
  trackTimeMillis: number;
}

const TrackSearch: React.FC<TrackSearchProps> = ({ isOpen, onClose, onTrackSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ITunesResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // Distinguishes "searched and found nothing" from "the search itself
  // failed" — both used to render as an identical, silent "No results
  // found", which reads as "this song doesn't exist" when the real problem
  // was a network/server error and retrying would help.
  const [searchFailed, setSearchFailed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live search — debounced 400ms
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearchFailed(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    let cancelled = false;

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setSearchFailed(false);
      try {
        const { data, error } = await invokeFunctionWithTimeout<{ results: ITunesResult[] }>('itunes-search', {
          body: { query, limit: 8 },
        });
        if (cancelled) return;
        if (error) throw error;
        setResults(data?.results || []);
      } catch (error) {
        if (cancelled) return;
        logger.error('TrackSearch', 'iTunes search failed:', error);
        setResults([]);
        setSearchFailed(true);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Clear on close
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSearchFailed(false);
    }
  }, [isOpen]);

  const handleSelect = (result: ITunesResult) => {
    const track: MusicTrack = {
      id: String(result.trackId),
      name: result.trackName,
      artist: result.artistName,
      album: result.collectionName,
      albumArt: result.artworkUrl100.replace('100x100', '300x300'),
      uri: result.previewUrl,
      durationMs: result.trackTimeMillis,
    };
    onTrackSelect(track);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Search for a song</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Song name or artist..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="max-h-80 overflow-y-auto mt-1">
          {results.length === 0 && !isSearching && query.length > 1 && (
            searchFailed ? (
              <p className="text-sm text-muted-foreground text-center py-8 flex flex-col items-center gap-2">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                Search failed. Please try again.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No results found</p>
            )
          )}
          {results.map((result) => (
            <button
              key={result.trackId}
              onClick={() => handleSelect(result)}
              className="w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-accent/50 transition-colors text-left"
            >
              {result.artworkUrl100 ? (
                <img
                  src={result.artworkUrl100}
                  alt={result.collectionName}
                  className="h-10 w-10 rounded-sm object-cover"
                />
              ) : (
                <div className="h-10 w-10 bg-muted flex items-center justify-center rounded-sm">
                  <Music className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{result.trackName}</p>
                <p className="text-xs text-muted-foreground truncate">{result.artistName}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrackSearch;
