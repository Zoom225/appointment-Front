import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { parseLocalDateTime } from '../date-time/local-date-time';
import { getApiErrorMessage } from '../errors/api-error';
import { authGuard } from '../guards/auth.guard';
import { guestGuard } from '../guards/guest.guard';
import { roleGuard } from '../guards/role.guard';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { Appointment, AppointmentAvailabilitySlot, AppointmentCreateRequest } from '../models/appointment.models';
import { User } from '../models/auth.models';
import { AdminApi } from '../services/admin-api';
import { AppointmentsApi } from '../services/appointments-api';
import { Auth } from '../services/auth';
import { NotificationsApi } from '../services/notifications-api';
import { ProfileApi } from '../services/profile-api';
import { TokenStorage } from '../services/token-storage';
import { UsersApi } from '../services/users-api';
import { DemoModeService } from './demo-mode.service';
import { demoNetworkInterceptor } from './demo-network.interceptor';

const REAL_USER: User = {
  id: 17,
  firstName: 'Alice',
  lastName: 'Martin',
  email: 'alice@example.com',
  roles: ['ROLE_USER'],
};
const REAL_TOKEN = 'real.header.signature';
const FREE_DATE = '2026-10-20';

function reservation(slot: AppointmentAvailabilitySlot): AppointmentCreateRequest {
  return {
    contactFirstName: 'Demo',
    contactLastName: 'Utilisateur',
    contactEmail: 'demo.utilisateur@example.com',
    reason: 'Découverte du portfolio',
    ...slot,
  };
}

describe('Demo integration: local sessions, data and real API isolation', () => {
  let httpMock: HttpTestingController;
  let router: Router;
  const requestsPastAuth = vi.fn();

  function configure(): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([
          demoNetworkInterceptor,
          authInterceptor,
          (request, next) => {
            requestsPastAuth(request);
            return next(request);
          },
        ])),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  }

  function start(role: 'USER' | 'ADMIN' = 'USER'): Auth {
    const auth = TestBed.inject(Auth);
    auth.startDemo(role);
    return auth;
  }

  async function cancelInitialAppointment(): Promise<Appointment> {
    const api = TestBed.inject(AppointmentsApi);
    const upcoming = await firstValueFrom(api.findUpcoming());
    expect(upcoming.content).toHaveLength(1);
    const appointment = upcoming.content[0];
    expect(appointment.status).toBe('CONFIRMED');
    await firstValueFrom(api.cancel(appointment.id));
    return appointment;
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.setSystemTime(new Date(2026, 9, 5, 11, 10));
    requestsPastAuth.mockClear();
    configure();
  });

  afterEach(() => {
    try {
      httpMock.expectNone(() => true);
      httpMock.verify();
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
      localStorage.clear();
      sessionStorage.clear();
    }
  });

  it.each([
    ['USER', 'USER_DEMO', 'Demo Utilisateur', '/dashboard'],
    ['ADMIN', 'ADMIN_DEMO', 'Demo Administrateur', '/admin'],
  ] as const)('activates %s immediately without login HTTP or a JWT', (role, mode, name, destination) => {
    const auth = start(role);

    expect(TestBed.inject(DemoModeService).mode()).toBe(mode);
    expect(auth.isDemo()).toBe(true);
    expect(auth.sessionKind()).toBe('DEMO');
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.displayName()).toBe(name);
    expect(auth.hasAnyRole([role])).toBe(true);
    expect(auth.getAccessToken()).toBeNull();
    expect(auth.token()).toBeNull();
    expect(localStorage.length).toBe(0);
    expect(router.navigateByUrl).toHaveBeenCalledWith(destination);
    expect(requestsPastAuth).not.toHaveBeenCalled();
    httpMock.expectNone(API_ENDPOINTS.auth.login);
  });

  it.each(['USER', 'ADMIN'] as const)('restores a %s session after an Angular reload without HTTP', async (role) => {
    const initial = start(role).user();
    httpMock.verify();
    TestBed.resetTestingModule();
    configure();

    const restored = TestBed.inject(Auth);
    expect(restored.user()).toEqual(initial);
    expect(restored.isAuthenticated()).toBe(true);
    expect(restored.sessionKind()).toBe('DEMO');
    expect(restored.getAccessToken()).toBeNull();
    if (role === 'USER') {
      expect((await firstValueFrom(TestBed.inject(AppointmentsApi).findUpcoming())).content).toHaveLength(1);
    } else {
      expect((await firstValueFrom(TestBed.inject(AdminApi).getStatistics())).totalAppointments).toBeGreaterThan(0);
    }
  });

  it.each([
    '{invalid-json',
    JSON.stringify({ mode: 'USER_DEMO' }),
    JSON.stringify({ version: 1, kind: 'REAL', mode: 'ADMIN_DEMO' }),
    JSON.stringify({ version: 1, kind: 'DEMO', mode: 'OTHER' }),
  ])('rejects malformed or non-demo stored sessions (%s)', (rawSession) => {
    sessionStorage.setItem('rendez_vous_demo_session_v1', rawSession);
    const auth = TestBed.inject(Auth);
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.isDemo()).toBe(false);
    expect(auth.user()).toBeNull();
    expect(TestBed.inject(DemoModeService).mode()).toBe('REAL');
    expect(sessionStorage.getItem('rendez_vous_demo_session_v1')).toBeNull();
  });

  it.each([
    ['USER', '/dashboard'],
    ['ADMIN', '/admin'],
  ] as const)('accepts the %s demo in authentication, role and guest guards', (role, destination) => {
    start(role);
    expect(TestBed.runInInjectionContext(() => authGuard({} as never, {} as never))).toBe(true);
    expect(TestBed.runInInjectionContext(() => roleGuard({ data: { roles: [role] } } as never, {} as never))).toBe(true);
    const redirect = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));
    expect(router.serializeUrl(redirect as UrlTree)).toBe(destination);
  });

  it('rejects the admin route for a USER demo', () => {
    start();
    const redirect = TestBed.runInInjectionContext(() =>
      roleGuard({ data: { roles: ['ADMIN'] } } as never, {} as never),
    );
    expect(router.serializeUrl(redirect as UrlTree)).toBe('/forbidden');
  });

  it('loads the user dashboard, lists and profile entirely locally', async () => {
    const auth = start();
    const api = TestBed.inject(AppointmentsApi);
    const [upcoming, history, all, profile] = await Promise.all([
      firstValueFrom(api.findUpcoming()),
      firstValueFrom(api.findHistory()),
      firstValueFrom(api.findAll()),
      firstValueFrom(TestBed.inject(ProfileApi).getProfileById(auth.user()!.id)),
    ]);

    expect(profile).toEqual(auth.user());
    expect(upcoming.content).toHaveLength(1);
    expect(upcoming.content[0].status).toBe('CONFIRMED');
    expect(parseLocalDateTime(upcoming.content[0].startDateTime).getTime()).toBeGreaterThan(Date.now());
    expect(history.content.map((item) => item.status)).toEqual(expect.arrayContaining(['COMPLETED', 'CANCELLED']));
    expect(all.content.every((item) => item.userId === auth.user()!.id)).toBe(true);
    expect(await firstValueFrom(api.findById(upcoming.content[0].id))).toEqual(upcoming.content[0]);
    expect(await firstValueFrom(TestBed.inject(ProfileApi).getProfileByEmail(profile.email))).toEqual(profile);
    expect(requestsPastAuth).not.toHaveBeenCalled();
  });

  it('generates weekday slots of 30 minutes between 09:00 and 18:00', async () => {
    start();
    const slots = await firstValueFrom(TestBed.inject(AppointmentsApi).getAvailability(FREE_DATE));
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      const from = parseLocalDateTime(slot.startDateTime);
      const to = parseLocalDateTime(slot.endDateTime);
      expect(from.getDay()).toBeGreaterThanOrEqual(1);
      expect(from.getDay()).toBeLessThanOrEqual(5);
      expect(from.getHours()).toBeGreaterThanOrEqual(9);
      expect(to.getHours() * 60 + to.getMinutes()).toBeLessThanOrEqual(18 * 60);
      expect(to.getTime() - from.getTime()).toBe(30 * 60 * 1000);
      expect([0, 30]).toContain(from.getMinutes());
    }
  });

  it.each(['2026-10-03', '2026-10-10', '2026-10-11', '2026-10-02'])('offers no local slots on past dates or weekends (%s)', async (date) => {
    start();
    expect(await firstValueFrom(TestBed.inject(AppointmentsApi).getAvailability(date))).toEqual([]);
  });

  it('offers only future local slots for today', async () => {
    start();
    const slots = await firstValueFrom(TestBed.inject(AppointmentsApi).getAvailability('2026-10-05'));
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((slot) => parseLocalDateTime(slot.startDateTime).getTime() > Date.now())).toBe(true);
  });

  it('hides occupied slots and releases a cancelled user slot', async () => {
    start();
    const api = TestBed.inject(AppointmentsApi);
    const appointment = (await firstValueFrom(api.findUpcoming())).content[0];
    const date = appointment.startDateTime.slice(0, 10);
    const before = await firstValueFrom(api.getAvailability(date));
    expect(before.some((slot) => slot.startDateTime === appointment.startDateTime)).toBe(false);

    const cancelled = await firstValueFrom(api.cancel(appointment.id));
    expect(cancelled.status).toBe('CANCELLED');
    expect((await firstValueFrom(api.findUpcoming())).content).toHaveLength(0);
    expect((await firstValueFrom(api.findHistory())).content).toContainEqual(cancelled);
    const after = await firstValueFrom(api.getAvailability(date));
    expect(after.some((slot) => slot.startDateTime === appointment.startDateTime)).toBe(true);
  });

  it('books locally as CONFIRMED with a DEMO reference and persists it across reloads', async () => {
    const auth = start();
    await cancelInitialAppointment();
    const api = TestBed.inject(AppointmentsApi);
    const slot = (await firstValueFrom(api.getAvailability(FREE_DATE)))[0];
    const created = await firstValueFrom(api.create(reservation(slot)));

    expect(created.status).toBe('CONFIRMED');
    expect(created.publicReference).toMatch(/^DEMO-RDV-[A-Z0-9]+$/);
    expect(created.userId).toBe(auth.user()!.id);
    expect(created.startDateTime).toBe(slot.startDateTime);
    expect((await firstValueFrom(api.findUpcoming())).content).toContainEqual(created);
    expect((await firstValueFrom(api.getAvailability(FREE_DATE))).some((available) => available.startDateTime === slot.startDateTime)).toBe(false);
    expect(localStorage.length).toBe(0);
    expect(requestsPastAuth).not.toHaveBeenCalled();

    httpMock.verify();
    TestBed.resetTestingModule();
    configure();
    expect(await firstValueFrom(TestBed.inject(AppointmentsApi).findById(created.id))).toEqual(created);
  });

  it('refuses a second future active appointment using a local business error', async () => {
    start();
    const api = TestBed.inject(AppointmentsApi);
    const slot = (await firstValueFrom(api.getAvailability(FREE_DATE)))[0];
    const error = await firstValueFrom(api.create(reservation(slot))).catch((value: unknown) => value);

    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(409);
    expect(getApiErrorMessage(error)).toMatch(/rendez-vous/i);
    expect((await firstValueFrom(api.findUpcoming())).content).toHaveLength(1);
  });

  it('returns a local 409 with a useful message when a user requests another user occupied slot', async () => {
    const auth = start('ADMIN');
    const data = await firstValueFrom(TestBed.inject(AdminApi).getAppointments({ size: 100 }));
    auth.startDemo('USER');
    const occupied = data.content.find((item) => item.userId !== auth.user()!.id && item.status === 'CONFIRMED' && parseLocalDateTime(item.startDateTime).getTime() > Date.now());
    expect(occupied).toBeDefined();
    await cancelInitialAppointment();

    const error = await firstValueFrom(TestBed.inject(AppointmentsApi).create(reservation(occupied!))).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(409);
    expect(getApiErrorMessage(error)).toMatch(/créneau/i);
  });

  it('loads admin statistics, appointments, notifications and fictional users without HTTP', async () => {
    start('ADMIN');
    const admin = TestBed.inject(AdminApi);
    const users = TestBed.inject(UsersApi);
    const [statistics, appointments, notifications, people] = await Promise.all([
      firstValueFrom(admin.getStatistics()),
      firstValueFrom(admin.getAppointments({ size: 100 })),
      firstValueFrom(admin.getNotifications()),
      firstValueFrom(users.findAll({ size: 100 })),
    ]);

    expect(appointments.totalElements).toBeGreaterThan(3);
    expect(people.totalElements).toBeGreaterThan(1);
    expect(notifications.content.length).toBeGreaterThan(0);
    expect(statistics.totalAppointments).toBe(appointments.totalElements);
    expect(statistics.totalUsers).toBe(people.totalElements);
    expect(statistics.confirmedAppointments).toBe(appointments.content.filter((item) => item.status === 'CONFIRMED').length);
    expect(statistics.completedAppointments).toBe(appointments.content.filter((item) => item.status === 'COMPLETED').length);
    expect(statistics.cancelledAppointments).toBe(appointments.content.filter((item) => item.status === 'CANCELLED').length);
    expect(await firstValueFrom(users.findById(people.content[0].id))).toEqual(people.content[0]);
    expect(requestsPastAuth).not.toHaveBeenCalled();
  });

  it.each(['CANCELLED', 'COMPLETED'] as const)('applies the admin transition CONFIRMED -> %s and recalculates statistics', async (status) => {
    start('ADMIN');
    const admin = TestBed.inject(AdminApi);
    const before = await firstValueFrom(admin.getStatistics());
    const appointment = (await firstValueFrom(admin.getAppointments({ status: 'CONFIRMED' }))).content[0];
    const updated = await firstValueFrom(admin.updateAppointmentStatus(appointment.id, status));
    expect(updated.status).toBe(status);
    const after = await firstValueFrom(admin.getStatistics());
    expect(after.totalAppointments).toBe(before.totalAppointments);
    expect(after.confirmedAppointments).toBe(before.confirmedAppointments - 1);
    const counter = status === 'CANCELLED' ? 'cancelledAppointments' : 'completedAppointments';
    expect(after[counter]).toBe(before[counter] + 1);
    const audit = await firstValueFrom(admin.getAppointmentHistory(appointment.id));
    expect(audit.length).toBeGreaterThan(0);
    expect(audit.every((entry) => entry.appointmentId === appointment.id)).toBe(true);
  });

  it('marks local admin notifications as read and filters unread notifications', async () => {
    start('ADMIN');
    const api = TestBed.inject(NotificationsApi);
    const unread = await firstValueFrom(api.findAll({ unreadOnly: true }));
    expect(unread.content.length).toBeGreaterThan(0);
    const read = await firstValueFrom(api.markAsRead(unread.content[0].id));
    expect(read.readAt).not.toBeNull();
    expect((await firstValueFrom(api.findAll({ unreadOnly: true }))).content.some((item) => item.id === read.id)).toBe(false);
  });

  it('resetDemo restores initial records while keeping the demo role and real storage intact', async () => {
    const storage = TestBed.inject(TokenStorage);
    storage.setToken(REAL_TOKEN);
    storage.setUser(REAL_USER);
    sessionStorage.setItem('unrelated-session-data', 'keep');
    localStorage.setItem('unrelated-local-data', 'keep');
    const auth = start();
    const api = TestBed.inject(AppointmentsApi);
    const initial = await firstValueFrom(api.findAll());
    await cancelInitialAppointment();

    TestBed.inject(DemoModeService).resetDemo();

    expect(await firstValueFrom(api.findAll())).toEqual(initial);
    expect(auth.displayName()).toBe('Demo Utilisateur');
    expect(auth.isDemo()).toBe(true);
    expect(storage.getToken()).toBe(REAL_TOKEN);
    expect(storage.getUser()).toEqual(REAL_USER);
    expect(sessionStorage.getItem('unrelated-session-data')).toBe('keep');
    expect(localStorage.getItem('unrelated-local-data')).toBe('keep');
  });

  it('demo logout clears only demo session data and redirects to the landing', () => {
    const storage = TestBed.inject(TokenStorage);
    storage.setToken(REAL_TOKEN);
    storage.setUser(REAL_USER);
    sessionStorage.setItem('unrelated-session-data', 'keep');
    const auth = start();

    auth.logout();

    expect(TestBed.inject(DemoModeService).mode()).toBe('REAL');
    expect(auth.isDemo()).toBe(false);
    expect(auth.sessionKind()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.user()).toBeNull();
    expect(auth.getAccessToken()).toBeNull();
    expect(storage.getToken()).toBe(REAL_TOKEN);
    expect(storage.getUser()).toEqual(REAL_USER);
    expect(sessionStorage.getItem('unrelated-session-data')).toBe('keep');
    expect(sessionStorage.length).toBe(1);
    expect(router.navigateByUrl).toHaveBeenLastCalledWith('/');
  });

  it('switches demo roles locally without authenticating with the backend', () => {
    const auth = start();
    auth.startDemo('ADMIN');
    expect(auth.displayName()).toBe('Demo Administrateur');
    expect(auth.hasAnyRole(['ADMIN'])).toBe(true);
    expect(auth.hasAnyRole(['USER'])).toBe(false);
    auth.startDemo('USER');
    expect(auth.displayName()).toBe('Demo Utilisateur');
    expect(auth.hasAnyRole(['ADMIN'])).toBe(false);
    expect(requestsPastAuth).not.toHaveBeenCalled();
  });

  it('blocks accidental backend HTTP in demo before authentication and transport', async () => {
    const storage = TestBed.inject(TokenStorage);
    storage.setToken(REAL_TOKEN);
    storage.setUser(REAL_USER);
    const auth = start();
    const tokenLookup = vi.spyOn(auth, 'getAccessToken');
    const error = await firstValueFrom(TestBed.inject(HttpClient).get(API_ENDPOINTS.admin.statistics)).catch((value: unknown) => value);

    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect(requestsPastAuth).not.toHaveBeenCalled();
    expect(tokenLookup).not.toHaveBeenCalled();
    expect(storage.getToken()).toBe(REAL_TOKEN);
  });

  it('blocks relative API URLs in demo without adding an Authorization header', async () => {
    start();
    const error = await firstValueFrom(TestBed.inject(HttpClient).post('/api/appointments', {})).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect(requestsPastAuth).not.toHaveBeenCalled();
  });

  it('does not issue a backend QR verification request in demo', async () => {
    start();
    await firstValueFrom(TestBed.inject(AppointmentsApi).verifyPublicAppointment('example-public-token')).catch(() => undefined);
    expect(requestsPastAuth).not.toHaveBeenCalled();
  });

  it('exits demo explicitly before a real login and stores the real JWT response', async () => {
    const auth = start();
    const credentials = { email: REAL_USER.email, password: 'real-password' };
    const response = { ...REAL_USER, token: REAL_TOKEN, message: 'Connecté' };
    const result = firstValueFrom(auth.login(credentials));
    const request = httpMock.expectOne(API_ENDPOINTS.auth.login);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(credentials);
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(auth.isDemo()).toBe(false);
    request.flush(response);
    expect(await result).toEqual(response);
    expect(auth.sessionKind()).toBe('REAL');
    expect(auth.user()).toEqual(REAL_USER);
    expect(auth.getAccessToken()).toBe(REAL_TOKEN);
    expect(TestBed.inject(TokenStorage).getToken()).toBe(REAL_TOKEN);
  });

  it('does not retain a demo identity when real login fails', async () => {
    const auth = start('ADMIN');
    const result = firstValueFrom(auth.login({ email: REAL_USER.email, password: 'invalid' })).catch((value: unknown) => value);
    httpMock.expectOne(API_ENDPOINTS.auth.login).flush({ message: 'Identifiants invalides' }, { status: 401, statusText: 'Unauthorized' });
    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(auth.isDemo()).toBe(false);
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.user()).toBeNull();
    expect(auth.sessionKind()).toBeNull();
  });

  it('keeps real availability and booking on the API with the real Bearer token', async () => {
    const storage = TestBed.inject(TokenStorage);
    storage.setToken(REAL_TOKEN);
    storage.setUser(REAL_USER);
    const api = TestBed.inject(AppointmentsApi);
    const slot = { startDateTime: `${FREE_DATE}T09:00:00`, endDateTime: `${FREE_DATE}T09:30:00` };
    const availability = firstValueFrom(api.getAvailability(FREE_DATE));
    const availabilityRequest = httpMock.expectOne(`${API_ENDPOINTS.appointments}/availability?date=${FREE_DATE}`);
    expect(availabilityRequest.request.method).toBe('GET');
    expect(availabilityRequest.request.headers.get('Authorization')).toBe(`Bearer ${REAL_TOKEN}`);
    availabilityRequest.flush([slot]);
    expect(await availability).toEqual([slot]);

    const payload = reservation(slot);
    const creation = firstValueFrom(api.create(payload));
    const createRequest = httpMock.expectOne(API_ENDPOINTS.appointments);
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual(payload);
    expect(createRequest.request.headers.get('Authorization')).toBe(`Bearer ${REAL_TOKEN}`);
    createRequest.flush({ id: 42, status: 'CONFIRMED', ...payload });
    expect((await creation).id).toBe(42);
  });

  it('keeps real admin statistics, listing, status updates, notifications, users and profile on the API', () => {
    const storage = TestBed.inject(TokenStorage);
    storage.setToken(REAL_TOKEN);
    storage.setUser({ ...REAL_USER, roles: ['ROLE_ADMIN'] });
    const admin = TestBed.inject(AdminApi);
    admin.getStatistics().subscribe();
    admin.getAppointments({ status: 'CONFIRMED' }).subscribe();
    admin.updateAppointmentStatus(42, 'COMPLETED').subscribe();
    admin.getNotifications().subscribe();
    TestBed.inject(NotificationsApi).findAll().subscribe();
    TestBed.inject(UsersApi).findAll().subscribe();
    TestBed.inject(ProfileApi).getProfileById(17).subscribe();

    const expectedRequests: [string, string][] = [
      [API_ENDPOINTS.admin.statistics, 'GET'],
      [`${API_ENDPOINTS.admin.appointments}?status=CONFIRMED`, 'GET'],
      [`${API_ENDPOINTS.admin.appointments}/42/status`, 'PATCH'],
      [`${API_ENDPOINTS.admin.notifications}?page=0&size=10`, 'GET'],
      [API_ENDPOINTS.notifications, 'GET'],
      [API_ENDPOINTS.admin.users, 'GET'],
      [`${API_ENDPOINTS.users}/17`, 'GET'],
    ];
    for (const [url, method] of expectedRequests) {
      const request = httpMock.expectOne(url);
      expect(request.request.method).toBe(method);
      expect(request.request.headers.get('Authorization')).toBe(`Bearer ${REAL_TOKEN}`);
      request.flush({});
    }
  });
});
