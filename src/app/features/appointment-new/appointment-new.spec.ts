import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { API_ENDPOINTS } from '../../core/api/api-endpoints';
import { AppointmentNew } from './appointment-new';

const appointment = {
  id: 10, userId: 8, reason: 'Suivi', status: 'PENDING' as const,
  publicReference: 'APT-2030-ABC123', contactFirstName: 'Alice', contactLastName: 'Martin', contactEmail: 'alice@example.com',
  startDateTime: '2026-10-01T10:00:00', endDateTime: '2026-10-01T10:30:00',
  createdAt: '2026-09-23T10:00:00', updatedAt: '2026-09-23T10:00:00',
};

describe('AppointmentNew', () => {
  let httpMock: HttpTestingController;
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('rendez_vous_access_token', 'header.payload.signature');
    localStorage.setItem('rendez_vous_current_user', JSON.stringify({ id: 8, email: 'user@example.com', firstName: 'User', lastName: 'Demo', roles: ['ROLE_USER'] }));
    TestBed.configureTestingModule({ imports: [AppointmentNew], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('shows the backend appointment only after a successful reservation', () => {
    const component = TestBed.createComponent(AppointmentNew).componentInstance as any;
    component.form.patchValue({ contactFirstName: 'Alice', contactLastName: 'Martin', contactEmail: 'alice@example.com', date: '2026-10-01', reason: 'Suivi' });
    component.chooseSlot({ startDateTime: appointment.startDateTime, endDateTime: appointment.endDateTime });
    component.submit();
    expect(component.confirmation()).toBeNull();
    const request = httpMock.expectOne(API_ENDPOINTS.appointments);
    expect(request.request.body).toEqual({ contactFirstName: 'Alice', contactLastName: 'Martin', contactEmail: 'alice@example.com', reason: 'Suivi', startDateTime: appointment.startDateTime, endDateTime: appointment.endDateTime });
    expect(request.request.body.userId).toBeUndefined();
    request.flush(appointment, { status: 201, statusText: 'Created' });
    expect(component.confirmation()).toEqual(appointment);
  });

  it('handles a 409 active appointment without bypassing the backend rule', () => {
    const component = TestBed.createComponent(AppointmentNew).componentInstance as any;
    component.form.patchValue({ contactFirstName: 'Alice', contactLastName: 'Martin', contactEmail: 'alice@example.com', date: '2026-10-01', reason: 'Suivi' });
    component.chooseSlot({ startDateTime: appointment.startDateTime, endDateTime: appointment.endDateTime });
    component.submit();
    httpMock.expectOne(API_ENDPOINTS.appointments).flush({ message: 'Un rendez-vous actif existe déjà' }, { status: 409, statusText: 'Conflict' });
    httpMock.expectOne(`${API_ENDPOINTS.myAppointments.upcoming}?page=0&size=1`).flush({ content: [appointment], totalElements: 1, totalPages: 1, size: 1, number: 0, numberOfElements: 1, first: true, last: true, empty: false });
    expect(component.conflictMessage()).toBe('Un rendez-vous actif existe déjà');
    expect(component.conflictingAppointment()).toEqual(appointment);
  });

  it('loads available slots from the backend for the selected date', () => {
    const component = TestBed.createComponent(AppointmentNew).componentInstance as any;
    component.form.controls.date.setValue('2026-10-01');
    component.loadSlots();
    const slot = { startDateTime: appointment.startDateTime, endDateTime: appointment.endDateTime };
    httpMock.expectOne((request) => request.url.includes('/availability') && request.params.get('date') === '2026-10-01').flush([slot]);
    expect(component.slots()).toEqual([slot]);
  });

  it('renders contact fields, validates email and displays the public reference and pending status', () => {
    const fixture = TestBed.createComponent(AppointmentNew);
    const component = fixture.componentInstance as any;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#contact-first-name')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#contact-last-name')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#contact-email')).toBeTruthy();
    component.form.controls.contactEmail.setValue('invalide');
    expect(component.form.controls.contactEmail.invalid).toBe(true);
    component.confirmation.set(appointment);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('APT-2030-ABC123');
    expect(fixture.nativeElement.textContent).toContain('En attente');
  });
});
