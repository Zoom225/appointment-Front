import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
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
});
