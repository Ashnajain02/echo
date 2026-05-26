import { useState, useRef, useCallback, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  error: string | null;
}

export function useAudioPlayer() {
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isLoading: false,
    position: 0,
    duration: 0,
    error: null,
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const clipEndRef = useRef<number>(30);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canPlayHandlerRef = useRef<(() => void) | null>(null);

  const clearInterval_ = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const detachCanPlay = () => {
    if (audioRef.current && canPlayHandlerRef.current) {
      audioRef.current.removeEventListener('canplay', canPlayHandlerRef.current);
      canPlayHandlerRef.current = null;
    }
  };

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    clearInterval_();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const playClip = useCallback((previewUrl: string, startSeconds: number, endSeconds: number) => {
    if (!previewUrl) {
      logger.error('useAudioPlayer', 'playClip called with empty previewUrl');
      setState(prev => ({ ...prev, isLoading: false, error: 'No preview available for this song.' }));
      return;
    }
    if (!previewUrl.startsWith('http')) {
      logger.error('useAudioPlayer', 'playClip called with non-http URL (likely legacy spotify: URI):', previewUrl);
      setState(prev => ({ ...prev, isLoading: false, error: 'This song was saved in an older format and can’t be played. Re-attach the song to fix.' }));
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
      audioRef.current.addEventListener('error', () => {
        const mediaError = audioRef.current?.error;
        logger.error('useAudioPlayer', 'audio element error', {
          code: mediaError?.code,
          message: mediaError?.message,
          src: audioRef.current?.src,
        });
        clearInterval_();
        detachCanPlay();
        setState(prev => ({
          ...prev,
          isPlaying: false,
          isLoading: false,
          error: 'Couldn’t load this song’s preview. The clip URL may be expired or blocked.',
        }));
      });
    }
    const audio = audioRef.current;

    detachCanPlay();

    if (audio.src === previewUrl) {
      audio.currentTime = startSeconds;
    } else {
      audio.src = previewUrl;
      audio.currentTime = startSeconds;
    }

    clipEndRef.current = endSeconds;
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const onCanPlay = () => {
      audio.currentTime = startSeconds;
      audio.play().then(() => {
        setState(prev => ({
          ...prev,
          isPlaying: true,
          isLoading: false,
          duration: audio.duration,
          error: null,
        }));

        clearInterval_();
        intervalRef.current = setInterval(() => {
          if (audio.currentTime >= clipEndRef.current) {
            pause();
          } else {
            setState(prev => ({ ...prev, position: audio.currentTime }));
          }
        }, 100);
      }).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        const isAutoplayBlocked = err instanceof DOMException && err.name === 'NotAllowedError';
        logger.error('useAudioPlayer', 'audio.play() rejected', { message, src: audio.src });
        setState(prev => ({
          ...prev,
          isPlaying: false,
          isLoading: false,
          error: isAutoplayBlocked
            ? 'Your browser blocked playback. Tap the play button again.'
            : 'Couldn’t start the song. ' + message,
        }));
      });
      detachCanPlay();
    };

    canPlayHandlerRef.current = onCanPlay;
    audio.addEventListener('canplay', onCanPlay);
    audio.load();
  }, [pause]);

  const clearError = useCallback(() => {
    setState(prev => (prev.error ? { ...prev, error: null } : prev));
  }, []);

  useEffect(() => {
    return () => {
      clearInterval_();
      detachCanPlay();
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, []);

  return {
    ...state,
    playClip,
    pause,
    clearError,
  };
}
