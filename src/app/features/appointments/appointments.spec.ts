import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { API_ENDPOINTS } from '../../core/api/api-endpoints';
import { Appointments } from './appointments';

const active = { id: 4, userId: 8, reason: 'Suivi', status: 'CONFIRMED' as const, startDateTime: '2026-10-01T10:00:00', endDateTime: '2026-10-01T10:30:00', createdAt: '2026-09-20T10:00:00', updatedAt: '2026-09-20T10:00:00' };
describe('Appointments', () => {
  let httpMock: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ imports: [Appointments], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] }); httpMock = TestBed.inject(HttpTestingController); });
  it('refreshes appointments after cancellation', () => {
    const fixture = TestBed.createComponent(Appointments); fixture.detectChanges();
    httpMock.expectOne(`${API_ENDPOINTS.myAppointments.upcoming}?page=0&size=20`).flush({ content: [active], totalElements: 1, totalPages: 1, size: 20, number: 0, numberOfElements: 1, first: true, last: true, empty: false });
    const component = fixture.componentInstance as any; component.requestCancellation(active); component.confirmCancellation();
    httpMock.expectOne(`${API_ENDPOINTS.appointments}/4/cancel`).flush({ ...active, status: 'CANCELLED' });
    httpMock.expectOne(`${API_ENDPOINTS.myAppointments.upcoming}?page=0&size=20`).flush({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0, numberOfElements: 0, first: true, last: true, empty: true });
    expect(component.successMessage()).toContain('annulé');
  });

  it('updates an active appointment through the existing API method', () => {
    const fixture = TestBed.createComponent(Appointments); fixture.detectChanges();
    httpMock.expectOne(`${API_ENDPOINTS.myAppointments.upcoming}?page=0&size=20`).flush({ content: [active], totalElements: 1, totalPages: 1, size: 20, number: 0, numberOfElements: 1, first: true, last: true, empty: false });
    const component = fixture.componentInstance as any;
    component.editAppointment(active);
    component.editForm.setValue({ reason: 'Suivi modifié', startDateTime: '2026-10-01T11:00', endDateTime: '2026-10-01T11:30' });
    component.updateAppointment();
    const request = httpMock.expectOne(`${API_ENDPOINTS.appointments}/4`);
    expect(request.request.method).toBe('PUT');
    request.flush({ ...active, reason: 'Suivi modifié', startDateTime: '2026-10-01T11:00:00', endDateTime: '2026-10-01T11:30:00' });
    expect(component.appointments()[0].reason).toBe('Suivi modifié');
  });
});
