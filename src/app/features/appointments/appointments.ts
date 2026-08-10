import { Component, OnInit, inject, signal } from '@angular/core';
import { Appointment } from '../../core/models/appointment.models';
import { AppointmentsApi } from '../../core/services/appointments-api';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StateCard } from '../../shared/components/state-card/state-card';

@Component({
  selector: 'app-appointments',
  imports: [PageHeader, StateCard],
  templateUrl: './appointments.html',
})
export class Appointments implements OnInit {
  private readonly appointmentsApi = inject(AppointmentsApi);

  protected readonly appointments = signal<Appointment[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
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
