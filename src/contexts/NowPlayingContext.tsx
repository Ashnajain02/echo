import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

interface NowPlayingValue {
  currentId: string | null;
  registerPlayer: (id: string, stopFn: () => void) => () => void;
  notifyPlaying: (id: string) => void;
  notifyStopped: (id: string) => void;
}

const NowPlayingContext = createContext<NowPlayingValue | null>(null);

export const NowPlayingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const players = useRef<Map<string, () => void>>(new Map());
  const [currentId, setCurrentId] = useState<string | null>(null);

  const registerPlayer = useCallback((id: string, stopFn: () => void) => {
    players.current.set(id, stopFn);
    return () => {
      players.current.delete(id);
      setCurrentId(prev => (prev === id ? null : prev));
    };
  }, []);

  const notifyPlaying = useCallback((id: string) => {
    setCurrentId(prev => {
      if (prev && prev !== id) {
        const stop = players.current.get(prev);
        stop?.();
      }
      return id;
    });
  }, []);

  const notifyStopped = useCallback((id: string) => {
    setCurrentId(prev => (prev === id ? null : prev));
  }, []);

  return (
    <NowPlayingContext.Provider value={{ currentId, registerPlayer, notifyPlaying, notifyStopped }}>
      {children}
    </NowPlayingContext.Provider>
  );
};

const NOOP_VALUE: NowPlayingValue = {
  currentId: null,
  registerPlayer: () => () => {},
  notifyPlaying: () => {},
  notifyStopped: () => {},
};

export const useNowPlaying = (): NowPlayingValue => {
  return useContext(NowPlayingContext) ?? NOOP_VALUE;
};
