import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { API_ENDPOINTS } from '../../core/api/api-endpoints';
import { AdminAppointments } from './admin-appointments';

const pending = { id: 7, userId: 8, reason: 'Suivi', status: 'PENDING' as const, startDateTime: '2026-10-01T10:00:00', endDateTime: '2026-10-01T10:30:00', createdAt: '2026-09-20T10:00:00', updatedAt: '2026-09-20T10:00:00' };
describe('AdminAppointments', () => {
  let httpMock: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ imports: [AdminAppointments], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] }); httpMock = TestBed.inject(HttpTestingController); });
  it('loads admin appointments and applies an allowed status change', () => {
    const fixture = TestBed.createComponent(AdminAppointments); fixture.detectChanges();
    httpMock.expectOne((request) => request.url === API_ENDPOINTS.admin.appointments).flush({ content: [pending], totalElements: 1, totalPages: 1, size: 20, number: 0, numberOfElements: 1, first: true, last: true, empty: false });
    httpMock.expectOne(`${API_ENDPOINTS.admin.users}?page=0&size=200`).flush({ content: [], totalElements: 0, totalPages: 0, size: 200, number: 0, numberOfElements: 0, first: true, last: true, empty: true });
    const component = fixture.componentInstance as any; component.updateStatus(pending, 'CONFIRMED');
    const request = httpMock.expectOne(`${API_ENDPOINTS.admin.appointments}/7/status`); expect(request.request.body).toEqual({ status: 'CONFIRMED' }); request.flush({ ...pending, status: 'CONFIRMED' });
    expect(component.appointments()[0].status).toBe('CONFIRMED');
  });

  it('loads the detailed audit history for an appointment', () => {
    const fixture = TestBed.createComponent(AdminAppointments); fixture.detectChanges();
    httpMock.expectOne((request) => request.url === API_ENDPOINTS.admin.appointments).flush({ content: [pending], totalElements: 1, totalPages: 1, size: 20, number: 0, numberOfElements: 1, first: true, last: true, empty: false });
    httpMock.expectOne(`${API_ENDPOINTS.admin.users}?page=0&size=200`).flush({ content: [], totalElements: 0, totalPages: 0, size: 200, number: 0, numberOfElements: 0, first: true, last: true, empty: true });
    const component = fixture.componentInstance as any; component.loadHistory(pending);
    const audit = { id: 1, appointmentId: 7, action: 'STATUS_CHANGED', actorEmail: 'admin@example.com', occurredAt: '2026-09-23T12:00:00', details: 'PENDING -> CONFIRMED' };
    httpMock.expectOne(`${API_ENDPOINTS.admin.appointments}/7/history`).flush([audit]);
    expect(component.auditEntries()).toEqual([audit]);
  });
});
