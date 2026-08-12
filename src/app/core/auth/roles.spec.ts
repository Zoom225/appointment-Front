import { describe, expect, it } from 'vitest';
import { hasAnyRole, normalizeRole } from './roles';

describe('roles helpers', () => {
  it('normalizes supported roles', () => {
    expect(normalizeRole('ADMIN')).toBe('ADMIN');
    expect(normalizeRole('admin')).toBe('ADMIN');
    expect(normalizeRole('ROLE_ADMIN')).toBe('ADMIN');
    expect(normalizeRole('ROLE_USER')).toBe('USER');
  });

  it('returns null for unsupported roles', () => {
    expect(normalizeRole('SUPER_ADMIN')).toBeNull();
    expect(normalizeRole('')).toBeNull();
  });

  it('checks if the user has one of the allowed roles', () => {
    expect(hasAnyRole(['ROLE_ADMIN'], ['ADMIN'])).toBe(true);
    expect(hasAnyRole(['user'], ['ADMIN', 'USER'])).toBe(true);
    expect(hasAnyRole(['USER'], ['ADMIN'])).toBe(false);
  });
});
