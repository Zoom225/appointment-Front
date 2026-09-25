import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, ReactiveFormsModule, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, catchError, distinctUntilChanged, map, merge, of, startWith, switchMap, tap, finalize } from 'rxjs';
import { appointmentStatusClass, appointmentStatusLabel } from '../../core/appointments/appointment-status';
import { getApiErrorDetails } from '../../core/errors/api-error';
import { Appointment, AppointmentAvailabilitySlot } from '../../core/models/appointment.models';
import { AppointmentsApi } from '../../core/services/appointments-api';
import { PageHeader } from '../../shared/components/page-header/page-header';

export function businessDayValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }

    const [year, month, day] = value.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    const isValidDate = localDate.getFullYear() === year && localDate.getMonth() === month - 1 && localDate.getDate() === day;
    if (!isValidDate) {
      return null;
    }

    const dayOfWeek = localDate.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6 ? { nonBusinessDay: true } : null;
  };
}

@Component({
  selector: 'app-appointment-new',
  imports: [PageHeader, ReactiveFormsModule, RouterLink],
  templateUrl: './appointment-new.html',
  styleUrl: './appointment-new.css',
})
export class AppointmentNew {
  private readonly api = inject(AppointmentsApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly availabilityRefresh = new Subject<string>();

  protected readonly slots = signal<AppointmentAvailabilitySlot[]>([]);
  protected readonly selectedSlot = signal<AppointmentAvailabilitySlot | null>(null);
  protected readonly confirmation = signal<Appointment | null>(null);
  protected readonly conflictingAppointment = signal<Appointment | null>(null);
  protected readonly isLoadingSlots = signal(false);
  protected readonly slotsLoaded = signal(false);
  protected readonly slotsError = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly isCancelling = signal(false);
  protected readonly showCancelDialog = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly conflictMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    contactFirstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    contactLastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    contactEmail: ['', [Validators.required, Validators.email]],
    date: ['', [Validators.required, businessDayValidator()]],
    startDateTime: ['', Validators.required],
    endDateTime: ['', Validators.required],
    reason: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
  });

  private readonly formStatus = toSignal(this.form.statusChanges.pipe(startWith(this.form.status)), { initialValue: this.form.status });
  protected readonly canSubmit = computed(() => this.formStatus() === 'VALID' && Boolean(this.selectedSlot()) && !this.isSubmitting());

  constructor() {
    merge(this.form.controls.date.valueChanges.pipe(distinctUntilChanged()), this.availabilityRefresh)
      .pipe(
        tap(() => this.resetSlotSelection()),
        switchMap((date) => {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || this.form.controls.date.invalid) {
            return of({ slots: [] as AppointmentAvailabilitySlot[], error: null as string | null, loaded: false });
          }

          this.isLoadingSlots.set(true);
          return this.api.getAvailability(date).pipe(
            map((slots) => ({ slots, error: null as string | null, loaded: true })),
            catchError((error: unknown) => of({ slots: [] as AppointmentAvailabilitySlot[], error: getApiErrorDetails(error).message, loaded: true })),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ slots, error, loaded }) => {
        this.isLoadingSlots.set(false);
        this.slots.set(slots);
        this.slotsError.set(error);
        this.slotsLoaded.set(loaded);
      });
  }

  protected loadSlots(): void {
    const date = this.form.controls.date.value;
    if (date) this.availabilityRefresh.next(date);
  }

  protected selectSlot(slot: AppointmentAvailabilitySlot): void {
    this.selectedSlot.set(slot);
    this.form.patchValue({ startDateTime: slot.startDateTime, endDateTime: slot.endDateTime });
    this.form.updateValueAndValidity();
  }

  protected submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }

    const selectedSlot = this.selectedSlot();
    if (this.form.invalid || !selectedSlot || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.conflictMessage.set(null);
    this.api
      .create({
        contactFirstName: values.contactFirstName.trim(),
        contactLastName: values.contactLastName.trim(),
        contactEmail: values.contactEmail.trim().toLowerCase(),
        reason: values.reason.trim(),
        startDateTime: values.startDateTime,
        endDateTime: values.endDateTime,
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (appointment) => this.confirmation.set(appointment),
        error: (error: unknown) => {
          const details = getApiErrorDetails(error);
          if (error instanceof HttpErrorResponse && error.status === 409) {
            if (this.isSlotConflict(details.message)) {
              this.errorMessage.set('Ce créneau vient d\'être réservé. Choisissez un autre créneau.');
              this.loadSlots();
            } else {
              this.conflictMessage.set(details.message);
              this.loadConflictingAppointment();
            }
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

  protected showControlError(controlName: 'contactFirstName' | 'contactLastName' | 'contactEmail' | 'date' | 'reason'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  private loadConflictingAppointment(): void {
    this.api.findUpcoming(0, 1).subscribe({
      next: (page) => this.conflictingAppointment.set(page.content[0] ?? null),
      error: () => this.conflictingAppointment.set(null),
    });
  }

  private resetSlotSelection(): void {
    this.slotsLoaded.set(false);
    this.slotsError.set(null);
    this.slots.set([]);
    this.selectedSlot.set(null);
    this.form.patchValue({ startDateTime: '', endDateTime: '' }, { emitEvent: false });
  }

  private isSlotConflict(message: string): boolean {
    return /créneau|creneau|slot|occup|réserv/i.test(message);
  }
}
