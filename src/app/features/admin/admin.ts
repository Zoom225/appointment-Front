import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { getApiErrorMessage } from '../../core/errors/api-error';
import { AdminStatistics } from '../../core/models/admin.models';
import { Appointment, AppointmentAudit, AppointmentStatus } from '../../core/models/appointment.models';
import { AppNotification } from '../../core/models/notification.models';
import { AdminApi } from '../../core/services/admin-api';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StateCard } from '../../shared/components/state-card/state-card';

@Component({
  selector: 'app-admin',
  imports: [DatePipe, PageHeader, StateCard],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin implements OnInit {
  private readonly adminApi = inject(AdminApi);

  protected readonly statistics = signal<AdminStatistics | null>(null);
  protected readonly appointments = signal<Appointment[]>([]);
  protected readonly notifications = signal<AppNotification[]>([]);
  protected readonly history = signal<AppointmentAudit[]>([]);
  protected readonly selectedAppointmentId = signal<number | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    forkJoin({
      statistics: this.adminApi.getStatistics(),
      appointments: this.adminApi.getAppointments({ page: 0, size: 20 }),
      notifications: this.adminApi.getNotifications(0, 10),
    }).subscribe({
      next: ({ statistics, appointments, notifications }) => {
        this.statistics.set(statistics);
        this.appointments.set(appointments.content);
        this.notifications.set(notifications.content);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(getApiErrorMessage(error));
        this.isLoading.set(false);
      },
    });
  }

  protected updateStatus(appointment: Appointment, status: AppointmentStatus): void {
    this.adminApi.updateAppointmentStatus(appointment.id, status).subscribe({
      next: (updatedAppointment) => {
        this.appointments.update((items) =>
          items.map((item) => (item.id === updatedAppointment.id ? updatedAppointment : item)),
        );
      },
      error: (error: unknown) => {
        this.errorMessage.set(getApiErrorMessage(error));
      },
    });
  }

  protected loadHistory(appointment: Appointment): void {
    this.selectedAppointmentId.set(appointment.id);
    this.adminApi.getAppointmentHistory(appointment.id).subscribe({
      next: (history) => this.history.set(history),
      error: (error: unknown) => {
        this.errorMessage.set(getApiErrorMessage(error));
      },
    });
  }
}
