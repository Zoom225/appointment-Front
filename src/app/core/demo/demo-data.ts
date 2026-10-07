import { HttpErrorResponse } from '@angular/common/http';
import { defer, Observable, of } from 'rxjs';
import { formatLocalDateInput } from '../date-time/local-date-time';
import { PageResponse } from '../models/api.models';
import { Appointment, AppointmentAudit, AppointmentStatus } from '../models/appointment.models';
import { User } from '../models/auth.models';
import { AppNotification } from '../models/notification.models';

export const DEMO_USER: User = {
  id: 9001, firstName: 'Demo', lastName: 'Utilisateur',
  email: 'utilisateur@demo.example', roles: ['ROLE_USER'],
};

export const DEMO_ADMIN: User = {
  id: 9002, firstName: 'Demo', lastName: 'Administrateur',
  email: 'administrateur@demo.example', roles: ['ROLE_ADMIN'],
};

export interface DemoState {
  version: 1;
  generatedAt: string;
  users: User[];
  appointments: Appointment[];
  notifications: AppNotification[];
  audits: AppointmentAudit[];
}

export interface DemoAppointmentQuery {
  page?: number;
  size?: number;
  userId?: number;
  status?: AppointmentStatus;
  startFrom?: string;
  startTo?: string;
  query?: string;
}

export function demoDateTime(date: Date): string {
  return `${formatLocalDateInput(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;
}

export function demoError(status: number, message: string): HttpErrorResponse {
  return new HttpErrorResponse({ status, statusText: 'Local demo', error: { status, message } });
}

/** Deferred local operations follow the same observable/error contract as the API services. */
export function demoOperation<T>(operation: () => T): Observable<T> {
  return defer(() => of(operation()));
}

export function demoPage<T>(items: T[], page = 0, size = 20): PageResponse<T> {
  const safePage = Number.isFinite(page) ? Math.max(0, Math.floor(page)) : 0;
  const safeSize = Number.isFinite(size) ? Math.max(1, Math.floor(size)) : 20;
  const content = items.slice(safePage * safeSize, (safePage + 1) * safeSize);
  const totalPages = Math.ceil(items.length / safeSize);
  return {
    content, totalElements: items.length, totalPages, size: safeSize, number: safePage,
    numberOfElements: content.length, first: safePage === 0,
    last: safePage + 1 >= totalPages, empty: content.length === 0,
  };
}

function businessDate(now: Date, offset: number, hour: number, minute = 0): Date {
  const result = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
  const direction = offset < 0 ? -1 : 1;
  let remaining = Math.abs(offset);
  while (remaining > 0) {
    result.setDate(result.getDate() + direction);
    if (result.getDay() !== 0 && result.getDay() !== 6) remaining--;
  }
  while (result.getDay() === 0 || result.getDay() === 6) result.setDate(result.getDate() + direction);
  return result;
}

export function createDemoState(now = new Date()): DemoState {
  const users: User[] = [
    { ...DEMO_USER, roles: [...DEMO_USER.roles] },
    { ...DEMO_ADMIN, roles: [...DEMO_ADMIN.roles] },
    { id: 9003, firstName: 'Alice', lastName: 'Martin', email: 'alice@demo.example', roles: ['ROLE_USER'] },
    { id: 9004, firstName: 'Karim', lastName: 'Bernard', email: 'karim@demo.example', roles: ['ROLE_USER'] },
    { id: 9005, firstName: 'Léa', lastName: 'Robert', email: 'lea@demo.example', roles: ['ROLE_USER'] },
    { id: 9006, firstName: 'Hugo', lastName: 'Petit', email: 'hugo@demo.example', roles: ['ROLE_USER'] },
  ];
  const createdAt = businessDate(now, -10, 9).toISOString();
  const appointments: Appointment[] = [];
  const add = (userId: number, offset: number, hour: number, status: AppointmentStatus, reason: string) => {
    const person = users.find((user) => user.id === userId)!;
    const start = businessDate(now, offset, hour);
    const end = new Date(start.getTime() + 30 * 60_000);
    const id = 10001 + appointments.length;
    appointments.push({
      id, publicReference: `DEMO-RDV-${String(id).padStart(6, '0')}`,
      userId, contactFirstName: person.firstName, contactLastName: person.lastName, contactEmail: person.email,
      startDateTime: demoDateTime(start), endDateTime: demoDateTime(end), reason, status,
      createdAt, updatedAt: createdAt,
    });
  };
  add(DEMO_USER.id, 1, 10, 'CONFIRMED', 'Découverte du service et accompagnement');
  add(DEMO_USER.id, -3, 14, 'COMPLETED', 'Premier entretien de présentation');
  add(DEMO_USER.id, -6, 11, 'CANCELLED', 'Entretien reporté à une autre date');
  add(9003, 0, 11, 'CONFIRMED', 'Suivi de dossier');
  add(9004, 0, 15, 'CONFIRMED', 'Conseils et préparation du projet');
  add(9005, 2, 11, 'CONFIRMED', 'Présentation de projet');
  add(9006, 3, 16, 'CONFIRMED', 'Rendez-vous de suivi');
  add(9003, -2, 9, 'COMPLETED', 'Bilan du mois');
  add(9004, -5, 16, 'CANCELLED', 'Disponibilité modifiée');
  const audits: AppointmentAudit[] = appointments.flatMap((appointment, index) => {
    const entries: AppointmentAudit[] = [{
      id: index * 2 + 1, appointmentId: appointment.id, action: 'CREATED',
      actorEmail: appointment.contactEmail!, occurredAt: createdAt,
      details: 'Rendez-vous de démonstration créé localement.',
    }];
    if (appointment.status === 'COMPLETED' || appointment.status === 'CANCELLED') {
      entries.push({
        id: index * 2 + 2, appointmentId: appointment.id,
        action: appointment.status === 'CANCELLED' ? 'CANCELLED' : 'STATUS_CHANGED',
        actorEmail: DEMO_ADMIN.email, occurredAt: appointment.endDateTime,
        details: `Statut de démonstration : ${appointment.status}.`,
      });
    }
    return entries;
  });
  const notificationFor = (appointment: Appointment, recipientId: number, id: number): AppNotification => ({
    id, appointmentId: appointment.id, recipientId,
    type: appointment.status === 'CANCELLED' ? 'CANCELLED' : 'CREATED',
    title: appointment.status === 'CANCELLED' ? 'Rendez-vous annulé' : 'Nouveau rendez-vous',
    message: 'Notification de démonstration locale.',
    createdAt: now.toISOString(), readAt: null,
    publicReference: appointment.publicReference, contactFirstName: appointment.contactFirstName,
    contactLastName: appointment.contactLastName, contactEmail: appointment.contactEmail,
    appointmentStartDateTime: appointment.startDateTime, reason: appointment.reason,
  });
  return {
    version: 1, generatedAt: now.toISOString(), users, appointments, audits,
    notifications: [
      notificationFor(appointments[0], DEMO_USER.id, 1),
      notificationFor(appointments[0], DEMO_ADMIN.id, 2),
      notificationFor(appointments[2], DEMO_ADMIN.id, 3),
      notificationFor(appointments[3], DEMO_ADMIN.id, 4),
    ],
  };
}
