import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { getApiErrorMessage } from '../../core/errors/api-error';
import { Appointment, AppointmentAvailabilitySlot, AppointmentStatus } from '../../core/models/appointment.models';
import { AppointmentsApi } from '../../core/services/appointments-api';
import { Auth } from '../../core/services/auth';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StateCard } from '../../shared/components/state-card/state-card';
import { ConfirmDialog } from '../../shared/services/confirm-dialog';

@Component({
  selector: 'app-appointments',
  imports: [DatePipe, PageHeader, ReactiveFormsModule, StateCard],
  templateUrl: './appointments.html',
  styleUrl: './appointments.css',
})
export class Appointments implements OnInit {
  private readonly appointmentsApi = inject(AppointmentsApi);
  private readonly auth = inject(Auth);
  private readonly confirmDialog = inject(ConfirmDialog);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly appointments = signal<Appointment[]>([]);
  protected readonly availableSlots = signal<AppointmentAvailabilitySlot[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly isLoadingAvailability = signal(false);
  protected readonly selectedAppointment = signal<Appointment | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly formMessage = signal<string | null>(null);
  protected readonly statusFilter = signal<AppointmentStatus | 'ALL'>('ALL');

  protected readonly filteredAppointments = computed(() =>
    this.statusFilter() === 'ALL'
      ? this.appointments()
      : this.appointments().filter((appointment) => appointment.status === this.statusFilter()),
  );

  protected readonly form = this.formBuilder.nonNullable.group({
    reason: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
    date: ['', Validators.required],
    startDateTime: ['', Validators.required],
    endDateTime: ['', Validators.required],
  });

  ngOnInit(): void {
    this.loadAppointments();
  }

  protected loadAvailability(): void {
    const userId = this.auth.user()?.id;
    const date = this.form.controls.date.value;

    if (!userId || !date) {
      this.availableSlots.set([]);
      return;
    }

    this.isLoadingAvailability.set(true);
    this.appointmentsApi
      .getAvailability(userId, date)
      .pipe(finalize(() => this.isLoadingAvailability.set(false)))
      .subscribe({
        next: (slots) => this.availableSlots.set(slots),
        error: (error: unknown) => this.formMessage.set(getApiErrorMessage(error)),
      });
  }

  protected selectSlot(slot: AppointmentAvailabilitySlot): void {
    this.form.patchValue({
      startDateTime: this.toDatetimeLocal(slot.startDateTime),
      endDateTime: this.toDatetimeLocal(slot.endDateTime),
    });
  }

  protected editAppointment(appointment: Appointment): void {
    if (!this.canEdit(appointment)) {
      return;
    }

    this.selectedAppointment.set(appointment);
    this.formMessage.set(null);
    this.form.patchValue({
      reason: appointment.reason,
      date: appointment.startDateTime.slice(0, 10),
      startDateTime: this.toDatetimeLocal(appointment.startDateTime),
      endDateTime: this.toDatetimeLocal(appointment.endDateTime),
    });
    this.loadAvailability();
  }

  protected resetForm(): void {
    this.selectedAppointment.set(null);
    this.form.reset();
    this.availableSlots.set([]);
    this.formMessage.set(null);
  }

  protected submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const userId = this.auth.user()?.id;

    if (!userId) {
      this.formMessage.set('Utilisateur connecté introuvable.');
      return;
    }

    this.isSubmitting.set(true);
    this.formMessage.set(null);
    const { reason, startDateTime, endDateTime } = this.form.getRawValue();
    const request = {
      reason,
      startDateTime,
      endDateTime,
    };

    const operation = this.selectedAppointment()
      ? this.appointmentsApi.update(this.selectedAppointment()!.id, request)
      : this.appointmentsApi.create({ ...request, userId });

    operation.pipe(finalize(() => this.isSubmitting.set(false))).subscribe({
      next: (appointment) => {
        if (this.selectedAppointment()) {
          this.appointments.update((items) =>
            items.map((item) => (item.id === appointment.id ? appointment : item)),
          );
        } else {
          this.appointments.update((items) => [appointment, ...items]);
        }
        this.resetForm();
      },
      error: (error: unknown) => {
        this.formMessage.set(getApiErrorMessage(error));
      },
    });
  }

  protected cancelAppointment(appointment: Appointment): void {
    if (!this.canEdit(appointment)) {
      return;
    }

    if (!this.confirmDialog.confirm(`Annuler le rendez-vous "${appointment.reason}" ?`)) {
      return;
    }

    this.appointmentsApi.cancel(appointment.id).subscribe({
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

  protected canEdit(appointment: Appointment): boolean {
    return appointment.status !== 'CANCELLED' && appointment.status !== 'COMPLETED';
  }

  protected statusLabel(status: AppointmentStatus): string {
    const labels: Record<AppointmentStatus, string> = {
      PENDING: 'En attente',
      SCHEDULED: 'Planifié',
      CONFIRMED: 'Confirmé',
      COMPLETED: 'Terminé',
      CANCELLED: 'Annulé',
    };

    return labels[status];
  }

  protected statusClass(status: AppointmentStatus): string {
    return `status ${status.toLowerCase()}`;
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(value));
  }

  protected formatTimeRange(appointment: Appointment): string {
    const formatter = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${formatter.format(new Date(appointment.startDateTime))} – ${formatter.format(new Date(appointment.endDateTime))}`;
  }

  private loadAppointments(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.appointmentsApi
      .findAll({ page: 0, size: 50 })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => this.appointments.set(response.content),
        error: (error: unknown) => this.errorMessage.set(getApiErrorMessage(error)),
      });
  }

  private toDatetimeLocal(value: string): string {
    return value.slice(0, 16);
  }
}
