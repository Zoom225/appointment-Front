import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { unwrapCollection } from '../api/api-response';
import {
  Appointment,
  AppointmentCreateRequest,
  AppointmentStatus,
  BackendAppointment,
  UpdateAppointmentPayload,
} from '../models/appointment.models';

@Injectable({ providedIn: 'root' })
export class AppointmentsApi {
  private readonly http = inject(HttpClient);

  findAll(): Observable<Appointment[]> {
    return this.http
      .get<BackendAppointment[] | { data?: BackendAppointment[]; items?: BackendAppointment[]; results?: BackendAppointment[]; content?: BackendAppointment[] }>(
        API_ENDPOINTS.appointments,
      )
      .pipe(map((response) => unwrapCollection(response).map((appointment) => this.mapAppointment(appointment))));
  }

  create(payload: AppointmentCreateRequest): Observable<Appointment> {
    return this.http
      .post<BackendAppointment>(API_ENDPOINTS.appointments, payload)
      .pipe(map((appointment) => this.mapAppointment(appointment)));
  }

  update(id: string, payload: UpdateAppointmentPayload): Observable<Appointment> {
    return this.http
      .patch<BackendAppointment>(`${API_ENDPOINTS.appointments}/${id}`, payload)
      .pipe(map((appointment) => this.mapAppointment(appointment)));
  }

  updateStatus(id: string, status: AppointmentStatus): Observable<Appointment> {
    return this.update(id, { status });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_ENDPOINTS.appointments}/${id}`);
  }

  private mapAppointment(appointment: BackendAppointment): Appointment {
    const startsAt =
      appointment.startsAt ??
      appointment.starts_at ??
      appointment.startDateTime ??
      appointment.startDate ??
      appointment.date ??
      '';

    return {
      id: String(appointment.id ?? appointment._id ?? ''),
      title: appointment.title ?? appointment.reason ?? 'Rendez-vous',
      startsAt,
      endsAt: appointment.endsAt ?? appointment.ends_at ?? appointment.endDateTime ?? appointment.endDate ?? startsAt,
      status: this.mapStatus(appointment.status),
      patientName: appointment.patientName ?? appointment.patient_name,
      userId:
        appointment.userId === undefined && appointment.user_id === undefined
          ? undefined
          : String(appointment.userId ?? appointment.user_id),
    };
  }

  private mapStatus(status: string | undefined): AppointmentStatus {
    if (status === 'confirmed' || status === 'cancelled' || status === 'completed') {
      return status;
    }

    return 'scheduled';
  }
}
