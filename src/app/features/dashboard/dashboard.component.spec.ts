import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { API_ENDPOINTS } from '../../core/api/api-endpoints';
import { Dashboard } from './dashboard';

describe('Dashboard user', () => {
  let httpMock: HttpTestingController;
  beforeEach(() => { localStorage.clear(); localStorage.setItem('rendez_vous_access_token','header.payload.signature'); localStorage.setItem('rendez_vous_current_user', JSON.stringify({ id: 8, email: 'user@example.com', firstName: 'Alice', lastName: 'Demo', roles: ['ROLE_USER'] })); TestBed.configureTestingModule({ imports: [Dashboard], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] }); httpMock = TestBed.inject(HttpTestingController); });
  it('loads upcoming, completed and unread summaries', () => {
    const fixture = TestBed.createComponent(Dashboard); fixture.detectChanges();
    httpMock.expectOne(`${API_ENDPOINTS.myAppointments.upcoming}?page=0&size=20`).flush({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0, numberOfElements: 0, first: true, last: true, empty: true });
    httpMock.expectOne(`${API_ENDPOINTS.myAppointments.history}?page=0&size=100`).flush({ content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, numberOfElements: 0, first: true, last: true, empty: true });
    httpMock.expectOne(`${API_ENDPOINTS.notifications}?page=0&size=100&unreadOnly=true`).flush({ content: [], totalElements: 3, totalPages: 1, size: 100, number: 0, numberOfElements: 0, first: true, last: true, empty: true });
    expect((fixture.componentInstance as any).unreadCount()).toBe(3);
  });
});
