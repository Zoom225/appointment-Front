import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { appointmentStatusClass, appointmentStatusLabel } from '../../core/appointments/appointment-status';
import { getApiErrorDetails } from '../../core/errors/api-error';
import { Appointment, AppointmentAvailabilitySlot } from '../../core/models/appointment.models';
import { AppointmentsApi } from '../../core/services/appointments-api';
import { Auth } from '../../core/services/auth';
import { PageHeader } from '../../shared/components/page-header/page-header';

@Component({
  selector: 'app-appointment-new',
  imports: [PageHeader, ReactiveFormsModule, RouterLink],
  templateUrl: './appointment-new.html',
  styleUrl: './appointment-new.css',
})
export class AppointmentNew {
  private readonly api = inject(AppointmentsApi);
  private readonly auth = inject(Auth);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly slots = signal<AppointmentAvailabilitySlot[]>([]);
  protected readonly selectedSlot = signal<AppointmentAvailabilitySlot | null>(null);
  protected readonly confirmation = signal<Appointment | null>(null);
  protected readonly conflictingAppointment = signal<Appointment | null>(null);
  protected readonly isLoadingSlots = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly isCancelling = signal(false);
  protected readonly showCancelDialog = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly conflictMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    date: ['', Validators.required],
    reason: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
  });

  protected readonly canSubmit = computed(
    () => this.form.valid && Boolean(this.selectedSlot()) && !this.isSubmitting(),
  );

  protected loadSlots(): void {
    const date = this.form.controls.date.value;
    const userId = this.auth.user()?.id;

    if (!date || !userId) {
      return;
    }

    this.isLoadingSlots.set(true);
    this.errorMessage.set(null);
    this.selectedSlot.set(null);
    this.api
      .getAvailability(userId, date)
      .pipe(finalize(() => this.isLoadingSlots.set(false)))
      .subscribe({
        next: (slots) => this.slots.set(slots),
        error: (error: unknown) => this.errorMessage.set(getApiErrorDetails(error).message),
      });
  }

  protected chooseSlot(slot: AppointmentAvailabilitySlot): void {
    this.selectedSlot.set(slot);
  }

  protected submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }

    const userId = this.auth.user()?.id;
    const slot = this.selectedSlot();
    if (!userId || !slot) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.conflictMessage.set(null);
    this.api
      .create({
        userId,
        reason: this.form.controls.reason.value,
        startDateTime: slot.startDateTime,
        endDateTime: slot.endDateTime,
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (appointment) => this.confirmation.set(appointment),
        error: (error: unknown) => {
          const details = getApiErrorDetails(error);
          if (error instanceof HttpErrorResponse && error.status === 409) {
            this.conflictMessage.set(details.message);
            this.loadConflictingAppointment();
          } else {
            this.errorMessage.set(details.message);
          }
        },
      });
  }

  protected requestConflictCancellation(): void {
    if (this.conflictingAppointment()) {
      this.showCancelDialog.set(true);
    }
  }

  protected cancelConflictingAppointment(): void {
    const appointment = this.conflictingAppointment();
    if (!appointment || this.isCancelling()) {
      return;
    }

    this.isCancelling.set(true);
    this.api
      .cancel(appointment.id)
      .pipe(finalize(() => this.isCancelling.set(false)))
      .subscribe({
        next: () => {
          this.showCancelDialog.set(false);
          this.conflictingAppointment.set(null);
          this.conflictMessage.set(null);
          this.loadSlots();
        },
        error: (error: unknown) => this.errorMessage.set(getApiErrorDetails(error).message),
      });
  }

  protected statusLabel(appointment: Appointment): string {
    return appointmentStatusLabel(appointment.status);
  }

  protected statusClass(appointment: Appointment): string {
    return appointmentStatusClass(appointment.status);
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(new Date(value));
  }

  protected formatTime(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  }

  private loadConflictingAppointment(): void {
    this.api.findUpcoming(0, 1).subscribe({
      next: (page) => this.conflictingAppointment.set(page.content[0] ?? null),
      error: () => this.conflictingAppointment.set(null),
    });
  }
}
