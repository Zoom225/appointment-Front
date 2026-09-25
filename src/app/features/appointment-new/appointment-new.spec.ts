import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { API_ENDPOINTS } from '../../core/api/api-endpoints';
import { AppointmentAvailabilitySlot } from '../../core/models/appointment.models';
import { AppointmentNew } from './appointment-new';

const slot: AppointmentAvailabilitySlot = { startDateTime: '2026-09-28T10:00:00', endDateTime: '2026-09-28T10:30:00' };
const appointment = { id: 10, userId: 8, reason: 'Suivi', status: 'PENDING' as const, publicReference: 'APT-2030-ABC123', contactFirstName: 'Alice', contactLastName: 'Martin', contactEmail: 'alice@example.com', startDateTime: slot.startDateTime, endDateTime: slot.endDateTime, createdAt: '2026-09-23T10:00:00', updatedAt: '2026-09-23T10:00:00' };

describe('AppointmentNew reactive booking flow', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('rendez_vous_access_token', 'header.payload.signature');
    localStorage.setItem('rendez_vous_current_user', JSON.stringify({ id: 8, email: 'user@example.com', firstName: 'User', lastName: 'Demo', roles: ['ROLE_USER'] }));
    TestBed.configureTestingModule({ imports: [AppointmentNew], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    httpMock = TestBed.inject(HttpTestingController);
  });

  function createComponent(): any { return TestBed.createComponent(AppointmentNew).componentInstance; }
  function fillContactAndReason(component: any): void { component.form.patchValue({ contactFirstName: '  Alice ', contactLastName: ' Martin  ', contactEmail: 'ALICE@EXAMPLE.COM', reason: '  Suivi  ' }); }
  function selectDate(component: any, date = '2026-09-28'): void {
    component.form.controls.date.setValue(date);
    httpMock.expectOne((request) => request.url === `${API_ENDPOINTS.appointments}/availability` && request.params.get('date') === date && !request.params.has('userId')).flush([slot]);
  }

  it('starts invalid and validates contact identity and email', () => {
    const component = createComponent();
    expect(component.form.invalid).toBe(true);
    component.form.patchValue({ contactFirstName: 'Alice', contactLastName: 'Martin', contactEmail: 'alice@example.com' });
    expect(component.form.controls.contactFirstName.valid).toBe(true);
    expect(component.form.controls.contactLastName.valid).toBe(true);
    expect(component.form.controls.contactEmail.valid).toBe(true);
    component.form.controls.contactEmail.setValue('invalide');
    expect(component.form.controls.contactEmail.invalid).toBe(true);
  });

  it('loads real availability automatically with the untouched YYYY-MM-DD value', () => {
    const component = createComponent();
    component.form.controls.date.setValue('2026-09-28');
    expect(component.isLoadingSlots()).toBe(true);
    const request = httpMock.expectOne((item) => item.url.endsWith('/availability'));
    expect(request.request.params.get('date')).toBe('2026-09-28');
    request.flush([slot]);
    expect(component.slots()).toEqual([slot]);
    expect(component.isLoadingSlots()).toBe(false);
  });

  it('selects a backend slot and synchronizes both hidden form controls', () => {
    const component = createComponent();
    component.selectSlot(slot);
    expect(component.selectedSlot()).toEqual(slot);
    expect(component.form.controls.startDateTime.value).toBe(slot.startDateTime);
    expect(component.form.controls.endDateTime.value).toBe(slot.endDateTime);
  });

  it('becomes valid and enables submit when every field and a slot are selected', () => {
    const fixture = TestBed.createComponent(AppointmentNew);
    const component = fixture.componentInstance as any;
    fillContactAndReason(component);
    selectDate(component);
    component.selectSlot(slot);
    fixture.detectChanges();
    expect(component.form.valid).toBe(true);
    expect(component.canSubmit()).toBe(true);
    expect((fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Créneau sélectionné');
  });

  it('sends the exact normalized payload without userId, date, status or publicReference', () => {
    const component = createComponent();
    fillContactAndReason(component);
    selectDate(component);
    component.selectSlot(slot);
    component.submit();
    const request = httpMock.expectOne(API_ENDPOINTS.appointments);
    expect(request.request.body).toEqual({ contactFirstName: 'Alice', contactLastName: 'Martin', contactEmail: 'alice@example.com', startDateTime: slot.startDateTime, endDateTime: slot.endDateTime, reason: 'Suivi' });
    request.flush(appointment, { status: 201, statusText: 'Created' });
    expect(component.confirmation()).toEqual(appointment);
  });

  it('blocks duplicate submit while the first POST is pending', () => {
    const component = createComponent();
    fillContactAndReason(component); selectDate(component); component.selectSlot(slot);
    component.submit(); component.submit();
    const requests = httpMock.match(API_ENDPOINTS.appointments);
    expect(requests).toHaveLength(1);
    requests[0].flush(appointment);
  });

  it('does not POST an invalid form', () => {
    const component = createComponent();
    component.submit();
    httpMock.expectNone(API_ENDPOINTS.appointments);
    expect(component.form.controls.contactFirstName.touched).toBe(true);
  });

  it('restores submit after a backend 400 and displays its validation message', () => {
    const component = createComponent();
    fillContactAndReason(component); selectDate(component); component.selectSlot(slot); component.submit();
    httpMock.expectOne(API_ENDPOINTS.appointments).flush({ message: 'Email invalide', validationErrors: { contactEmail: 'Email invalide' } }, { status: 400, statusText: 'Bad Request' });
    expect(component.isSubmitting()).toBe(false);
    expect(component.errorMessage()).toBe('Email invalide');
    expect(component.canSubmit()).toBe(true);
  });

  it('reloads availability when a 409 reports that the slot became occupied', () => {
    const component = createComponent();
    fillContactAndReason(component); selectDate(component); component.selectSlot(slot); component.submit();
    httpMock.expectOne(API_ENDPOINTS.appointments).flush({ message: 'Ce créneau est déjà occupé' }, { status: 409, statusText: 'Conflict' });
    expect(component.errorMessage()).toBe("Ce créneau vient d'être réservé. Choisissez un autre créneau.");
    httpMock.expectOne((request) => request.url.endsWith('/availability') && request.params.get('date') === '2026-09-28').flush([]);
    expect(component.selectedSlot()).toBeNull();
  });

  it('keeps the active-appointment 409 flow and link data', () => {
    const component = createComponent();
    fillContactAndReason(component); selectDate(component); component.selectSlot(slot); component.submit();
    httpMock.expectOne(API_ENDPOINTS.appointments).flush({ message: 'Un rendez-vous actif existe déjà' }, { status: 409, statusText: 'Conflict' });
    httpMock.expectOne(`${API_ENDPOINTS.myAppointments.upcoming}?page=0&size=1`).flush({ content: [appointment], totalElements: 1, totalPages: 1, size: 1, number: 0, numberOfElements: 1, first: true, last: true, empty: false });
    expect(component.conflictingAppointment()).toEqual(appointment);
  });

  it('renders the backend public reference and pending label only after success', () => {
    const fixture = TestBed.createComponent(AppointmentNew);
    const component = fixture.componentInstance as any;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('APT-2030-ABC123');
    component.confirmation.set(appointment);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('APT-2030-ABC123');
    expect(fixture.nativeElement.textContent).toContain('En attente');
    expect(fixture.nativeElement.textContent).toContain("Un email a été envoyé");
  });
});
