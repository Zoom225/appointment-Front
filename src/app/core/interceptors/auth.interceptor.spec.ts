import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { API_BASE_URL } from '../api/api.config';
import { Auth } from '../services/auth';
import { TokenStorage } from '../services/token-storage';
import { HttpClient } from '@angular/common/http';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let storage: TokenStorage;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    storage = TestBed.inject(TokenStorage);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('adds the Bearer token to API requests', () => {
    storage.setToken('header.payload.signature');
    storage.setUser({ id: 8, email: 'demo@gestion-rendez-vous.com', firstName: 'Demo', lastName: 'Recruiter', roles: ['ROLE_USER'] });

    http.get(API_ENDPOINTS.appointments).subscribe();

    const request = httpMock.expectOne(API_ENDPOINTS.appointments);
    expect(request.request.headers.get('Authorization')).toBe('Bearer header.payload.signature');
  });

  it('does not add the Bearer token to external requests', () => {
    storage.setToken('header.payload.signature');
    storage.setUser({ id: 8, email: 'demo@gestion-rendez-vous.com', firstName: 'Demo', lastName: 'Recruiter', roles: ['ROLE_USER'] });

    http.get('https://example.com/test').subscribe();

    const request = httpMock.expectOne('https://example.com/test');
    expect(request.request.url.startsWith(API_BASE_URL)).toBe(false);
    expect(request.request.headers.has('Authorization')).toBe(false);
  });

  it('does not add Authorization when no token exists', () => {
    http.get(API_ENDPOINTS.appointments).subscribe();

    const request = httpMock.expectOne(API_ENDPOINTS.appointments);
    expect(request.request.headers.has('Authorization')).toBe(false);
  });

  it('clears the session and redirects to login after a protected 401', () => {
    storage.setToken('header.payload.signature');
    storage.setUser({ id: 8, email: 'demo@gestion-rendez-vous.com', firstName: 'Demo', lastName: 'Recruiter', roles: ['ROLE_USER'] });
    Object.defineProperty(router, 'url', { configurable: true, value: '/appointments' });

    http.get(API_ENDPOINTS.appointments).subscribe({ error: () => undefined });
    httpMock.expectOne(API_ENDPOINTS.appointments).flush(
      { message: 'Token expiré' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(storage.getToken()).toBeNull();
    expect(storage.getUser()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { sessionExpired: 'true' } });
  });

  it('does not redirect a failed login request', () => {
    Object.defineProperty(router, 'url', { configurable: true, value: '/login' });

    http.post(API_ENDPOINTS.auth.login, {}).subscribe({ error: () => undefined });
    httpMock.expectOne(API_ENDPOINTS.auth.login).flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('keeps the session and redirects to forbidden after a protected 403', () => {
    storage.setToken('header.payload.signature');
    storage.setUser({ id: 8, email: 'demo@gestion-rendez-vous.com', firstName: 'Demo', lastName: 'Recruiter', roles: ['ROLE_USER'] });
    Object.defineProperty(router, 'url', { configurable: true, value: '/admin' });

    http.get(API_ENDPOINTS.admin.statistics).subscribe({ error: () => undefined });
    httpMock.expectOne(API_ENDPOINTS.admin.statistics).flush(
      { message: 'Accès interdit' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(storage.getToken()).toBe('header.payload.signature');
    expect(storage.getUser()?.id).toBe(8);
    expect(router.navigate).toHaveBeenCalledWith(['/forbidden']);
  });
});
