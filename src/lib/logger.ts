import { reportError } from './analytics';

/**
 * Lightweight logger.
 *
 * - `debug` / `info` are stripped in production builds (vite replaces
 *   `import.meta.env.DEV` at build time, so the call sites are tree-shaken
 *   away when DEV is false).
 * - `warn` always passes through to the console only.
 * - `error` passes through to the console AND forwards to PostHog (see
 *   reportError in ./analytics) — this is the one place that happens, so a
 *   real error monitor (Sentry/Datadog) can replace or supplement it later
 *   without touching any of the ~40 call sites across the app.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.error('JournalContext', 'updateEntry failed', err);
 *
 * Conventions:
 *   - First arg is a *scope* string (component / hook / module name) that
 *     downstream sinks can use for filtering.
 *   - Remaining args are the message + any structured context. Most call
 *     sites pass (message: string, error), but ErrorBoundary passes
 *     (error, context) with no string message — pickMessage/pickError below
 *     handle either shape so reportError always gets something useful.
 */

type LogArgs = readonly unknown[];

const isDev = import.meta.env.DEV;

function hasMessage(value: unknown): value is { message: string } {
  return typeof value === 'object' && value !== null && typeof (value as { message?: unknown }).message === 'string';
}

function pickMessage(args: LogArgs): string {
  const str = args.find((a): a is string => typeof a === 'string');
  if (str) return str;
  const errLike = args.find((a) => a instanceof Error || hasMessage(a));
  if (errLike instanceof Error) return errLike.message;
  if (hasMessage(errLike)) return errLike.message;
  return 'error';
}

function pickError(args: LogArgs): unknown {
  return args.find((a) => a instanceof Error || hasMessage(a));
}

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
    reportError(scope, pickMessage(args), pickError(args));
  },
};

export const logger = sink;
