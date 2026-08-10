import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Appointment } from '../../core/models/appointment.models';
import { AppointmentsApi } from '../../core/services/appointments-api';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StateCard } from '../../shared/components/state-card/state-card';

@Component({
  selector: 'app-appointments',
  imports: [DatePipe, PageHeader, ReactiveFormsModule, StateCard],
  templateUrl: './appointments.html',
  styleUrl: './appointments.css',
})
export class Appointments implements OnInit {
  private readonly appointmentsApi = inject(AppointmentsApi);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly appointments = signal<Appointment[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isCreating = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly createErrorMessage = signal<string | null>(null);

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

    this.appointmentsApi.create(this.form.getRawValue()).subscribe({
      next: (appointment) => {
        this.appointments.update((appointments) => [appointment, ...appointments]);
        this.form.reset();
        this.isCreating.set(false);
      },
      error: () => {
        this.createErrorMessage.set('La création du rendez-vous a échoué.');
        this.isCreating.set(false);
      },
    });
  }

  private loadAppointments(): void {
    this.appointmentsApi.findAll().subscribe({
      next: (appointments) => {
        this.appointments.set(appointments);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger les rendez-vous pour le moment.');
        this.isLoading.set(false);
      },
    });
  }
}
