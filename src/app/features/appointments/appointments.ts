import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { appointmentStatusClass, appointmentStatusLabel } from '../../core/appointments/appointment-status';
import { getApiErrorDetails } from '../../core/errors/api-error';
import { Appointment, isActiveAppointmentStatus } from '../../core/models/appointment.models';
import { AppointmentsApi } from '../../core/services/appointments-api';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StateCard } from '../../shared/components/state-card/state-card';

@Component({
  selector: 'app-appointments',
  imports: [PageHeader, ReactiveFormsModule, RouterLink, StateCard],
  templateUrl: './appointments.html',
  styleUrl: './appointments.css',
})
export class Appointments implements OnInit {
  private readonly api = inject(AppointmentsApi);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly appointments = signal<Appointment[]>([]);
  protected readonly appointmentToCancel = signal<Appointment | null>(null);
  protected readonly appointmentToEdit = signal<Appointment | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isCancelling = signal(false);
  protected readonly isUpdating = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly editForm = this.formBuilder.nonNullable.group({
    reason: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
    startDateTime: ['', Validators.required],
    endDateTime: ['', Validators.required],
  });

  ngOnInit(): void { this.load(); }

  protected load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.api.findUpcoming(0, 20).pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: (page) => this.appointments.set(page.content),
      error: (error: unknown) => this.errorMessage.set(getApiErrorDetails(error).message),
    });
  }

  protected requestCancellation(appointment: Appointment): void { this.appointmentToCancel.set(appointment); }
  protected closeDialog(): void { if (!this.isCancelling()) this.appointmentToCancel.set(null); }

  protected confirmCancellation(): void {
    const appointment = this.appointmentToCancel();
    if (!appointment || this.isCancelling()) return;
    this.isCancelling.set(true);
    this.api.cancel(appointment.id).pipe(finalize(() => this.isCancelling.set(false))).subscribe({
      next: () => {
        this.appointmentToCancel.set(null);
        this.successMessage.set('Le rendez-vous a bien été annulé. Vous pouvez maintenant effectuer une nouvelle réservation.');
        this.load();
      },
      error: (error: unknown) => this.errorMessage.set(getApiErrorDetails(error).message),
    });
  }

  protected editAppointment(appointment: Appointment): void {
    if (!this.canEdit(appointment)) return;
    this.errorMessage.set(null);
    this.appointmentToEdit.set(appointment);
    this.editForm.setValue({
      reason: appointment.reason,
      startDateTime: appointment.startDateTime.slice(0, 16),
      endDateTime: appointment.endDateTime.slice(0, 16),
    });
  }

  protected closeEditDialog(): void {
    if (!this.isUpdating()) this.appointmentToEdit.set(null);
  }

  protected updateAppointment(): void {
    const appointment = this.appointmentToEdit();
    if (!appointment || !this.canEdit(appointment) || this.editForm.invalid || this.isUpdating()) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.isUpdating.set(true);
    this.api.update(appointment.id, this.editForm.getRawValue()).pipe(finalize(() => this.isUpdating.set(false))).subscribe({
      next: (updated) => {
        this.appointmentToEdit.set(null);
        this.appointments.update((items) => items.map((item) => item.id === updated.id ? updated : item));
        this.successMessage.set('Le rendez-vous a bien été modifié.');
      },
      error: (error: unknown) => this.errorMessage.set(getApiErrorDetails(error).message),
    });
  }

  protected canCancel(appointment: Appointment): boolean { return isActiveAppointmentStatus(appointment.status); }
  protected canEdit(appointment: Appointment): boolean { return isActiveAppointmentStatus(appointment.status); }
  protected statusLabel(appointment: Appointment): string { return appointmentStatusLabel(appointment.status); }
  protected statusClass(appointment: Appointment): string { return appointmentStatusClass(appointment.status); }
  protected formatDate(value: string): string { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(new Date(value)); }
  protected formatTime(value: string): string { return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
}
