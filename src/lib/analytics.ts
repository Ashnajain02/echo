import posthog from 'posthog-js';

/**
 * Product analytics (PostHog). Deliberately conservative given Echo's core
 * promise — "your entries are encrypted, not even we can read them":
 *
 *   - Session recording is explicitly disabled, full stop. Not left to the
 *     PostHog project's dashboard toggle.
 *   - Autocapture's element_allowlist only considers real interactive
 *     controls (buttons, links, inputs, selects). The rich-text journal
 *     editor and rendered entry content are contenteditable/plain divs, so
 *     they're structurally invisible to autocapture regardless of what's
 *     on screen.
 *   - No PII beyond the Supabase user id is ever sent as an identify trait.
 *
 * No-ops entirely if VITE_POSTHOG_KEY isn't set (e.g. local dev before
 * it's configured) — every export here is safe to call unconditionally.
 */

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://us.i.posthog.com';

let initialized = false;

export function initAnalytics(): void {
  if (initialized || !POSTHOG_KEY) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only', // don't create profiles for anonymous/logged-out visitors
    capture_pageview: true,
    capture_pageleave: true, // required for accurate time-on-page
    disable_session_recording: true, // see file header — non-negotiable for this app
    autocapture: {
      element_allowlist: ['a', 'button', 'input', 'select', 'textarea', 'label'],
    },
  });

  initialized = true;
}

/** Ties subsequent events to the Supabase user id. Call on sign-in. */
export function identifyUser(userId: string): void {
  if (!initialized) return;
  posthog.identify(userId);
}

/** Clears the identified user. Call on sign-out. */
export function resetAnalyticsIdentity(): void {
  if (!initialized) return;
  posthog.reset();
}

/** Fires a custom product event. See src/lib/analyticsEvents.ts for the catalog. */
export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  if (!initialized) return;
  posthog.capture(name, properties);
}

/**
 * Forwards an application error to PostHog as a queryable event — the one
 * sink `logger.error` calls (see src/lib/logger.ts). Before this, every
 * `logger.error` call went to `console.error` and nowhere else: not
 * recoverable from production, not visible to anyone unless a user had
 * their devtools open and filed a bug report with a screenshot. PostHog was
 * chosen over standing up something like Sentry because it's already
 * installed and already identifying users (see identifyUser below) — this
 * is the zero-new-infra first step, not a replacement for a real error
 * monitor if/when one gets set up.
 *
 * Throttled per (scope + message): a broken retry loop turning into a
 * PostHog event-quota incident would be a worse outcome than the silence
 * this replaces.
 */
const ERROR_REPORT_THROTTLE_MS = 10_000;
const recentErrorReports = new Map<string, number>();

export function reportError(scope: string, message: string, error?: unknown): void {
  if (!initialized) return;

  const key = `${scope}:${message}`;
  const now = Date.now();
  const last = recentErrorReports.get(key);
  if (last !== undefined && now - last < ERROR_REPORT_THROTTLE_MS) return;
  recentErrorReports.set(key, now);

  const errorMessage = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message: unknown }).message === 'string'
      ? (error as { message: string }).message
      : undefined;
  // Supabase (PostgREST/Auth/Storage) errors carry a `code` — useful for
  // grouping ('23505' unique violation, '429' rate limited, etc.); plain
  // network failures (TypeError: Failed to fetch) won't have one.
  const errorCode = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : undefined;

  posthog.capture('app_error', {
    scope,
    message,
    error_message: errorMessage,
    error_name: error instanceof Error ? error.name : undefined,
    error_code: errorCode,
    path: typeof window !== 'undefined' ? window.location.pathname : undefined,
  });
}
