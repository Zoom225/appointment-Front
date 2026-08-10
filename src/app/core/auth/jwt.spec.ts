import { describe, expect, it, vi } from 'vitest';
import { isJwtExpired } from './jwt';

function createToken(payload: object): string {
  return ['header', btoa(JSON.stringify(payload)), 'signature'].join('.');
}

describe('jwt helpers', () => {
  it('treats a missing token as expired', () => {
    expect(isJwtExpired(null)).toBe(true);
  });

  it('treats an invalid token as not expired and lets the backend reject it', () => {
    expect(isJwtExpired('invalid-token')).toBe(false);
  });

  it('detects expired tokens', () => {
    vi.setSystemTime(new Date('2026-08-10T10:00:00.000Z'));

    const token = createToken({ exp: Math.floor(new Date('2026-08-10T09:59:59.000Z').getTime() / 1000) });

    expect(isJwtExpired(token)).toBe(true);

    vi.useRealTimers();
  });

  it('detects valid tokens', () => {
    vi.setSystemTime(new Date('2026-08-10T10:00:00.000Z'));

    const token = createToken({ exp: Math.floor(new Date('2026-08-10T10:01:00.000Z').getTime() / 1000) });

    expect(isJwtExpired(token)).toBe(false);

    vi.useRealTimers();
  });
});
