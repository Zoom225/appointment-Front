import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, finalize, map } from 'rxjs';
import { allowedAdminTransitions, appointmentStatusClass, appointmentStatusLabel } from '../../core/appointments/appointment-status';
import { getApiErrorDetails } from '../../core/errors/api-error';
import { Appointment, AppointmentAudit, AppointmentStatus } from '../../core/models/appointment.models';
import { PageResponse } from '../../core/models/api.models';
import { AppUser } from '../../core/models/user.models';
import { AdminApi } from '../../core/services/admin-api';
import { UsersApi } from '../../core/services/users-api';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StateCard } from '../../shared/components/state-card/state-card';

@Component({
  selector: 'app-admin-appointments',
  imports: [PageHeader, ReactiveFormsModule, StateCard],
  templateUrl: './admin-appointments.html',
  styleUrl: './admin-appointments.css',
})
export class AdminAppointments implements OnInit {
  private readonly adminApi = inject(AdminApi);
  private readonly usersApi = inject(UsersApi);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly isHistory = Boolean(this.route.snapshot.data['history']);
  protected readonly appointments = signal<Appointment[]>([]);
  protected readonly users = signal<Map<number, AppUser>>(new Map());
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly isLoading = signal(true);
  protected readonly updatingId = signal<number | null>(null);
  protected readonly auditAppointment = signal<Appointment | null>(null);
  protected readonly auditEntries = signal<AppointmentAudit[]>([]);
  protected readonly isLoadingAudit = signal(false);
  protected readonly auditError = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly filters = this.formBuilder.nonNullable.group({
    query: [''],
    status: [''],
    startFrom: [''],
    startTo: [''],
  });

  ngOnInit(): void { this.load(0); }

  protected load(page: number): void {
    if (page < 0 || (this.totalPages() > 0 && page >= this.totalPages())) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const values = this.filters.getRawValue();
    const baseParams = {
        page,
        size: 20,
        query: values.query || undefined,
        startFrom: values.startFrom || undefined,
        startTo: values.startTo || undefined,
    };
    const appointmentsRequest = this.isHistory
      ? forkJoin([
          this.adminApi.getAppointments({ ...baseParams, status: 'COMPLETED' }),
          this.adminApi.getAppointments({ ...baseParams, status: 'CANCELLED' }),
        ]).pipe(map(([completed, cancelled]) => this.mergeHistoryPages(completed, cancelled)))
      : this.adminApi.getAppointments({
          ...baseParams,
          status: values.status ? values.status as AppointmentStatus : undefined,
        });
    forkJoin({
      appointments: appointmentsRequest,
      users: this.usersApi.findAll({ page: 0, size: 200 }),
    }).pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: ({ appointments, users }) => {
        this.appointments.set(appointments.content);
        this.users.set(new Map(users.content.map((user) => [user.id, user])));
        this.page.set(appointments.number);
        this.totalPages.set(appointments.totalPages);
      },
      error: (error: unknown) => this.errorMessage.set(getApiErrorDetails(error).message),
    });
  }

  protected resetFilters(): void { this.filters.reset(); this.load(0); }

  protected updateStatus(appointment: Appointment, status: AppointmentStatus): void {
    if (!allowedAdminTransitions(appointment.status).includes(status) || this.updatingId()) return;
    this.updatingId.set(appointment.id);
    this.adminApi.updateAppointmentStatus(appointment.id, status).pipe(finalize(() => this.updatingId.set(null))).subscribe({
      next: (updated) => this.appointments.update((items) => items.map((item) => item.id === updated.id ? updated : item)),
      error: (error: unknown) => this.errorMessage.set(getApiErrorDetails(error).message),
    });
  }

  protected loadHistory(appointment: Appointment): void {
    this.auditAppointment.set(appointment);
    this.auditEntries.set([]);
    this.auditError.set(null);
    this.isLoadingAudit.set(true);
    this.adminApi.getAppointmentHistory(appointment.id).pipe(finalize(() => this.isLoadingAudit.set(false))).subscribe({
      next: (entries) => this.auditEntries.set(entries),
      error: (error: unknown) => this.auditError.set(getApiErrorDetails(error).message),
    });
  }

  protected closeHistory(): void { this.auditAppointment.set(null); this.auditEntries.set([]); }

  protected transitions(appointment: Appointment): AppointmentStatus[] { return allowedAdminTransitions(appointment.status); }
  protected transitionLabel(status: AppointmentStatus): string { return status === 'CONFIRMED' ? 'Confirmer' : status === 'COMPLETED' ? 'Terminer' : 'Annuler'; }
  protected userFor(appointment: Appointment): AppUser | undefined { return this.users().get(appointment.userId); }
  protected statusLabel(appointment: Appointment): string { return appointmentStatusLabel(appointment.status); }
  protected statusClass(appointment: Appointment): string { return appointmentStatusClass(appointment.status); }
  protected formatDate(value: string): string { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(value)); }
  protected formatTime(value: string): string { return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
  protected formatDateTime(value: string): string { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }

  private mergeHistoryPages(completed: PageResponse<Appointment>, cancelled: PageResponse<Appointment>): PageResponse<Appointment> {
    const content = [...completed.content, ...cancelled.content]
      .sort((left, right) => new Date(right.startDateTime).getTime() - new Date(left.startDateTime).getTime());
    return {
      ...completed,
      content,
      totalElements: completed.totalElements + cancelled.totalElements,
      totalPages: Math.max(completed.totalPages, cancelled.totalPages),
      numberOfElements: content.length,
      first: completed.first && cancelled.first,
      last: completed.last && cancelled.last,
      empty: content.length === 0,
    };
  }
}
