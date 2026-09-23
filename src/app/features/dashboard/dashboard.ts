import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, finalize } from 'rxjs';
import { appointmentStatusClass, appointmentStatusLabel } from '../../core/appointments/appointment-status';
import { getApiErrorDetails } from '../../core/errors/api-error';
import { Appointment } from '../../core/models/appointment.models';
import { AppointmentsApi } from '../../core/services/appointments-api';
import { Auth } from '../../core/services/auth';
import { NotificationsApi } from '../../core/services/notifications-api';
import { StateCard } from '../../shared/components/state-card/state-card';
import { getNextActiveFutureAppointment } from './dashboard.utils';

@Component({ selector: 'app-dashboard', imports: [RouterLink, StateCard], templateUrl: './dashboard.html', styleUrl: './dashboard.css' })
export class Dashboard implements OnInit {
  private readonly appointmentsApi = inject(AppointmentsApi);
  private readonly notificationsApi = inject(NotificationsApi);
  protected readonly auth = inject(Auth);
  protected readonly upcoming = signal<Appointment[]>([]);
  protected readonly completedCount = signal(0);
  protected readonly unreadCount = signal(0);
  protected readonly isLoading = signal(true);
  protected readonly isCancelling = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly nextAppointment = computed(() => getNextActiveFutureAppointment(this.upcoming()));

  ngOnInit(): void { this.load(); }
  protected load(): void {
    this.isLoading.set(true);
    forkJoin({
      upcoming: this.appointmentsApi.findUpcoming(0, 20),
      history: this.appointmentsApi.findHistory(0, 100),
      notifications: this.notificationsApi.findAll({ page: 0, size: 100, unreadOnly: true }),
    }).pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: ({ upcoming, history, notifications }) => {
        this.upcoming.set(upcoming.content);
        this.completedCount.set(history.content.filter((item) => item.status === 'COMPLETED').length);
        this.unreadCount.set(notifications.totalElements);
      },
      error: (error: unknown) => this.errorMessage.set(getApiErrorDetails(error).message),
    });
  }
  protected cancelNext(): void {
    const appointment = this.nextAppointment();
    if (!appointment || this.isCancelling()) return;
    this.isCancelling.set(true);
    this.appointmentsApi.cancel(appointment.id).pipe(finalize(() => this.isCancelling.set(false))).subscribe({
      next: () => this.load(),
      error: (error: unknown) => this.errorMessage.set(getApiErrorDetails(error).message),
    });
  }
  protected statusLabel(appointment: Appointment): string { return appointmentStatusLabel(appointment.status); }
  protected statusClass(appointment: Appointment): string { return appointmentStatusClass(appointment.status); }
  protected formatDate(value: string): string { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(new Date(value)); }
  protected formatTime(value: string): string { return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
}
