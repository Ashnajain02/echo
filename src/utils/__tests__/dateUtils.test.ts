import { describe, it, expect } from 'vitest';
import { parseDate } from '../dateUtils';

describe('parseDate', () => {
  // Happy path: ISO string with time
  it('parses an ISO string with time component', () => {
    const result = parseDate('2025-11-14T16:22:00.000Z');
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe('2025-11-14T16:22:00.000Z');
  });

  // Happy path: date-only string — parsed as the user's local midnight,
  // which is the correct round-trip behavior for the YYYY-MM-DD strings
  // produced by getLocalDate().
  it('parses a date-only string (YYYY-MM-DD) as local midnight', () => {
    const result = parseDate('2025-11-14');
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(10); // November (0-indexed)
    expect(result.getDate()).toBe(14);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  // Happy path: numeric timestamp
  it('parses a numeric timestamp (milliseconds)', () => {
    const ts = new Date('2025-06-21T22:45:00.000Z').getTime();
    const result = parseDate(ts);
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe('2025-06-21T22:45:00.000Z');
  });

  // Edge case: timestamp of 0 (epoch)
  it('parses timestamp 0 as a Date (current behavior: returns "now")', () => {
    // 0 is falsy, so the function returns new Date() — this is intentional
    // because callers occasionally pass uninitialized "0" timestamps that we
    // want to treat as "no timestamp" rather than 1970.
    const result = parseDate(0);
    expect(result).toBeInstanceOf(Date);
  });

  // Edge case: ISO string with timezone offset
  it('parses ISO string with timezone offset', () => {
    const result = parseDate('2025-11-14T16:22:00.000+05:30');
    expect(result).toBeInstanceOf(Date);
    expect(result.getUTCFullYear()).toBe(2025);
  });

  // Edge case: leap day
  it('parses February 29 on a leap year', () => {
    const result = parseDate('2024-02-29');
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(29);
  });

  // Edge case: end of year
  it('parses December 31', () => {
    const result = parseDate('2025-12-31');
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(11); // December
    expect(result.getDate()).toBe(31);
  });

  // Break case: empty string returns current date
  it('returns current date for empty string', () => {
    const before = Date.now();
    const result = parseDate('');
    const after = Date.now();
    expect(result.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(result.getTime()).toBeLessThanOrEqual(after + 1000);
  });

  // Validates that date-only vs ISO are handled differently
  it('distinguishes date-only from ISO strings', () => {
    const dateOnly = parseDate('2025-11-14');
    const isoFull = parseDate('2025-11-14T12:00:00.000Z');
    // date-only: midnight in LOCAL time
    expect(dateOnly.getHours()).toBe(0);
    // ISO with Z: 12:00 UTC, which is some local hour depending on tz —
    // but it's never midnight unless you're in UTC+12 or UTC-12
    expect(isoFull.getUTCHours()).toBe(12);
  });
});
