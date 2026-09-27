import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { API_ENDPOINTS } from '../../core/api/api-endpoints';
import { Appointment } from '../../core/models/appointment.models';
import { Dashboard } from './dashboard';
import { getNextActiveFutureAppointment } from './dashboard.utils';

function createAppointment(
  id: number,
  status: Appointment['status'],
  startDateTime: string,
): Appointment {
  return {
    id,
    status,
    startDateTime,
    endDateTime: startDateTime,
    reason: `Rendez-vous ${id}`,
    userId: 1,
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
  };
}

describe('getNextActiveFutureAppointment', () => {
  const now = new Date('2026-08-12T10:00:00').getTime();

  it('ignores future cancelled and completed appointments', () => {
    const nextAppointment = getNextActiveFutureAppointment(
      [
        createAppointment(1, 'CANCELLED', '2026-08-12T10:15:00'),
        createAppointment(2, 'COMPLETED', '2026-08-12T10:30:00'),
        createAppointment(3, 'CONFIRMED', '2026-08-12T10:45:00'),
      ],
      now,
    );

    expect(nextAppointment?.id).toBe(3);
  });

  it('allows pending, scheduled and confirmed appointments', () => {
    expect(getNextActiveFutureAppointment([createAppointment(1, 'PENDING', '2026-08-12T10:15:00')], now)?.id).toBe(1);
    expect(getNextActiveFutureAppointment([createAppointment(2, 'SCHEDULED', '2026-08-12T10:15:00')], now)?.id).toBe(2);
    expect(getNextActiveFutureAppointment([createAppointment(3, 'CONFIRMED', '2026-08-12T10:15:00')], now)?.id).toBe(3);
  });

  it('selects the closest active future appointment', () => {
    const nextAppointment = getNextActiveFutureAppointment(
      [
        createAppointment(1, 'CONFIRMED', '2026-08-12T12:00:00'),
        createAppointment(2, 'SCHEDULED', '2026-08-12T10:30:00'),
        createAppointment(3, 'PENDING', '2026-08-12T11:00:00'),
      ],
      now,
    );

    expect(nextAppointment?.id).toBe(2);
  });

  it('returns null when there is no active future appointment', () => {
    const nextAppointment = getNextActiveFutureAppointment(
      [
        createAppointment(1, 'CANCELLED', '2026-08-12T10:15:00'),
        createAppointment(2, 'COMPLETED', '2026-08-12T10:30:00'),
        createAppointment(3, 'CONFIRMED', '2026-08-12T09:30:00'),
      ],
      now,
    );

    expect(nextAppointment).toBeNull();
  });
});

describe('Dashboard confirmed appointment', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Dashboard], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('shows a confirmed next appointment as Confirmé', () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    const confirmed = createAppointment(9, 'CONFIRMED', '2030-01-08T09:00:00');
    httpMock.expectOne(`${API_ENDPOINTS.myAppointments.upcoming}?page=0&size=20`).flush({ content: [confirmed], totalElements: 1, totalPages: 1, size: 20, number: 0, numberOfElements: 1, first: true, last: true, empty: false });
    httpMock.expectOne(`${API_ENDPOINTS.myAppointments.history}?page=0&size=100`).flush({ content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, numberOfElements: 0, first: true, last: true, empty: true });
    httpMock.expectOne(`${API_ENDPOINTS.notifications}?page=0&size=100&unreadOnly=true`).flush({ content: [], totalElements: 0, totalPages: 0, size: 100, number: 0, numberOfElements: 0, first: true, last: true, empty: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Confirmé');
  });
});
