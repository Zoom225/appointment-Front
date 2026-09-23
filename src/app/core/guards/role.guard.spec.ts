import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'createUrlTree').mockReturnValue({ redirected: true } as never);
  });

  it('allows a user with the required role', () => {
    localStorage.setItem('rendez_vous_access_token', 'header.payload.signature');
    localStorage.setItem(
      'rendez_vous_current_user',
      JSON.stringify({ id: 1, email: 'admin@example.com', firstName: 'Admin', lastName: 'User', roles: ['ROLE_ADMIN'] }),
    );

    const result = TestBed.runInInjectionContext(() =>
      roleGuard({ data: { roles: ['ADMIN'] } } as never, {} as never),
    );

    expect(result).toBe(true);
  });

  it('redirects a user without the required role to forbidden', () => {
    localStorage.setItem('rendez_vous_access_token', 'header.payload.signature');
    localStorage.setItem(
      'rendez_vous_current_user',
      JSON.stringify({ id: 8, email: 'user@example.com', firstName: 'Regular', lastName: 'User', roles: ['ROLE_USER'] }),
    );

    const result = TestBed.runInInjectionContext(() =>
      roleGuard({ data: { roles: ['ADMIN'] } } as never, {} as never),
    );

    expect(router.createUrlTree).toHaveBeenCalledWith(['/forbidden']);
    expect(result).toEqual({ redirected: true });
  });
});
