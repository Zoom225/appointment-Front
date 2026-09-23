import { Component, OnInit, inject, signal } from '@angular/core';
import { appointmentStatusClass, appointmentStatusLabel } from '../../core/appointments/appointment-status';
import { getApiErrorDetails } from '../../core/errors/api-error';
import { Appointment } from '../../core/models/appointment.models';
import { AppointmentsApi } from '../../core/services/appointments-api';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StateCard } from '../../shared/components/state-card/state-card';

@Component({
  selector: 'app-appointment-history',
  imports: [PageHeader, StateCard],
  templateUrl: './appointment-history.html',
  styleUrl: './appointment-history.css',
})
export class AppointmentHistory implements OnInit {
  private readonly api = inject(AppointmentsApi);
  protected readonly appointments = signal<Appointment[]>([]);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void { this.load(0); }

  protected load(page: number): void {
    if (page < 0 || (this.totalPages() > 0 && page >= this.totalPages())) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.api.findHistory(page, 10).subscribe({
      next: (response) => {
        this.appointments.set(response.content);
        this.page.set(response.number);
        this.totalPages.set(response.totalPages);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(getApiErrorDetails(error).message);
        this.isLoading.set(false);
      },
    });
  }

  protected statusLabel(appointment: Appointment): string { return appointmentStatusLabel(appointment.status); }
  protected statusClass(appointment: Appointment): string { return appointmentStatusClass(appointment.status); }
  protected formatDate(value: string): string { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(value)); }
  protected formatTime(value: string): string { return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
}
