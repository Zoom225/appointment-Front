import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS } from '../../core/api/api-endpoints';
import { Dashboard } from './dashboard';
import { Auth } from '../../core/services/auth';

describe('Dashboard user', () => {
  let httpMock: HttpTestingController;
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); localStorage.setItem('rendez_vous_access_token','header.payload.signature'); localStorage.setItem('rendez_vous_current_user', JSON.stringify({ id: 8, email: 'user@example.com', firstName: 'Alice', lastName: 'Demo', roles: ['ROLE_USER'] })); TestBed.configureTestingModule({ imports: [Dashboard], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] }); httpMock = TestBed.inject(HttpTestingController); });
  afterEach(() => { httpMock.verify(); sessionStorage.clear(); });
  it('loads upcoming, completed and unread summaries', () => {
    const fixture = TestBed.createComponent(Dashboard); fixture.detectChanges();
    httpMock.expectOne(`${API_ENDPOINTS.myAppointments.upcoming}?page=0&size=20`).flush({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0, numberOfElements: 0, first: true, last: true, empty: true });
    httpMock.expectOne(`${API_ENDPOINTS.myAppointments.history}?page=0&size=100`).flush({ content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, numberOfElements: 0, first: true, last: true, empty: true });
    httpMock.expectOne(`${API_ENDPOINTS.notifications}?page=0&size=100&unreadOnly=true`).flush({ content: [], totalElements: 3, totalPages: 1, size: 100, number: 0, numberOfElements: 0, first: true, last: true, empty: true });
    fixture.detectChanges();
    expect((fixture.componentInstance as any).unreadCount()).toBe(3);
    const bookingLinks = Array.from(fixture.nativeElement.querySelectorAll('a')).filter((link: any) => link.textContent.includes('Prendre un rendez-vous'));
    expect(bookingLinks).toHaveLength(1);
  });

  it('shows the demo identity, next appointment and history without HTTP', () => {
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    TestBed.inject(Auth).startDemo('USER');
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    expect(component.isLoading()).toBe(false);
    expect(component.nextAppointment()?.status).toBe('CONFIRMED');
    expect(component.history().some((appointment: { status: string }) => appointment.status === 'COMPLETED')).toBe(true);
    expect(component.history().some((appointment: { status: string }) => appointment.status === 'CANCELLED')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Bonjour Demo');
    expect(fixture.nativeElement.textContent).toContain('Historique récent');
    expect(fixture.nativeElement.textContent).toContain('Confirmé');
    expect(fixture.nativeElement.textContent).toContain('Terminé');
    expect(fixture.nativeElement.textContent).toContain('Annulé');
    component.cancelNext();
    expect(component.nextAppointment()).toBeNull();
    expect(component.errorMessage()).toBeNull();
    httpMock.expectNone(() => true);
  });
});
