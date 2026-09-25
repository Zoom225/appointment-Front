import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { API_ENDPOINTS } from '../../core/api/api-endpoints';
import { Admin } from './admin';

describe('Admin dashboard', () => {
  let httpMock: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ imports: [Admin], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] }); httpMock = TestBed.inject(HttpTestingController); });
  it('loads statistics and today appointments', () => {
    const fixture = TestBed.createComponent(Admin); fixture.detectChanges();
    httpMock.expectOne(API_ENDPOINTS.admin.statistics).flush({ totalUsers: 4, activeUsersLast30Days: 3, totalAppointments: 8, todayAppointments: 2, upcomingAppointments: 3, completedAppointments: 2, appointmentsInPeriod: 0, pendingAppointments: 1, confirmedAppointments: 2, cancelledAppointments: 1, activeSince: null, periodFrom: null, periodTo: null });
    httpMock.expectOne((request) => request.url === API_ENDPOINTS.admin.appointments).flush({ content: [], totalElements: 0, totalPages: 0, size: 50, number: 0, numberOfElements: 0, first: true, last: true, empty: true });
    httpMock.expectOne(`${API_ENDPOINTS.admin.users}?page=0&size=200`).flush({ content: [], totalElements: 0, totalPages: 0, size: 200, number: 0, numberOfElements: 0, first: true, last: true, empty: true });
    const notification = { id: 1, appointmentId: 2, recipientId: 1, type: 'STATUS_CHANGED', title: 'Nouveau rendez-vous', message: 'Rendez-vous confirmé', createdAt: '2026-09-23T10:00:00', readAt: null, publicReference: 'APT-NOTIF-2', contactFirstName: 'Alice', contactLastName: 'Martin', contactEmail: 'alice@example.com', appointmentStartDateTime: '2030-01-08T10:00:00', reason: 'Entretien' };
    httpMock.expectOne(`${API_ENDPOINTS.admin.notifications}?page=0&size=5`).flush({ content: [notification], totalElements: 1, totalPages: 1, size: 5, number: 0, numberOfElements: 1, first: true, last: true, empty: false });
    expect((fixture.componentInstance as any).statistics().todayAppointments).toBe(2);
    expect((fixture.componentInstance as any).notifications()).toEqual([notification]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('APT-NOTIF-2');
    expect(fixture.nativeElement.textContent).toContain('Alice Martin');
    expect(fixture.nativeElement.textContent).toContain('alice@example.com');
  });

  it('reloads recent notifications from the backend', () => {
    const fixture = TestBed.createComponent(Admin);
    const component = fixture.componentInstance as any;
    const notification = { id: 2, appointmentId: 3, recipientId: 1, type: 'APPOINTMENT_CREATED', title: 'Nouvelle demande', message: 'Un rendez-vous est en attente', createdAt: '2026-09-24T10:00:00', readAt: null };

    component.refreshNotifications();
    httpMock.expectOne(`${API_ENDPOINTS.admin.notifications}?page=0&size=5`).flush({ content: [notification], totalElements: 1, totalPages: 1, size: 5, number: 0, numberOfElements: 1, first: true, last: true, empty: false });

    expect(component.notifications()).toEqual([notification]);
  });
});
