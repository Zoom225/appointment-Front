import { describe, expect, it } from 'vitest';
import { TokenStorage } from './token-storage';

describe('TokenStorage', () => {
  it('stores and clears token and user in localStorage', () => {
    localStorage.clear();
    const storage = new TokenStorage();

    storage.setToken('token');
    storage.setUser({ id: 8, email: 'demo@gestion-rendez-vous.com', firstName: 'Demo', lastName: 'Recruiter', roles: ['ROLE_USER'] });

    expect(storage.getToken()).toBe('token');
    expect(storage.getUser()?.id).toBe(8);

    storage.clear();

    expect(storage.getToken()).toBeNull();
    expect(storage.getUser()).toBeNull();
  });
});
