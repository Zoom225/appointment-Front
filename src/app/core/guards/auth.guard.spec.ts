import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authGuard } from './auth.guard';
import { Auth } from '../services/auth';

describe('authGuard', () => {
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'createUrlTree').mockReturnValue({ redirected: true } as never);
  });

  it('allows access when authenticated', () => {
    localStorage.setItem('rendez_vous_access_token', 'header.payload.signature');
    localStorage.setItem(
      'rendez_vous_current_user',
      JSON.stringify({ id: 8, email: 'demo@gestion-rendez-vous.com', firstName: 'Demo', lastName: 'Recruiter', roles: ['ROLE_USER'] }),
    );

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(result).toBe(true);
  });

  it('redirects to login when unauthenticated', () => {
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(router.createUrlTree).toHaveBeenCalled();
    expect(result).toEqual({ redirected: true });
  });

  it('clears an expired token and redirects to login', () => {
    const expiredPayload = btoa(JSON.stringify({ exp: 1 }));
    localStorage.setItem('rendez_vous_access_token', `header.${expiredPayload}.signature`);
    localStorage.setItem(
      'rendez_vous_current_user',
      JSON.stringify({ id: 8, email: 'demo@gestion-rendez-vous.com', firstName: 'Demo', lastName: 'Recruiter', roles: ['ROLE_USER'] }),
    );

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(localStorage.getItem('rendez_vous_access_token')).toBeNull();
    expect(localStorage.getItem('rendez_vous_current_user')).toBeNull();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/', sessionExpired: 'true' },
    });
    expect(result).toEqual({ redirected: true });
  });
});
