import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS } from '../../core/api/api-endpoints';
import { AppointmentAvailabilitySlot } from '../../core/models/appointment.models';
import { AppointmentNew } from './appointment-new';

const slot: AppointmentAvailabilitySlot = { startDateTime: '2026-09-28T10:00:00', endDateTime: '2026-09-28T10:30:00' };
const mondaySlot: AppointmentAvailabilitySlot = { startDateTime: '2026-10-05T09:00:00', endDateTime: '2026-10-05T09:30:00' };
const secondMondaySlot: AppointmentAvailabilitySlot = { startDateTime: '2026-10-05T09:30:00', endDateTime: '2026-10-05T10:00:00' };
const confirmedSlot: AppointmentAvailabilitySlot = { startDateTime: '2030-01-08T09:00:00', endDateTime: '2030-01-08T09:30:00' };
const appointment = { id: 10, userId: 8, reason: 'Suivi', status: 'CONFIRMED' as const, publicReference: 'APT-2030-ABC123', contactFirstName: 'Alice', contactLastName: 'Martin', contactEmail: 'alice@example.com', startDateTime: slot.startDateTime, endDateTime: slot.endDateTime, createdAt: '2026-09-23T10:00:00', updatedAt: '2026-09-23T10:00:00' };

describe('AppointmentNew reactive booking flow', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('rendez_vous_access_token', 'header.payload.signature');
    localStorage.setItem('rendez_vous_current_user', JSON.stringify({ id: 8, email: 'user@example.com', firstName: 'User', lastName: 'Demo', roles: ['ROLE_USER'] }));
    TestBed.configureTestingModule({ imports: [AppointmentNew], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it('rejects a past date, renders the local minimum and resets an existing slot', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 28, 12));
    const fixture = TestBed.createComponent(AppointmentNew);
    const component = fixture.componentInstance as any;
    fixture.detectChanges();

    const dateInput = fixture.nativeElement.querySelector('input[type="date"]') as HTMLInputElement;
    expect(component.today).toBe('2026-09-28');
    expect(dateInput.min).toBe('2026-09-28');

    component.form.controls.date.setValue('2026-09-29');
    httpMock.expectOne((request) => request.url.endsWith('/availability') && request.params.get('date') === '2026-09-29').flush([slot]);
    component.selectSlot(slot);
    expect(component.selectedSlot()).toEqual(slot);

    component.form.controls.date.setValue('2026-09-25');
    fixture.detectChanges();

    expect(component.form.controls.date.invalid).toBe(true);
    expect(component.form.controls.date.hasError('pastDate')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Vous ne pouvez pas réserver une date déjà passée.');
    httpMock.expectNone((request) => request.url.endsWith('/availability') && request.params.get('date') === '2026-09-25');
    expect(component.slots()).toEqual([]);
    expect(component.selectedSlot()).toBeNull();
    expect(component.form.controls.startDateTime.value).toBe('');
    expect(component.form.controls.endDateTime.value).toBe('');
    expect(component.slotsLoaded()).toBe(false);
    expect(component.slotsError()).toBeNull();
    expect((fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('allows today and requests availability on a business day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 28, 12));
    const component = createComponent();
    component.form.controls.date.setValue('2026-09-28');
    expect(component.form.controls.date.hasError('pastDate')).toBe(false);
    httpMock.expectOne((request) => request.url.endsWith('/availability') && request.params.get('date') === '2026-09-28').flush([]);
  });

  it('allows a future business day and requests availability', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 28, 12));
    const component = createComponent();
    component.form.controls.date.setValue('2026-09-29');
    expect(component.form.controls.date.hasError('pastDate')).toBe(false);
    httpMock.expectOne((request) => request.url.endsWith('/availability') && request.params.get('date') === '2026-09-29').flush([]);
  });

  it('keeps a future weekend invalid without requesting availability', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 28, 12));
    const component = createComponent();
    component.form.controls.date.setValue('2026-10-03');
    expect(component.form.controls.date.hasError('pastDate')).toBe(false);
    expect(component.form.controls.date.hasError('nonBusinessDay')).toBe(true);
    httpMock.expectNone((request) => request.url.endsWith('/availability'));
    expect(component.slots()).toEqual([]);
  });

  it('rejects Sunday 04/10/2026, resets the slot and never calls availability', () => {
    const fixture = TestBed.createComponent(AppointmentNew);
    const component = fixture.componentInstance as any;
    component.form.patchValue({ startDateTime: slot.startDateTime, endDateTime: slot.endDateTime });
    component.selectedSlot.set(slot);
    component.slots.set([slot]);

    component.form.controls.date.setValue('2026-10-04');
    fixture.detectChanges();

    httpMock.expectNone((request) => request.url.endsWith('/availability'));
    expect(component.form.controls.date.invalid).toBe(true);
    expect(component.form.controls.date.hasError('nonBusinessDay')).toBe(true);
    expect(component.slots()).toEqual([]);
    expect(component.selectedSlot()).toBeNull();
    expect(component.form.controls.startDateTime.value).toBe('');
    expect(component.form.controls.endDateTime.value).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Les rendez-vous sont disponibles uniquement du lundi au vendredi.');
    expect(fixture.nativeElement.textContent).not.toContain('Aucun créneau disponible');
    expect((fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders backend slots as buttons and selects one on Monday 05/10/2026', () => {
    const fixture = TestBed.createComponent(AppointmentNew);
    const component = fixture.componentInstance as any;
    component.form.controls.date.setValue('2026-10-05');
    const request = httpMock.expectOne((item) => item.url.endsWith('/availability'));
    expect(request.request.params.get('date')).toBe('2026-10-05');
    request.flush([mondaySlot, secondMondaySlot]);
    fixture.detectChanges();

    const slotButtons = fixture.nativeElement.querySelectorAll('button.slot-button') as NodeListOf<HTMLButtonElement>;
    expect(slotButtons).toHaveLength(2);
    const slotButton = slotButtons[0];
    expect(slotButton.textContent).toContain('09:00');
    expect(slotButton.textContent).toContain('09:30');
    slotButton.click();
    fixture.detectChanges();

    expect(component.selectedSlot()).toEqual(mondaySlot);
    expect(component.form.controls.startDateTime.value).toBe(mondaySlot.startDateTime);
    expect(component.form.controls.endDateTime.value).toBe(mondaySlot.endDateTime);
    expect(slotButton.getAttribute('aria-pressed')).toBe('true');
    expect(slotButton.classList.contains('selected')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('05/10/2026');
  });

  it('shows the weekday-specific empty state when the backend returns no slot', () => {
    const fixture = TestBed.createComponent(AppointmentNew);
    const component = fixture.componentInstance as any;
    component.form.controls.date.setValue('2026-10-05');
    httpMock.expectOne((item) => item.url.endsWith('/availability')).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aucun créneau disponible pour cette date. Choisissez un autre jour.');
    expect(fixture.nativeElement.querySelectorAll('button.slot-button')).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('Choisir une autre date');
  });

  it('keeps an HTTP availability error distinct from an empty list', () => {
    const fixture = TestBed.createComponent(AppointmentNew);
    const component = fixture.componentInstance as any;
    component.form.controls.date.setValue('2026-10-05');
    httpMock.expectOne((item) => item.url.endsWith('/availability')).flush({ message: 'Service indisponible' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Service indisponible');
    expect(fixture.nativeElement.textContent).not.toContain('Aucun créneau disponible pour cette date');
    expect(component.isLoadingSlots()).toBe(false);
  });

  it('refreshes availability for the same valid date', () => {
    const fixture = TestBed.createComponent(AppointmentNew);
    const component = fixture.componentInstance as any;
    component.form.controls.date.setValue('2026-10-05');
    httpMock.expectOne((item) => item.url.endsWith('/availability')).flush([mondaySlot]);
    fixture.detectChanges();
    const refreshButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find((button: any) => button.textContent.includes('Actualiser les créneaux')) as HTMLButtonElement;
    refreshButton.click();
    httpMock.expectOne((item) => item.url.endsWith('/availability') && item.params.get('date') === '2026-10-05').flush([mondaySlot]);
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

  it('keeps submit disabled until a slot is selected and resets it after a date change', () => {
    const fixture = TestBed.createComponent(AppointmentNew);
    const component = fixture.componentInstance as any;
    fillContactAndReason(component);
    selectDate(component);
    fixture.detectChanges();
    const submitButton = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Veuillez sélectionner un créneau pour continuer.');
    component.selectSlot(slot);
    fixture.detectChanges();
    expect(submitButton.disabled).toBe(false);

    component.form.controls.date.setValue('2026-10-05');
    httpMock.expectOne((item) => item.url.endsWith('/availability')).flush([mondaySlot]);
    fixture.detectChanges();
    expect(component.selectedSlot()).toBeNull();
    expect(component.form.controls.startDateTime.value).toBe('');
    expect(component.form.controls.endDateTime.value).toBe('');
    expect(submitButton.disabled).toBe(true);
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

  it('displays the confirmed appointment returned by POST without a pending state', () => {
    const fixture = TestBed.createComponent(AppointmentNew);
    const component = fixture.componentInstance as any;
    component.form.patchValue({ contactFirstName: 'Test', contactLastName: 'User', contactEmail: 'test@example.com', reason: 'Entretien' });
    component.form.controls.date.setValue('2030-01-08');
    httpMock.expectOne((item) => item.url.endsWith('/availability')).flush([confirmedSlot]);
    component.selectSlot(confirmedSlot);
    fixture.detectChanges();

    const submitButton = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(component.form.valid).toBe(true);
    expect(submitButton.disabled).toBe(false);
    submitButton.click();

    const request = httpMock.expectOne(API_ENDPOINTS.appointments);
    expect(request.request.body).toEqual({
      contactFirstName: 'Test',
      contactLastName: 'User',
      contactEmail: 'test@example.com',
      startDateTime: confirmedSlot.startDateTime,
      endDateTime: confirmedSlot.endDateTime,
      reason: 'Entretien',
    });
    request.flush({ ...appointment, publicReference: 'RDV-TEST', contactFirstName: 'Test', contactLastName: 'User', contactEmail: 'test@example.com', reason: 'Entretien', startDateTime: confirmedSlot.startDateTime, endDateTime: confirmedSlot.endDateTime });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('RDV-TEST');
    expect(fixture.nativeElement.textContent).toContain('09:00 - 09:30');
    expect(fixture.nativeElement.textContent).toContain('Votre rendez-vous est confirmé.');
    expect(fixture.nativeElement.textContent).toContain('Confirmé');
    expect(fixture.nativeElement.textContent).not.toContain('En attente');
    expect(fixture.nativeElement.textContent).toContain("Un email de confirmation contenant votre QR code a été envoyé à l'adresse indiquée.");
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

  it('renders the confirmed backend response and complete confirmation details after success', () => {
    const fixture = TestBed.createComponent(AppointmentNew);
    const component = fixture.componentInstance as any;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('APT-2030-ABC123');
    component.confirmation.set(appointment);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('APT-2030-ABC123');
    expect(fixture.nativeElement.textContent).toContain('Votre rendez-vous est confirmé.');
    expect(fixture.nativeElement.textContent).toContain('Confirmé');
    expect(fixture.nativeElement.textContent).toContain('10:00 - 10:30');
    expect(fixture.nativeElement.textContent).toContain("Un email de confirmation contenant votre QR code a été envoyé à l'adresse indiquée.");
    expect(fixture.nativeElement.textContent).not.toContain('En attente');
  });
});
