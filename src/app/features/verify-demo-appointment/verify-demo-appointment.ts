import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { appointmentStatusClass, appointmentStatusLabel } from '../../core/appointments/appointment-status';
import { formatLocalDate, formatLocalTime } from '../../core/date-time/local-date-time';
import { PublicAppointmentVerification } from '../../core/models/appointment.models';
import { DemoConfirmationMailService } from '../../core/demo/demo-confirmation-mail.service';

type VerificationViewState = 'LOADING' | 'MISSING' | 'INVALID' | 'LOADED';

@Component({
  selector: 'app-verify-demo-appointment',
  imports: [RouterLink],
  templateUrl: './verify-demo-appointment.html',
  styleUrl: './verify-demo-appointment.css',
})
export class VerifyDemoAppointment implements OnInit {
  private readonly api = inject(DemoConfirmationMailService);
  private readonly route = inject(ActivatedRoute);
  protected readonly appointment = signal<PublicAppointmentVerification | null>(null);
  protected readonly state = signal<VerificationViewState>('LOADING');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state.set('MISSING');
      return;
    }
    this.api.verify(token).subscribe({
      next: (appointment) => {
        this.appointment.set(appointment);
        this.state.set('LOADED');
      },
      error: () => this.state.set('INVALID'),
    });
  }

  protected statusLabel(appointment: PublicAppointmentVerification): string {
    return appointment.status === 'CONFIRMED' ? 'Confirmé' : appointmentStatusLabel(appointment.status);
  }
  protected statusClass(appointment: PublicAppointmentVerification): string { return appointmentStatusClass(appointment.status); }
  protected formatDate(value: string): string { return formatLocalDate(value); }
  protected formatTime(value: string): string { return formatLocalTime(value); }
}
