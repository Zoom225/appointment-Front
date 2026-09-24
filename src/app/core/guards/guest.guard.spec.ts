import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { guestGuard } from './guest.guard';

describe('guestGuard', () => {
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'createUrlTree').mockImplementation((commands) => ({ commands } as never));
  });

  it('keeps login public for an unauthenticated visitor', () => {
    expect(TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never))).toBe(true);
  });

  it('keeps an authenticated user in the user space', () => {
    localStorage.setItem('rendez_vous_access_token', 'header.payload.signature');
    localStorage.setItem('rendez_vous_current_user', JSON.stringify({ id: 2, email: 'user@example.com', firstName: 'User', lastName: 'Demo', roles: ['ROLE_USER'] }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'createUrlTree').mockImplementation((commands) => ({ commands } as never));
    TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
  });

  it('keeps an authenticated admin in the administration space', () => {
    localStorage.setItem('rendez_vous_access_token', 'header.payload.signature');
    localStorage.setItem('rendez_vous_current_user', JSON.stringify({ id: 1, email: 'admin@example.com', firstName: 'Admin', lastName: 'Demo', roles: ['ROLE_ADMIN'] }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'createUrlTree').mockImplementation((commands) => ({ commands } as never));
    TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/admin']);
  });
});
