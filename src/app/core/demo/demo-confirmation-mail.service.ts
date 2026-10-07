import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Appointment } from '../models/appointment.models';

export type DemoEmailState = 'IDLE' | 'SENDING' | 'SENT' | 'FAILED' | 'DISABLED';

export interface DemoConfirmationMailResponse {
  sent: boolean;
  reason?: 'MAIL_DISABLED';
}

@Injectable({ providedIn: 'root' })
export class DemoConfirmationMailService {
  private readonly http = inject(HttpClient);

  sendConfirmation(appointment: Appointment): Observable<DemoConfirmationMailResponse> {
    return this.http.post<DemoConfirmationMailResponse>('/api/demo/send-confirmation', {
      contactFirstName: appointment.contactFirstName,
      contactLastName: appointment.contactLastName,
      contactEmail: appointment.contactEmail,
      publicReference: appointment.publicReference,
      startDateTime: appointment.startDateTime,
      endDateTime: appointment.endDateTime,
      reason: appointment.reason,
      status: appointment.status,
    });
  }
}
