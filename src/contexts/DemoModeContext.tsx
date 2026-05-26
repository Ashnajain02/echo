import React, { createContext, useContext } from 'react';

/**
 * Read-only flag that marks a subtree as "demo mode" — used by the landing
 * page sample entries.
 *
 * When true, mutating operations (saving reflections, persisting comments,
 * etc.) skip the database and fall back to in-memory state. The flag is set
 * by the LandingPage and consumed via `useIsDemoMode()`; component props
 * shouldn't carry a `demo` boolean anymore.
 */
const DemoModeContext = createContext<boolean>(false);

export const DemoModeProvider: React.FC<{ value?: boolean; children: React.ReactNode }> = ({
  value = true,
  children,
}) => (
  <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>
);

export function useIsDemoMode(): boolean {
  return useContext(DemoModeContext);
}
