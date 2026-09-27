import { describe, expect, it } from 'vitest';
import { formatLocalDate, formatLocalDateInput, formatLocalTime, parseLocalDateTime } from './local-date-time';

describe('backend LocalDateTime formatting', () => {
  it('parses the backend value as explicit local calendar fields', () => {
    const value = parseLocalDateTime('2026-10-05T09:00:00');
    expect(value.getFullYear()).toBe(2026);
    expect(value.getMonth()).toBe(9);
    expect(value.getDate()).toBe(5);
    expect(value.getHours()).toBe(9);
    expect(value.getMinutes()).toBe(0);
  });

  it('formats the date and time without a timezone shift', () => {
    expect(formatLocalDate('2026-10-05T09:00:00')).toBe('05/10/2026');
    expect(formatLocalTime('2026-10-05T09:00:00')).toBe('09:00');
  });

  it('formats a calendar date from local fields for date inputs', () => {
    expect(formatLocalDateInput(new Date(2026, 8, 28, 23, 45))).toBe('2026-09-28');
  });
});
