import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../api/api-endpoints';
import {
  Appointment,
  AppointmentStatus,
  CreateAppointmentPayload,
  UpdateAppointmentPayload,
} from '../models/appointment.models';

@Injectable({ providedIn: 'root' })
export class AppointmentsApi {
  private readonly http = inject(HttpClient);

  findAll(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(API_ENDPOINTS.appointments);
  }

  create(payload: CreateAppointmentPayload): Observable<Appointment> {
    return this.http.post<Appointment>(API_ENDPOINTS.appointments, payload);
  }

  update(id: string, payload: UpdateAppointmentPayload): Observable<Appointment> {
    return this.http.patch<Appointment>(`${API_ENDPOINTS.appointments}/${id}`, payload);
  }

  updateStatus(id: string, status: AppointmentStatus): Observable<Appointment> {
    return this.update(id, { status });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_ENDPOINTS.appointments}/${id}`);
  }
}
