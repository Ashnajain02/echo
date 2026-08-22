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
