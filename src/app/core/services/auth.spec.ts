import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { Auth } from './auth';
import { SessionFeedback } from './session-feedback';

describe('Auth service', () => {
  let auth: Auth;
  let httpMock: HttpTestingController;
  let router: Router;
  let sessionFeedback: SessionFeedback;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });

    auth = TestBed.inject(Auth);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    sessionFeedback = TestBed.inject(SessionFeedback);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('stores session data on successful login', () => {
    auth.login({ email: 'demo@gestion-rendez-vous.com', password: 'Demo2026!' }).subscribe();

    const request = httpMock.expectOne(API_ENDPOINTS.auth.login);
    expect(request.request.method).toBe('POST');
    request.flush({
      id: 8,
      firstName: 'Demo',
      lastName: 'Recruiter',
      email: 'demo@gestion-rendez-vous.com',
      roles: ['ROLE_USER'],
      token: 'header.payload.signature',
      message: 'Connexion reussie',
    });

    expect(auth.user()?.email).toBe('demo@gestion-rendez-vous.com');
    expect(localStorage.getItem('rendez_vous_access_token')).toBe('header.payload.signature');
    expect(localStorage.getItem('rendez_vous_current_user')).toContain('demo@gestion-rendez-vous.com');
  });

  it('clears session and redirects on logout', async () => {
    localStorage.setItem('rendez_vous_access_token', 'token');
    localStorage.setItem(
      'rendez_vous_current_user',
      JSON.stringify({ id: 8, email: 'demo@gestion-rendez-vous.com', firstName: 'Demo', lastName: 'Recruiter', roles: ['ROLE_USER'] }),
    );

    auth.logout();

    expect(localStorage.getItem('rendez_vous_access_token')).toBeNull();
    expect(localStorage.getItem('rendez_vous_current_user')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: undefined });
  });

  it('sets session expired feedback on logout after 401', () => {
    auth.logout({ sessionExpired: true });
    expect(sessionFeedback.message()).toContain('session');
  });
});
