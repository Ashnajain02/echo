import React, { useState } from 'react';
import { MusicTrack } from '@/types';
import { Button } from '@/components/ui/button';
import { Music, X } from 'lucide-react';
import TrackSearch from './TrackSearch';
import TrackClipPlayer from './TrackClipPlayer';
import { trackEvent } from '@/lib/analytics';

interface MusicSectionProps {
  selectedTrack: MusicTrack | null | undefined;
  onTrackSelect: (track: MusicTrack | undefined) => void;
}

const MusicSection: React.FC<MusicSectionProps> = ({ selectedTrack, onTrackSelect }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleTrackSelect = (track: MusicTrack) => {
    // Default clip: 0 to 30 seconds (or full preview if shorter)
    const durationSeconds = track.durationMs ? Math.floor(track.durationMs / 1000) : 30;
    const clipEnd = Math.min(30, durationSeconds);
    onTrackSelect({
      ...track,
      clipStartSeconds: 0,
      clipEndSeconds: clipEnd,
    });
    // Song title/artist are public metadata about the track, not the
    // entry's private content — same distinction the app already makes by
    // storing them as plaintext.
    trackEvent('song_attached', { artist: track.artist, song: track.name });
  };

  const handleRemove = () => {
    onTrackSelect(undefined);
  };

  return (
    <div>
      {selectedTrack ? (
        <div className="space-y-3">
          <TrackClipPlayer
            track={selectedTrack}
            clipStartSeconds={selectedTrack.clipStartSeconds}
            clipEndSeconds={selectedTrack.clipEndSeconds}
          />
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={handleRemove} className="text-muted-foreground text-xs h-7">
              <X className="h-3 w-3 mr-1" />
              Remove song
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsSearchOpen(true)}
          className="w-full border-dashed"
        >
          <Music className="mr-2 h-4 w-4" />
          Add a song
        </Button>
      )}

      <TrackSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onTrackSelect={handleTrackSelect}
      />
    </div>
  );
};

export default MusicSection;
