import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { formatLocalDateInput, parseLocalDateTime } from '../date-time/local-date-time';
import { AdminStatistics } from '../models/admin.models';
import { PageResponse } from '../models/api.models';
import { Appointment, AppointmentAudit, AppointmentStatus, isActiveAppointmentStatus } from '../models/appointment.models';
import { User } from '../models/auth.models';
import { AppNotification, NotificationQuery } from '../models/notification.models';
import { AppUser, BackendUser } from '../models/user.models';
import { DemoAppointmentService, filterBoundary } from './demo-appointment.service';
import { DEMO_ADMIN, DemoAppointmentQuery, demoError, demoOperation, demoPage } from './demo-data';
import { DemoModeService } from './demo-mode.service';
import { DemoStorageService } from './demo-storage.service';

@Injectable({ providedIn: 'root' })
export class DemoDataService {
  private readonly mode = inject(DemoModeService);
  private readonly storage = inject(DemoStorageService);
  private readonly appointments = inject(DemoAppointmentService);

  getStatistics(periodFrom?: string, periodTo?: string): Observable<AdminStatistics> {
    return demoOperation(() => {
      this.requireAdmin();
      const state = this.storage.read();
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const from = periodFrom ? filterBoundary(periodFrom, false) : -Infinity;
      const to = periodTo ? filterBoundary(periodTo, true) : Infinity;
      const countStatus = (status: AppointmentStatus) => state.appointments.filter((item) => item.status === status).length;
      return {
        totalUsers: state.users.length,
        activeUsersLast30Days: new Set(state.appointments.filter((item) => new Date(item.updatedAt) >= thirtyDaysAgo).map((item) => item.userId)).size,
        totalAppointments: state.appointments.length,
        todayAppointments: state.appointments.filter((item) => item.startDateTime.startsWith(formatLocalDateInput(now))).length,
        upcomingAppointments: state.appointments.filter((item) => isActiveAppointmentStatus(item.status) && parseLocalDateTime(item.startDateTime) > now).length,
        completedAppointments: countStatus('COMPLETED'),
        appointmentsInPeriod: state.appointments.filter((item) => {
          const timestamp = parseLocalDateTime(item.startDateTime).getTime();
          return timestamp >= from && timestamp <= to;
        }).length,
        pendingAppointments: countStatus('PENDING') + countStatus('SCHEDULED'),
        confirmedAppointments: countStatus('CONFIRMED'),
        cancelledAppointments: countStatus('CANCELLED'),
        activeSince: state.appointments.reduce((earliest, item) => item.createdAt < earliest ? item.createdAt : earliest, state.generatedAt),
        periodFrom: periodFrom ?? null, periodTo: periodTo ?? null,
      };
    });
  }

  getAppointments(params?: DemoAppointmentQuery): Observable<PageResponse<Appointment>> {
    return this.appointments.getAppointments(params);
  }

  updateAppointmentStatus(id: number, status: AppointmentStatus): Observable<Appointment> {
    return this.appointments.updateStatus(id, status);
  }

  getAppointmentHistory(id: number): Observable<AppointmentAudit[]> {
    return demoOperation(() => {
      this.requireAdmin();
      const state = this.storage.read();
      if (!state.appointments.some((item) => item.id === id)) throw demoError(404, 'Ce rendez-vous de démonstration est introuvable.');
      return state.audits.filter((item) => item.appointmentId === id).sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
    });
  }

  getAdminNotifications(page = 0, size = 10): Observable<PageResponse<AppNotification>> {
    return demoOperation(() => {
      this.requireAdmin();
      const notifications = this.storage.read().notifications
        .filter((item) => item.recipientId === DEMO_ADMIN.id).sort(newestNotificationFirst);
      return demoPage(notifications, page, size);
    });
  }

  findNotifications(query?: NotificationQuery): Observable<PageResponse<AppNotification>> {
    return demoOperation(() => {
      const user = this.requireUser();
      const notifications = this.storage.read().notifications.filter((item) =>
        item.recipientId === user.id && (!query?.unreadOnly || item.readAt === null) && (!query?.type || item.type === query.type))
        .sort(newestNotificationFirst);
      return demoPage(notifications, query?.page, query?.size);
    });
  }

  markAsRead(id: number): Observable<AppNotification> {
    return demoOperation(() => {
      const user = this.requireUser();
      const state = this.storage.read();
      const notification = state.notifications.find((item) => item.id === id && item.recipientId === user.id);
      if (!notification) throw demoError(404, 'Cette notification de démonstration est introuvable.');
      notification.readAt ??= new Date().toISOString();
      this.storage.write(state);
      return notification;
    });
  }

  findUsers(params?: { page?: number; size?: number; query?: string; role?: string }): Observable<PageResponse<AppUser>> {
    return demoOperation(() => {
      this.requireAdmin();
      const query = params?.query?.trim().toLocaleLowerCase('fr');
      const users = this.storage.read().users.filter((user) =>
        (!params?.role || user.roles.includes(params.role.startsWith('ROLE_') ? params.role : `ROLE_${params.role}`)) &&
        (!query || `${user.firstName} ${user.lastName} ${user.email}`.toLocaleLowerCase('fr').includes(query)));
      return demoPage(users, params?.page, params?.size);
    });
  }

  findUserById(id: number): Observable<BackendUser> {
    return demoOperation(() => {
      this.requireAdmin();
      const user = this.storage.read().users.find((person) => person.id === id);
      if (!user) throw demoError(404, 'Cet utilisateur de démonstration est introuvable.');
      return user;
    });
  }

  getProfileById(id: number): Observable<User> {
    return demoOperation(() => this.profile((user) => user.id === id));
  }

  getProfileByEmail(email: string): Observable<User> {
    return demoOperation(() => this.profile((user) => user.email.toLowerCase() === email.trim().toLowerCase()));
  }

  private profile(predicate: (user: User) => boolean): User {
    const current = this.requireUser();
    const profile = this.storage.read().users.find(predicate);
    if (!profile) throw demoError(404, 'Ce profil de démonstration est introuvable.');
    if (profile.id !== current.id && this.mode.mode() !== 'ADMIN_DEMO') throw demoError(403, 'Accès interdit à ce profil.');
    return profile;
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
}

function newestNotificationFirst(left: AppNotification, right: AppNotification): number {
  return right.createdAt.localeCompare(left.createdAt) || right.id - left.id;
}
