import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppointmentCreateRequest } from '../models/appointment.models';
import { DemoAppointmentService } from './demo-appointment.service';
import { DEMO_ADMIN, DEMO_USER, createDemoState } from './demo-data';
import { DemoDataService } from './demo-data.service';
import { DemoModeService } from './demo-mode.service';
import { DEMO_DATA_STORAGE_KEY, DemoStorageService } from './demo-storage.service';

describe('Local demo data', () => {
  let storage: DemoStorageService;
  let appointments: DemoAppointmentService;
  let data: DemoDataService;
  let role: 'USER' | 'ADMIN' | null;
  const now = new Date(2026, 9, 5, 10, 15);
  const booking: AppointmentCreateRequest = {
    contactFirstName: 'Demo', contactLastName: 'Utilisateur', contactEmail: DEMO_USER.email,
    startDateTime: '2026-10-08T09:00:00', endDateTime: '2026-10-08T09:30:00', reason: 'Entretien de découverte',
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
    sessionStorage.removeItem(DEMO_DATA_STORAGE_KEY);
    role = 'USER';
    TestBed.configureTestingModule({
      providers: [{
        provide: DemoModeService,
        useValue: {
          isDemo: () => role !== null,
          mode: () => role === null ? 'REAL' : role === 'USER' ? 'USER_DEMO' : 'ADMIN_DEMO',
          user: () => role === null ? null : role === 'USER' ? DEMO_USER : DEMO_ADMIN,
        },
      }],
    });
    storage = TestBed.inject(DemoStorageService);
    appointments = TestBed.inject(DemoAppointmentService);
    data = TestBed.inject(DemoDataService);
  });

  afterEach(() => {
    sessionStorage.removeItem(DEMO_DATA_STORAGE_KEY);
    sessionStorage.removeItem('real-session-example');
    localStorage.removeItem('real-storage-example');
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  async function cancelSeed(): Promise<void> {
    const upcoming = await firstValueFrom(appointments.findUpcoming());
    await firstValueFrom(appointments.cancel(upcoming.content[0].id));
  }

  it('seeds the user with exactly one future confirmed appointment and completed/cancelled history', async () => {
    const upcoming = await firstValueFrom(appointments.findUpcoming());
    const history = await firstValueFrom(appointments.findHistory());
    expect(upcoming.content).toHaveLength(1);
    expect(upcoming.content[0].status).toBe('CONFIRMED');
    expect(new Date(upcoming.content[0].startDateTime).getTime()).toBeGreaterThan(now.getTime());
    expect(history.content.map((item) => item.status).sort()).toEqual(['CANCELLED', 'COMPLETED']);
  });

  it('generates relative business dates even when initialized on a weekend without overlapping active bookings', () => {
    const seed = createDemoState(new Date(2026, 9, 10, 19));
    const active = seed.appointments.filter((item) => item.status === 'CONFIRMED');
    expect(new Set(active.map((item) => item.startDateTime)).size).toBe(active.length);
    expect(seed.appointments.every((item) => ![0, 6].includes(new Date(item.startDateTime).getDay()))).toBe(true);
    expect(active.find((item) => item.userId === DEMO_USER.id)?.startDateTime).toBe('2026-10-12T10:00:00');
  });

  it('persists data across storage service instances in sessionStorage only', () => {
    const state = storage.read();
    state.appointments[0].reason = 'Motif local conservé';
    storage.write(state);
    expect(new DemoStorageService().read().appointments[0].reason).toBe('Motif local conservé');
    expect(sessionStorage.getItem(DEMO_DATA_STORAGE_KEY)).toContain('Motif local conservé');
    expect(localStorage.getItem(DEMO_DATA_STORAGE_KEY)).toBeNull();
  });

  it('returns copies so a caller cannot mutate stored data without write', () => {
    storage.read().appointments[0].reason = 'Non enregistré';
    expect(storage.read().appointments[0].reason).not.toBe('Non enregistré');
  });

  it.each(['{broken', '{}', '{"version":2}', '{"version":1,"appointments":[]}'])('repairs malformed or unsupported storage: %s', (raw) => {
    sessionStorage.setItem(DEMO_DATA_STORAGE_KEY, raw);
    expect(storage.read()).toEqual(createDemoState(now));
  });

  it('repairs corrupt appointment status, references, dates and user associations', () => {
    for (const change of [
      { status: 'UNKNOWN' }, { startDateTime: 'not-a-date' }, { userId: 123 }, { publicReference: 'REAL-REFERENCE' },
    ]) {
      const seed = createDemoState(now);
      Object.assign(seed.appointments[0], change);
      sessionStorage.setItem(DEMO_DATA_STORAGE_KEY, JSON.stringify(seed));
      expect(storage.read()).toEqual(createDemoState(now));
    }
  });

  it('continues locally when sessionStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Denied'); });
    const state = storage.read();
    state.appointments[0].reason = 'Conservé en mémoire';
    storage.write(state);
    expect(storage.read().appointments[0].reason).toBe('Conservé en mémoire');
  });

  it('keeps new data in memory if storage becomes full after initialization', () => {
    const state = storage.read();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
    state.appointments[0].reason = 'Modification après quota';
    storage.write(state);
    expect(storage.read().appointments[0].reason).toBe('Modification après quota');
  });

  it('generates eighteen half-hour slots between 09:00 and 18:00 on a free weekday', async () => {
    const slots = await firstValueFrom(appointments.getAvailability('2026-10-09'));
    expect(slots).toHaveLength(18);
    expect(slots[0]).toEqual({ startDateTime: '2026-10-09T09:00:00', endDateTime: '2026-10-09T09:30:00' });
    expect(slots.at(-1)?.endDateTime).toBe('2026-10-09T18:00:00');
  });

  it('only returns future available slots today', async () => {
    const slots = await firstValueFrom(appointments.getAvailability('2026-10-05'));
    expect(slots[0].startDateTime).toBe('2026-10-05T10:30:00');
    expect(slots.every((slot) => new Date(slot.startDateTime).getTime() > now.getTime())).toBe(true);
    expect(slots.some((slot) => slot.startDateTime === '2026-10-05T11:00:00')).toBe(false);
  });

  it.each(['2026-10-03', '2026-10-04', '2026-10-10', '2026-10-11'])('has no availability for a past date or weekend: %s', async (date) => {
    expect(await firstValueFrom(appointments.getAvailability(date))).toEqual([]);
  });

  it.each(['not-a-date', '2026-02-31', '2026-13-04'])('rejects an invalid availability date: %s', async (date) => {
    await expect(firstValueFrom(appointments.getAvailability(date))).rejects.toMatchObject({ status: 400 });
  });

  it('hides a booked slot and frees it when cancelled', async () => {
    let slots = await firstValueFrom(appointments.getAvailability('2026-10-06'));
    expect(slots.some((slot) => slot.startDateTime === '2026-10-06T10:00:00')).toBe(false);
    await cancelSeed();
    slots = await firstValueFrom(appointments.getAvailability('2026-10-06'));
    expect(slots.some((slot) => slot.startDateTime === '2026-10-06T10:00:00')).toBe(true);
  });

  it('creates a confirmed local booking with a unique DEMO reference and updates availability', async () => {
    await cancelSeed();
    const first = await firstValueFrom(appointments.create(booking));
    expect(first.status).toBe('CONFIRMED');
    expect(first.publicReference).toMatch(/^DEMO-RDV-\d{6}$/);
    expect(first.userId).toBe(DEMO_USER.id);
    expect(storage.read().appointments).toContainEqual(first);
    const slots = await firstValueFrom(appointments.getAvailability('2026-10-08'));
    expect(slots.some((slot) => slot.startDateTime === booking.startDateTime)).toBe(false);
    await firstValueFrom(appointments.cancel(first.id));
    const second = await firstValueFrom(appointments.create(booking));
    expect(second.publicReference).not.toBe(first.publicReference);
  });

  it('enforces one active future appointment using the existing 409 UX contract', async () => {
    await expect(firstValueFrom(appointments.create(booking))).rejects.toMatchObject({
      status: 409, error: { message: expect.stringContaining('Un rendez-vous actif existe déjà') },
    });
    expect(storage.read().appointments).toHaveLength(9);
  });

  it('returns a local 409 when a stale selection targets an occupied slot', async () => {
    await cancelSeed();
    await expect(firstValueFrom(appointments.create({
      ...booking, startDateTime: '2026-10-07T11:00:00', endDateTime: '2026-10-07T11:30:00',
    }))).rejects.toMatchObject({ status: 409, error: { message: expect.stringContaining('créneau') } });
  });

  it('past active statuses do not block a new booking', async () => {
    await cancelSeed();
    const state = storage.read();
    state.appointments.find((item) => item.userId === DEMO_USER.id && item.status === 'COMPLETED')!.status = 'CONFIRMED';
    storage.write(state);
    expect((await firstValueFrom(appointments.create(booking))).status).toBe('CONFIRMED');
  });

  it.each([
    ['2026-10-05T09:00:00', '2026-10-05T09:30:00'],
    ['2026-10-10T09:00:00', '2026-10-10T09:30:00'],
    ['2026-10-08T08:30:00', '2026-10-08T09:00:00'],
    ['2026-10-08T18:00:00', '2026-10-08T18:30:00'],
    ['2026-10-08T09:15:00', '2026-10-08T09:45:00'],
    ['2026-10-08T09:00:00', '2026-10-08T10:00:00'],
    ['2026-10-08T09:00:12', '2026-10-08T09:30:12'],
    ['2026-02-31T09:00:00', '2026-02-31T09:30:00'],
  ])('rejects invalid booking schedule %s – %s', async (startDateTime, endDateTime) => {
    await expect(firstValueFrom(appointments.create({ ...booking, startDateTime, endDateTime }))).rejects.toMatchObject({ status: 400 });
  });

  it('validates contact details and reason locally', async () => {
    await expect(firstValueFrom(appointments.create({ ...booking, contactEmail: 'broken' }))).rejects.toMatchObject({ status: 400 });
    await expect(firstValueFrom(appointments.create({ ...booking, reason: 'x' }))).rejects.toMatchObject({ status: 400 });
  });

  it('updates the owner appointment and releases the previous slot without creating a second appointment', async () => {
    const existing = (await firstValueFrom(appointments.findUpcoming())).content[0];
    const updated = await firstValueFrom(appointments.update(existing.id, booking));
    expect(updated.startDateTime).toBe(booking.startDateTime);
    expect((await firstValueFrom(appointments.findUpcoming())).content).toHaveLength(1);
    expect((await firstValueFrom(appointments.getAvailability('2026-10-06'))).some((slot) => slot.startDateTime === existing.startDateTime)).toBe(true);
  });

  it('rejects an update into another occupied slot without altering the appointment', async () => {
    const existing = (await firstValueFrom(appointments.findUpcoming())).content[0];
    await expect(firstValueFrom(appointments.update(existing.id, {
      ...booking, startDateTime: '2026-10-07T11:00', endDateTime: '2026-10-07T11:30',
    }))).rejects.toMatchObject({ status: 409 });
    expect(await firstValueFrom(appointments.findById(existing.id))).toEqual(existing);
  });

  it('prevents a user from reading or modifying another user booking', async () => {
    const other = storage.read().appointments.find((item) => item.userId === 9005)!;
    await expect(firstValueFrom(appointments.findById(other.id))).rejects.toMatchObject({ status: 403 });
    await expect(firstValueFrom(appointments.cancel(other.id))).rejects.toMatchObject({ status: 403 });
    await expect(firstValueFrom(appointments.update(other.id, booking))).rejects.toMatchObject({ status: 403 });
  });

  it('rejects user cancellation of completed and past appointments', async () => {
    const historic = (await firstValueFrom(appointments.findHistory())).content[0];
    await expect(firstValueFrom(appointments.cancel(historic.id))).rejects.toMatchObject({ status: 409 });
  });

  it('moves cancelled appointments from upcoming to history and creates local notifications', async () => {
    await cancelSeed();
    expect((await firstValueFrom(appointments.findUpcoming())).totalElements).toBe(0);
    expect((await firstValueFrom(appointments.findHistory())).totalElements).toBe(3);
    const notifications = await firstValueFrom(data.findNotifications({ type: 'CANCELLED' }));
    expect(notifications.totalElements).toBe(1);
    expect(notifications.content[0].message).toContain('aucun email réel');
  });

  it('protects admin endpoints and requires an explicitly active demo session', async () => {
    await expect(firstValueFrom(data.getStatistics())).rejects.toMatchObject({ status: 403 });
    await expect(firstValueFrom(data.findUsers())).rejects.toMatchObject({ status: 403 });
    await expect(firstValueFrom(appointments.updateStatus(10001, 'COMPLETED'))).rejects.toMatchObject({ status: 403 });
    role = null;
    await expect(firstValueFrom(appointments.findUpcoming())).rejects.toMatchObject({ status: 401 });
    await expect(firstValueFrom(appointments.create(booking))).rejects.toMatchObject({ status: 401 });
    await expect(firstValueFrom(data.findNotifications())).rejects.toMatchObject({ status: 401 });
  });

  it('lets admin complete and cancel confirmed appointments with persisted audit history', async () => {
    role = 'ADMIN';
    const completed = await firstValueFrom(data.updateAppointmentStatus(10001, 'COMPLETED'));
    const cancelled = await firstValueFrom(data.updateAppointmentStatus(10004, 'CANCELLED'));
    expect(completed.status).toBe('COMPLETED');
    expect(cancelled.status).toBe('CANCELLED');
    const history = await firstValueFrom(data.getAppointmentHistory(completed.id));
    expect(history[0]).toMatchObject({ action: 'STATUS_CHANGED', actorEmail: DEMO_ADMIN.email });
    await expect(firstValueFrom(data.updateAppointmentStatus(completed.id, 'CONFIRMED'))).rejects.toMatchObject({ status: 409 });
  });

  it('calculates statistics from current data and a selected period', async () => {
    role = 'ADMIN';
    const before = await firstValueFrom(data.getStatistics('2026-10-05', '2026-10-05'));
    expect(before).toMatchObject({ totalUsers: 6, totalAppointments: 9, confirmedAppointments: 5, completedAppointments: 2, cancelledAppointments: 2, pendingAppointments: 0, todayAppointments: 2, appointmentsInPeriod: 2 });
    await firstValueFrom(data.updateAppointmentStatus(10001, 'COMPLETED'));
    const after = await firstValueFrom(data.getStatistics());
    expect(after.completedAppointments).toBe(before.completedAppointments + 1);
    expect(after.confirmedAppointments).toBe(before.confirmedAppointments - 1);
    expect(after.upcomingAppointments).toBe(before.upcomingAppointments - 1);
  });

  it('supports admin filters, full-day date bounds and pagination', async () => {
    role = 'ADMIN';
    const all = await firstValueFrom(data.getAppointments({ size: 2, page: 1 }));
    expect(all).toMatchObject({ number: 1, size: 2, totalElements: 9, totalPages: 5, numberOfElements: 2 });
    expect((await firstValueFrom(data.getAppointments({ status: 'CANCELLED' }))).totalElements).toBe(2);
    expect((await firstValueFrom(data.getAppointments({ userId: DEMO_USER.id }))).totalElements).toBe(3);
    expect((await firstValueFrom(data.getAppointments({ query: 'Alice Martin' }))).totalElements).toBe(2);
    expect((await firstValueFrom(data.getAppointments({ startFrom: '2026-10-05', startTo: '2026-10-05' }))).totalElements).toBe(2);
  });

  it('supports fictitious user searches and profile access without exposing other profiles to users', async () => {
    expect(await firstValueFrom(data.getProfileById(DEMO_USER.id))).toEqual(DEMO_USER);
    expect(await firstValueFrom(data.getProfileByEmail(DEMO_USER.email))).toEqual(DEMO_USER);
    await expect(firstValueFrom(data.getProfileById(DEMO_ADMIN.id))).rejects.toMatchObject({ status: 403 });
    role = 'ADMIN';
    expect((await firstValueFrom(data.findUsers({ query: 'Alice', role: 'ROLE_USER' }))).totalElements).toBe(1);
    expect(await firstValueFrom(data.findUserById(9003))).toMatchObject({ firstName: 'Alice' });
    expect(await firstValueFrom(data.getProfileById(DEMO_ADMIN.id))).toEqual(DEMO_ADMIN);
  });

  it('filters notifications by owner and persists read state', async () => {
    const initial = await firstValueFrom(data.findNotifications({ unreadOnly: true }));
    expect(initial.content.every((item) => item.recipientId === DEMO_USER.id)).toBe(true);
    await firstValueFrom(data.markAsRead(initial.content[0].id));
    expect((await firstValueFrom(data.findNotifications({ unreadOnly: true }))).totalElements).toBe(0);
    await expect(firstValueFrom(data.markAsRead(2))).rejects.toMatchObject({ status: 404 });
    role = 'ADMIN';
    expect((await firstValueFrom(data.getAdminNotifications())).content.every((item) => item.recipientId === DEMO_ADMIN.id)).toBe(true);
  });

  it('resetDemo restores data while preserving unrelated real storage', async () => {
    sessionStorage.setItem('real-session-example', 'keep');
    localStorage.setItem('real-storage-example', 'keep');
    await cancelSeed();
    await firstValueFrom(appointments.create(booking));
    storage.resetDemo();
    expect(storage.read()).toEqual(createDemoState(now));
    expect(sessionStorage.getItem('real-session-example')).toBe('keep');
    expect(localStorage.getItem('real-storage-example')).toBe('keep');
  });

  it('clear removes only demo data and discards memory state', async () => {
    sessionStorage.setItem('real-session-example', 'keep');
    await cancelSeed();
    storage.clear();
    expect(sessionStorage.getItem(DEMO_DATA_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem('real-session-example')).toBe('keep');
    expect(storage.read()).toEqual(createDemoState(now));
  });

  it('public QR verification fails explicitly and locally', async () => {
    await expect(firstValueFrom(appointments.verifyPublicAppointment('demo-token'))).rejects.toMatchObject({
      status: 400, error: { message: expect.stringContaining('Mode démo') },
    });
  });
});
