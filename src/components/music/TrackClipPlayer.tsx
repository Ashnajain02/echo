import React, { useEffect, useId, useMemo } from 'react';
import { toast } from 'sonner';
import { MusicTrack } from '@/types';
import { Play, Pause, Music, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useNowPlaying } from '@/contexts/NowPlayingContext';
import { formatTime } from '@/utils/formatTime';

interface TrackClipPlayerProps {
  track: MusicTrack;
  clipStartSeconds?: number;
  clipEndSeconds?: number;
  className?: string;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

const TrackClipPlayer: React.FC<TrackClipPlayerProps> = ({
  track,
  clipStartSeconds = 0,
  clipEndSeconds = 30,
  className,
  onPlayStateChange,
}) => {
  const { isPlaying, isLoading, position, error, playClip, pause, clearError } = useAudioPlayer();
  const { registerPlayer, notifyPlaying, notifyStopped } = useNowPlaying();
  const playerId = useId();
  const previewUrl = track.uri;

  const isPlayable = Boolean(previewUrl && previewUrl.startsWith('http'));

  useEffect(() => {
    return registerPlayer(playerId, () => {
      pause();
      onPlayStateChange?.(false);
    });
  }, [playerId, registerPlayer, pause, onPlayStateChange]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
      notifyStopped(playerId);
    }
  }, [error, clearError, notifyStopped, playerId]);

  const clipDuration = clipEndSeconds - clipStartSeconds;
  const progress = useMemo(() => {
    if (!isPlaying || position < clipStartSeconds) return 0;
    return Math.min(((position - clipStartSeconds) / clipDuration) * 100, 100);
  }, [isPlaying, position, clipStartSeconds, clipDuration]);

  const handleToggle = () => {
    if (isPlaying) {
      pause();
      notifyStopped(playerId);
      onPlayStateChange?.(false);
    } else {
      notifyPlaying(playerId);
      playClip(previewUrl, clipStartSeconds, clipEndSeconds);
      onPlayStateChange?.(true);
    }
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {track.albumArt ? (
        <img
          src={track.albumArt}
          alt={track.album}
          className="h-12 w-12 rounded-sm object-cover shrink-0"
        />
      ) : (
        <div className="h-12 w-12 bg-muted flex items-center justify-center rounded-sm shrink-0">
          <Music className="h-6 w-6 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isPlayable && (
            <button
              onClick={handleToggle}
              disabled={isLoading}
              className="h-7 w-7 flex items-center justify-center rounded-full bg-foreground/10 hover:bg-foreground/20 transition-colors shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground" />
              ) : isPlaying ? (
                <Pause className="h-3.5 w-3.5 text-foreground" />
              ) : (
                <Play className="h-3.5 w-3.5 text-foreground ml-0.5" />
              )}
            </button>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{track.name}</p>
            <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
          </div>
        </div>

        {isPlaying && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-foreground/40 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {formatTime(clipStartSeconds)} – {formatTime(clipEndSeconds)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackClipPlayer;
