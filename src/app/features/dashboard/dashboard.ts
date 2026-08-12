import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { getApiErrorMessage } from '../../core/errors/api-error';
import { AdminStatistics } from '../../core/models/admin.models';
import { Appointment } from '../../core/models/appointment.models';
import { AppNotification } from '../../core/models/notification.models';
import { AdminApi } from '../../core/services/admin-api';
import { AppointmentsApi } from '../../core/services/appointments-api';
import { Auth } from '../../core/services/auth';
import { NotificationsApi } from '../../core/services/notifications-api';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StateCard } from '../../shared/components/state-card/state-card';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, PageHeader, StateCard],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private readonly appointmentsApi = inject(AppointmentsApi);
  private readonly notificationsApi = inject(NotificationsApi);
  private readonly adminApi = inject(AdminApi);
  protected readonly auth = inject(Auth);

  protected readonly appointments = signal<Appointment[]>([]);
  protected readonly notifications = signal<AppNotification[]>([]);
  protected readonly statistics = signal<AdminStatistics | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly activeAppointmentsCount = computed(
    () => this.appointments().filter((appointment) => appointment.status !== 'CANCELLED').length,
  );
  protected readonly unreadNotificationsCount = computed(
    () => this.notifications().filter((notification) => !notification.readAt).length,
  );
  protected readonly nextAppointment = computed(() =>
    this.appointments()
      .filter((appointment) => new Date(appointment.startDateTime).getTime() >= Date.now())
      .sort((left, right) => left.startDateTime.localeCompare(right.startDateTime))[0],
  );
  protected readonly isAdmin = computed(() => this.auth.hasAnyRole(['ADMIN']));

  ngOnInit(): void {
    forkJoin({
      appointments: this.appointmentsApi.findAll({ page: 0, size: 20 }),
      notifications: this.notificationsApi.findAll({ page: 0, size: 10 }),
      statistics: this.isAdmin() ? this.adminApi.getStatistics() : of(null),
    }).subscribe({
      next: ({ appointments, notifications, statistics }) => {
        this.appointments.set(appointments.content);
        this.notifications.set(notifications.content);
        this.statistics.set(statistics);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(getApiErrorMessage(error));
        this.isLoading.set(false);
      },
    });
  }
}
