import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { getApiErrorMessage } from '../../core/errors/api-error';
import { Appointment, AppointmentStatus } from '../../core/models/appointment.models';
import { AppointmentsApi } from '../../core/services/appointments-api';
import { Auth } from '../../core/services/auth';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StateCard } from '../../shared/components/state-card/state-card';
import { ConfirmDialog } from '../../shared/services/confirm-dialog';

@Component({
  selector: 'app-appointments',
  imports: [DatePipe, FormsModule, PageHeader, ReactiveFormsModule, StateCard],
  templateUrl: './appointments.html',
  styleUrl: './appointments.css',
})
export class Appointments implements OnInit {
  private readonly appointmentsApi = inject(AppointmentsApi);
  private readonly auth = inject(Auth);
  private readonly confirmDialog = inject(ConfirmDialog);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly appointments = signal<Appointment[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isCreating = signal(false);
  protected readonly pendingAppointmentId = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly createErrorMessage = signal<string | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<AppointmentStatus | 'all'>('all');
  protected readonly filteredAppointments = computed(() => {
    const searchTerm = this.searchTerm().trim().toLowerCase();
    const statusFilter = this.statusFilter();

    return this.appointments().filter((appointment) => {
      const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
      const matchesSearch =
        !searchTerm ||
        [appointment.title, appointment.patientName, appointment.status].some((value) =>
          value?.toLowerCase().includes(searchTerm),
        );

      return matchesStatus && matchesSearch;
    });
  });

  protected readonly statusOptions: Array<{ label: string; value: AppointmentStatus | 'all' }> = [
    { label: 'Tous', value: 'all' },
    { label: 'Planifiés', value: 'scheduled' },
    { label: 'Confirmés', value: 'confirmed' },
    { label: 'Terminés', value: 'completed' },
    { label: 'Annulés', value: 'cancelled' },
  ];

  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    patientName: [''],
    startsAt: ['', Validators.required],
    endsAt: ['', Validators.required],
  });

  ngOnInit(): void {
    this.loadAppointments();
  }

  protected createAppointment(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isCreating.set(true);
    this.createErrorMessage.set(null);

    const currentUserId = this.getCurrentUserId();

    if (currentUserId === null) {
      this.createErrorMessage.set('Impossible de créer le rendez-vous : utilisateur connecté introuvable.');
      this.isCreating.set(false);
      return;
    }

    const formValue = this.form.getRawValue();

    this.appointmentsApi.create({
      reason: formValue.title,
      startDateTime: formValue.startsAt,
      endDateTime: formValue.endsAt,
      userId: currentUserId,
    }).subscribe({
      next: (appointment) => {
        this.appointments.update((appointments) => [appointment, ...appointments]);
        this.form.reset();
        this.isCreating.set(false);
      },
      error: (error: unknown) => {
        this.createErrorMessage.set(getApiErrorMessage(error));
        this.isCreating.set(false);
      },
    });
  }

  protected updateStatus(appointment: Appointment): void {
    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      return;
    }

    const nextStatus = appointment.status === 'confirmed' ? 'completed' : 'confirmed';
    const confirmed = this.confirmDialog.confirm(
      `Confirmer le changement de statut du rendez-vous "${appointment.title}" ?`,
    );

    if (!confirmed) {
      return;
    }

    this.pendingAppointmentId.set(appointment.id);
    this.appointmentsApi.updateStatus(appointment.id, nextStatus).subscribe({
      next: (updatedAppointment) => {
        this.appointments.update((appointments) =>
          appointments.map((currentAppointment) =>
            currentAppointment.id === updatedAppointment.id ? updatedAppointment : currentAppointment,
          ),
        );
        this.pendingAppointmentId.set(null);
      },
      error: (error: unknown) => {
        this.errorMessage.set(getApiErrorMessage(error));
        this.pendingAppointmentId.set(null);
      },
    });
  }

  protected deleteAppointment(appointment: Appointment): void {
    if (this.pendingAppointmentId()) {
      return;
    }

    const confirmed = this.confirmDialog.confirm(
      `Supprimer définitivement le rendez-vous "${appointment.title}" ?`,
    );

    if (!confirmed) {
      return;
    }

    this.pendingAppointmentId.set(appointment.id);
    this.appointmentsApi.delete(appointment.id).subscribe({
      next: () => {
        this.appointments.update((appointments) =>
          appointments.filter((currentAppointment) => currentAppointment.id !== appointment.id),
        );
        this.pendingAppointmentId.set(null);
      },
      error: (error: unknown) => {
        this.errorMessage.set(getApiErrorMessage(error));
        this.pendingAppointmentId.set(null);
      },
    });
  }

  private loadAppointments(): void {
    this.appointmentsApi.findAll().subscribe({
      next: (appointments) => {
        this.appointments.set(appointments);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(getApiErrorMessage(error));
        this.isLoading.set(false);
      },
    });
  }

  private getCurrentUserId(): number | null {
    const userId = Number(this.auth.user()?.id);

    return Number.isInteger(userId) && userId > 0 ? userId : null;
  }
}
