import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { appointmentStatusClass, appointmentStatusLabel } from '../../core/appointments/appointment-status';
import { PublicAppointmentVerification } from '../../core/models/appointment.models';
import { AppointmentsApi } from '../../core/services/appointments-api';

@Component({
  selector: 'app-verify-appointment',
  imports: [RouterLink],
  templateUrl: './verify-appointment.html',
  styleUrl: './verify-appointment.css',
})
export class VerifyAppointment implements OnInit {
  private readonly api = inject(AppointmentsApi);
  private readonly route = inject(ActivatedRoute);
  protected readonly appointment = signal<PublicAppointmentVerification | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly invalid = signal(false);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.invalid.set(true);
      this.isLoading.set(false);
      return;
    }

    this.api.verifyPublicAppointment(token).subscribe({
      next: (appointment) => { this.appointment.set(appointment); this.isLoading.set(false); },
      error: () => { this.invalid.set(true); this.isLoading.set(false); },
    });
  }

  protected statusLabel(appointment: PublicAppointmentVerification): string { return appointmentStatusLabel(appointment.status); }
  protected statusClass(appointment: PublicAppointmentVerification): string { return appointmentStatusClass(appointment.status); }
  protected formatDate(value: string): string { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(new Date(value)); }
  protected formatTime(value: string): string { return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
}
