import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, finalize } from 'rxjs';
import { allowedAdminTransitions, appointmentStatusClass, appointmentStatusLabel } from '../../core/appointments/appointment-status';
import { getApiErrorDetails } from '../../core/errors/api-error';
import { AdminStatistics } from '../../core/models/admin.models';
import { Appointment, AppointmentStatus } from '../../core/models/appointment.models';
import { AppNotification } from '../../core/models/notification.models';
import { AppUser } from '../../core/models/user.models';
import { AdminApi } from '../../core/services/admin-api';
import { UsersApi } from '../../core/services/users-api';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StateCard } from '../../shared/components/state-card/state-card';

@Component({ selector: 'app-admin', imports: [PageHeader, RouterLink, StateCard], templateUrl: './admin.html', styleUrl: './admin.css' })
export class Admin implements OnInit {
  private readonly adminApi = inject(AdminApi);
  private readonly usersApi = inject(UsersApi);
  protected readonly statistics = signal<AdminStatistics | null>(null);
  protected readonly appointments = signal<Appointment[]>([]);
  protected readonly users = signal<Map<number, AppUser>>(new Map());
  protected readonly notifications = signal<AppNotification[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly updatingId = signal<number | null>(null);
  protected readonly isRefreshingNotifications = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDashboard();
  }

  protected loadDashboard(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.isLoading.set(true);
    this.errorMessage.set(null);
    forkJoin({ statistics: this.adminApi.getStatistics(), appointments: this.adminApi.getAppointments({ page: 0, size: 50, startFrom: `${today}T00:00:00`, startTo: `${today}T23:59:59` }), users: this.usersApi.findAll({ page: 0, size: 200 }), notifications: this.adminApi.getNotifications(0, 5) })
      .pipe(finalize(() => this.isLoading.set(false))).subscribe({
        next: ({ statistics, appointments, users, notifications }) => { this.statistics.set(statistics); this.appointments.set(appointments.content); this.users.set(new Map(users.content.map((user) => [user.id, user]))); this.notifications.set(notifications.content); },
        error: (error: unknown) => this.errorMessage.set(getApiErrorDetails(error).message),
      });
  }
  protected updateStatus(appointment: Appointment, status: AppointmentStatus): void {
    if (!allowedAdminTransitions(appointment.status).includes(status)) return;
    this.updatingId.set(appointment.id);
    this.adminApi.updateAppointmentStatus(appointment.id, status).pipe(finalize(() => this.updatingId.set(null))).subscribe({ next: () => this.loadDashboard(), error: (error: unknown) => this.errorMessage.set(getApiErrorDetails(error).message) });
  }
  protected refreshNotifications(): void {
    if (this.isRefreshingNotifications()) return;
    this.isRefreshingNotifications.set(true);
    this.adminApi.getNotifications(0, 5).pipe(finalize(() => this.isRefreshingNotifications.set(false))).subscribe({
      next: (response) => this.notifications.set(response.content),
      error: (error: unknown) => this.errorMessage.set(getApiErrorDetails(error).message),
    });
  }
  protected transitions(item: Appointment): AppointmentStatus[] { return allowedAdminTransitions(item.status); }
  protected actionLabel(status: AppointmentStatus): string { return status === 'CONFIRMED' ? 'Confirmer' : status === 'COMPLETED' ? 'Terminer' : 'Annuler'; }
  protected userFor(item: Appointment): AppUser | undefined { return this.users().get(item.userId); }
  protected statusLabel(item: Appointment): string { return appointmentStatusLabel(item.status); }
  protected statusClass(item: Appointment): string { return appointmentStatusClass(item.status); }
  protected formatTime(value: string): string { return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
  protected formatDateTime(value: string): string { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }
}
