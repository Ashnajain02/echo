/**
 * Lightweight logger.
 *
 * - `debug` / `info` are stripped in production builds (vite replaces
 *   `import.meta.env.DEV` at build time, so the call sites are tree-shaken
 *   away when DEV is false).
 * - `warn` / `error` always pass through to the console. They're the layer
 *   you wire to Sentry/Datadog later — keep the call sites in user code, swap
 *   the implementation here.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.error('JournalContext', 'updateEntry failed', err);
 *
 * Conventions:
 *   - First arg is a *scope* string (component / hook / module name) that
 *     downstream sinks can use for filtering.
 *   - Remaining args are the message + any structured context.
 */

type LogArgs = readonly unknown[];

const isDev = import.meta.env.DEV;

/** Hook for Sentry/etc. Replace this implementation, not the call sites. */
const sink = {
  debug: (scope: string, ...args: LogArgs) => {
    if (!isDev) return;
    console.debug(`[${scope}]`, ...args);
  },
  info: (scope: string, ...args: LogArgs) => {
    if (!isDev) return;
    console.info(`[${scope}]`, ...args);
  },
  warn: (scope: string, ...args: LogArgs) => {
    console.warn(`[${scope}]`, ...args);
  },
  error: (scope: string, ...args: LogArgs) => {
    console.error(`[${scope}]`, ...args);
    // TODO: forward to Sentry / external sink once configured.
    // Sentry.captureException(err, { tags: { scope } });
  },
};

export const logger = sink;
