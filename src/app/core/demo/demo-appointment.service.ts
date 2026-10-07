import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { allowedAdminTransitions } from '../appointments/appointment-status';
import { formatLocalDateInput, parseLocalDateTime } from '../date-time/local-date-time';
import { PageResponse } from '../models/api.models';
import {
  Appointment, AppointmentAudit, AppointmentAvailabilitySlot, AppointmentCreateRequest,
  AppointmentStatus, AppointmentUpdateRequest, PublicAppointmentVerification, isActiveAppointmentStatus,
} from '../models/appointment.models';
import { User } from '../models/auth.models';
import { AppNotification } from '../models/notification.models';
import {
  DEMO_ADMIN, DemoAppointmentQuery, DemoState, demoDateTime, demoError, demoOperation, demoPage,
} from './demo-data';
import { DemoModeService } from './demo-mode.service';
import { DemoStorageService } from './demo-storage.service';

@Injectable({ providedIn: 'root' })
export class DemoAppointmentService {
  private readonly mode = inject(DemoModeService);
  private readonly storage = inject(DemoStorageService);

  findAll(params?: Omit<DemoAppointmentQuery, 'userId' | 'query'>): Observable<PageResponse<Appointment>> {
    return demoOperation(() => {
      const user = this.requireUser();
      return this.filteredPage(this.storage.read(), { ...params, userId: user.id });
    });
  }

  findById(id: number): Observable<Appointment> {
    return demoOperation(() => this.findOwned(this.storage.read(), id));
  }

  findUpcoming(page = 0, size = 20): Observable<PageResponse<Appointment>> {
    return demoOperation(() => {
      const user = this.requireUser();
      const now = Date.now();
      const appointments = this.storage.read().appointments
        .filter((item) => item.userId === user.id && isActiveAppointmentStatus(item.status) && parseLocalDateTime(item.startDateTime).getTime() > now)
        .sort(byDate);
      return demoPage(appointments, page, size);
    });
  }

  findHistory(page = 0, size = 20): Observable<PageResponse<Appointment>> {
    return demoOperation(() => {
      const user = this.requireUser();
      const now = Date.now();
      const appointments = this.storage.read().appointments
        .filter((item) => item.userId === user.id && (!isActiveAppointmentStatus(item.status) || parseLocalDateTime(item.startDateTime).getTime() <= now))
        .sort((left, right) => byDate(right, left));
      return demoPage(appointments, page, size);
    });
  }

  getAppointments(params?: DemoAppointmentQuery): Observable<PageResponse<Appointment>> {
    return demoOperation(() => {
      this.requireAdmin();
      return this.filteredPage(this.storage.read(), params);
    });
  }

  getAvailability(date: string): Observable<AppointmentAvailabilitySlot[]> {
    return demoOperation(() => {
      this.requireUser();
      const day = strictDateTime(`${date}T09:00:00`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !day) throw demoError(400, 'La date sélectionnée est invalide.');
      if (date < formatLocalDateInput() || day.getDay() === 0 || day.getDay() === 6) return [];
      const state = this.storage.read();
      const slots: AppointmentAvailabilitySlot[] = [];
      const now = Date.now();
      for (let minutes = 9 * 60; minutes < 18 * 60; minutes += 30) {
        const start = new Date(day);
        start.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
        const end = new Date(start.getTime() + 30 * 60_000);
        if (start.getTime() > now && !this.isOccupied(state, start, end)) {
          slots.push({ startDateTime: demoDateTime(start), endDateTime: demoDateTime(end) });
        }
      }
      return slots;
    });
  }

  create(payload: AppointmentCreateRequest): Observable<Appointment> {
    return demoOperation(() => {
      const user = this.requireUser();
      const state = this.storage.read();
      this.validateContact(payload);
      const { start, end } = this.validateSchedule(payload);
      this.ensureFree(state, start, end);
      this.ensureSingleActive(state, user.id);
      const id = Math.max(10000, ...state.appointments.map((item) => item.id)) + 1;
      const now = new Date().toISOString();
      const appointment: Appointment = {
        id, publicReference: `DEMO-RDV-${String(id).padStart(6, '0')}`, userId: user.id,
        contactFirstName: payload.contactFirstName.trim(), contactLastName: payload.contactLastName.trim(),
        contactEmail: payload.contactEmail.trim().toLowerCase(), reason: payload.reason.trim(),
        startDateTime: demoDateTime(start), endDateTime: demoDateTime(end),
        status: 'CONFIRMED', createdAt: now, updatedAt: now,
      };
      state.appointments.push(appointment);
      this.recordChange(state, appointment, 'CREATED', 'Nouveau rendez-vous');
      this.storage.write(state);
      return appointment;
    });
  }

  update(id: number, payload: AppointmentUpdateRequest): Observable<Appointment> {
    return demoOperation(() => {
      const state = this.storage.read();
      const appointment = this.findOwned(state, id);
      this.ensureEditable(appointment);
      const { start, end } = this.validateSchedule(payload);
      this.ensureFree(state, start, end, id);
      this.ensureSingleActive(state, appointment.userId, id);
      Object.assign(appointment, {
        reason: payload.reason.trim(), startDateTime: demoDateTime(start), endDateTime: demoDateTime(end),
        updatedAt: new Date().toISOString(),
      });
      this.recordChange(state, appointment, 'UPDATED', 'Rendez-vous modifié');
      this.storage.write(state);
      return appointment;
    });
  }

  cancel(id: number): Observable<Appointment> {
    return demoOperation(() => {
      const state = this.storage.read();
      const appointment = this.findOwned(state, id);
      this.ensureEditable(appointment);
      return this.changeStatus(state, appointment, 'CANCELLED');
    });
  }

  updateStatus(id: number, status: AppointmentStatus): Observable<Appointment> {
    return demoOperation(() => {
      this.requireAdmin();
      const state = this.storage.read();
      const appointment = this.findOwned(state, id);
      if (!allowedAdminTransitions(appointment.status).includes(status)) {
        throw demoError(409, 'Cette modification de statut n’est pas autorisée.');
      }
      return this.changeStatus(state, appointment, status);
    });
  }

  verifyPublicAppointment(_token: string): Observable<PublicAppointmentVerification> {
    return demoOperation(() => {
      throw demoError(400, 'Mode démo : la vérification publique par QR code est disponible en production.');
    });
  }

  private requireUser(): User {
    const user = this.mode.user();
    if (!this.mode.isDemo() || !user) throw demoError(401, 'Une session démo est requise.');
    return user;
  }

  private requireAdmin(): void {
    this.requireUser();
    if (this.mode.mode() !== 'ADMIN_DEMO') throw demoError(403, 'Cet espace est réservé à l’administrateur démo.');
  }

  private findOwned(state: DemoState, id: number): Appointment {
    const user = this.requireUser();
    const appointment = state.appointments.find((item) => item.id === id);
    if (!appointment) throw demoError(404, 'Ce rendez-vous de démonstration est introuvable.');
    if (appointment.userId !== user.id && this.mode.mode() !== 'ADMIN_DEMO') throw demoError(403, 'Accès interdit à ce rendez-vous.');
    return appointment;
  }

  private ensureEditable(appointment: Appointment): void {
    if (!isActiveAppointmentStatus(appointment.status) ||
      (this.mode.mode() !== 'ADMIN_DEMO' && parseLocalDateTime(appointment.startDateTime).getTime() <= Date.now())) {
      throw demoError(409, 'Ce rendez-vous ne peut plus être modifié.');
    }
  }

  private ensureSingleActive(state: DemoState, userId: number, excludeId?: number): void {
    if (state.appointments.some((item) => item.id !== excludeId && item.userId === userId &&
      isActiveAppointmentStatus(item.status) && parseLocalDateTime(item.startDateTime).getTime() > Date.now())) {
      throw demoError(409, 'Un rendez-vous actif existe déjà. Annulez-le avant d’effectuer une nouvelle réservation.');
    }
  }

  private validateContact(payload: AppointmentCreateRequest): void {
    if (payload.contactFirstName.trim().length < 2 || payload.contactFirstName.trim().length > 80 ||
      payload.contactLastName.trim().length < 2 || payload.contactLastName.trim().length > 80 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.contactEmail.trim())) {
      throw demoError(400, 'Vérifiez vos nom, prénom et adresse email.');
    }
  }

  private validateSchedule(payload: AppointmentUpdateRequest): { start: Date; end: Date } {
    const start = strictDateTime(payload.startDateTime);
    const end = strictDateTime(payload.endDateTime);
    if (!start || !end || payload.reason.trim().length < 3 || payload.reason.trim().length > 255) {
      throw demoError(400, 'Vérifiez les dates et le motif du rendez-vous.');
    }
    if (start.getTime() <= Date.now()) throw demoError(400, 'La date du rendez-vous doit être dans le futur.');
    if (start.getDay() === 0 || start.getDay() === 6) throw demoError(400, 'Les rendez-vous sont disponibles du lundi au vendredi.');
    if (end.getTime() - start.getTime() !== 30 * 60_000 || start.getMinutes() % 30 !== 0 ||
      start.getHours() < 9 || formatLocalDateInput(start) !== formatLocalDateInput(end) ||
      end.getHours() * 60 + end.getMinutes() > 18 * 60) {
      throw demoError(400, 'Choisissez une plage de 30 minutes entre 09:00 et 18:00.');
    }
    return { start, end };
  }

  private isOccupied(state: DemoState, start: Date, end: Date, excludeId?: number): boolean {
    return state.appointments.some((item) => item.id !== excludeId && isActiveAppointmentStatus(item.status) &&
      parseLocalDateTime(item.startDateTime) < end && parseLocalDateTime(item.endDateTime) > start);
  }

  private ensureFree(state: DemoState, start: Date, end: Date, excludeId?: number): void {
    if (this.isOccupied(state, start, end, excludeId)) throw demoError(409, 'Ce créneau est déjà occupé. Choisissez un autre créneau.');
  }

  private changeStatus(state: DemoState, appointment: Appointment, status: AppointmentStatus): Appointment {
    appointment.status = status;
    appointment.updatedAt = new Date().toISOString();
    this.recordChange(state, appointment, status === 'CANCELLED' ? 'CANCELLED' : 'STATUS_CHANGED',
      status === 'CANCELLED' ? 'Rendez-vous annulé' : status === 'COMPLETED' ? 'Rendez-vous terminé' : 'Rendez-vous confirmé');
    this.storage.write(state);
    return appointment;
  }

  private recordChange(state: DemoState, appointment: Appointment, action: AppointmentAudit['action'], title: string): void {
    const occurredAt = new Date().toISOString();
    state.audits.push({
      id: Math.max(0, ...state.audits.map((item) => item.id)) + 1, appointmentId: appointment.id,
      actorEmail: this.requireUser().email, action, occurredAt,
      details: `${title} localement en mode démo (${appointment.status}).`,
    });
    for (const recipientId of new Set([appointment.userId, DEMO_ADMIN.id])) {
      const notification: AppNotification = {
        id: Math.max(0, ...state.notifications.map((item) => item.id)) + 1,
        appointmentId: appointment.id, recipientId, type: action, title,
        message: 'Action simulée en mode démo : aucun email réel n’a été envoyé.', createdAt: occurredAt, readAt: null,
        publicReference: appointment.publicReference, contactFirstName: appointment.contactFirstName,
        contactLastName: appointment.contactLastName, contactEmail: appointment.contactEmail,
        appointmentStartDateTime: appointment.startDateTime, reason: appointment.reason,
      };
      state.notifications.push(notification);
    }
  }

  private filteredPage(state: DemoState, params: DemoAppointmentQuery = {}): PageResponse<Appointment> {
    const query = params.query?.trim().toLocaleLowerCase('fr');
    const from = params.startFrom ? filterBoundary(params.startFrom, false) : -Infinity;
    const to = params.startTo ? filterBoundary(params.startTo, true) : Infinity;
    const appointments = state.appointments.filter((item) => {
      const timestamp = parseLocalDateTime(item.startDateTime).getTime();
      const user = state.users.find((person) => person.id === item.userId);
      const searchable = [item.publicReference, item.reason, item.contactFirstName, item.contactLastName,
        item.contactEmail, user?.firstName, user?.lastName, user?.email].join(' ').toLocaleLowerCase('fr');
      return (params.userId === undefined || params.userId === item.userId) && (!params.status || params.status === item.status) &&
        timestamp >= from && timestamp <= to && (!query || searchable.includes(query));
    }).sort(byDate);
    return demoPage(appointments, params.page, params.size);
  }
}

function byDate(left: Appointment, right: Appointment): number {
  return left.startDateTime.localeCompare(right.startDateTime);
}

function strictDateTime(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::00)?$/.test(value)) return null;
  const date = parseLocalDateTime(value);
  return Number.isFinite(date.getTime()) && demoDateTime(date).slice(0, 16) === value.slice(0, 16) ? date : null;
}

export function filterBoundary(value: string, end: boolean): number {
  const date = parseLocalDateTime(value.length === 10 ? `${value}T${end ? '23:59:59' : '00:00:00'}` : value);
  if (!Number.isFinite(date.getTime())) throw demoError(400, 'Le filtre de date est invalide.');
  return date.getTime();
}
