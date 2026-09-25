import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppointmentsApi } from './appointments-api';
import { API_ENDPOINTS } from '../api/api-endpoints';

describe('AppointmentsApi', () => {
  let service: AppointmentsApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AppointmentsApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('requests paginated appointments', () => {
    service.findAll({ page: 0, size: 10 }).subscribe();

    const request = httpMock.expectOne(`${API_ENDPOINTS.appointments}?page=0&size=10`);
    expect(request.request.method).toBe('GET');
  });

  it('creates an appointment with the backend DTO', () => {
    service
      .create({
        contactFirstName: 'Alice',
        contactLastName: 'Martin',
        contactEmail: 'alice@example.com',
        reason: 'Consultation',
        startDateTime: '2026-08-13T10:00',
        endDateTime: '2026-08-13T10:30',
      })
      .subscribe();

    const request = httpMock.expectOne(API_ENDPOINTS.appointments);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ contactFirstName: 'Alice', contactLastName: 'Martin', contactEmail: 'alice@example.com', reason: 'Consultation', startDateTime: '2026-08-13T10:00', endDateTime: '2026-08-13T10:30' });
  });

  it('updates an appointment via PUT', () => {
    service
      .update(12, {
        reason: 'Suivi',
        startDateTime: '2026-08-13T11:00',
        endDateTime: '2026-08-13T11:30',
      })
      .subscribe();

    const request = httpMock.expectOne(`${API_ENDPOINTS.appointments}/12`);
    expect(request.request.method).toBe('PUT');
  });

  it('cancels an appointment via PATCH cancel endpoint', () => {
    service.cancel(12).subscribe();

    const request = httpMock.expectOne(`${API_ENDPOINTS.appointments}/12/cancel`);
    expect(request.request.method).toBe('PATCH');
  });

  it('requests the authenticated user upcoming appointments', () => {
    service.findUpcoming(1, 5).subscribe();
    const request = httpMock.expectOne(`${API_ENDPOINTS.myAppointments.upcoming}?page=1&size=5`);
    expect(request.request.method).toBe('GET');
  });

  it('requests the authenticated user appointment history', () => {
    service.findHistory(2, 10).subscribe();
    const request = httpMock.expectOne(`${API_ENDPOINTS.myAppointments.history}?page=2&size=10`);
    expect(request.request.method).toBe('GET');
  });

  it('requests availability with only the selected date', () => {
    service.getAvailability('2030-01-08').subscribe();
    const request = httpMock.expectOne(`${API_ENDPOINTS.appointments}/availability?date=2030-01-08`);
    expect(request.request.params.has('userId')).toBe(false);
  });

  it('verifies a public appointment with the QR token', () => {
    service.verifyPublicAppointment('public-token').subscribe();
    const request = httpMock.expectOne(`${API_ENDPOINTS.publicAppointmentVerification}?token=public-token`);
    expect(request.request.method).toBe('GET');
  });
});
