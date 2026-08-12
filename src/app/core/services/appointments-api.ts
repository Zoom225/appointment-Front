import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../api/api-endpoints';
import {
  Appointment,
  AppointmentAvailabilitySlot,
  AppointmentCreateRequest,
  AppointmentStatus,
  AppointmentStatusUpdateRequest,
  AppointmentUpdateRequest,
} from '../models/appointment.models';
import { PageResponse } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class AppointmentsApi {
  private readonly http = inject(HttpClient);

  findAll(params?: {
    page?: number;
    size?: number;
    status?: AppointmentStatus;
    startFrom?: string;
    startTo?: string;
  }): Observable<PageResponse<Appointment>> {
    let httpParams = new HttpParams();

    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', params.page);
    }
    if (params?.size !== undefined) {
      httpParams = httpParams.set('size', params.size);
    }
    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.startFrom) {
      httpParams = httpParams.set('startFrom', params.startFrom);
    }
    if (params?.startTo) {
      httpParams = httpParams.set('startTo', params.startTo);
    }

    return this.http.get<PageResponse<Appointment>>(API_ENDPOINTS.appointments, { params: httpParams });
  }

  findById(id: number): Observable<Appointment> {
    return this.http.get<Appointment>(`${API_ENDPOINTS.appointments}/${id}`);
  }

  create(payload: AppointmentCreateRequest): Observable<Appointment> {
    return this.http.post<Appointment>(API_ENDPOINTS.appointments, payload);
  }

  update(id: number, payload: AppointmentUpdateRequest): Observable<Appointment> {
    return this.http.put<Appointment>(`${API_ENDPOINTS.appointments}/${id}`, payload);
  }

  updateStatus(id: number, status: AppointmentStatus): Observable<Appointment> {
    const payload: AppointmentStatusUpdateRequest = { status };
    return this.http.patch<Appointment>(`${API_ENDPOINTS.appointments}/${id}`, payload);
  }

  cancel(id: number): Observable<Appointment> {
    return this.http.patch<Appointment>(`${API_ENDPOINTS.appointments}/${id}/cancel`, {});
  }

  getAvailability(userId: number, date: string): Observable<AppointmentAvailabilitySlot[]> {
    return this.http.get<AppointmentAvailabilitySlot[]>(`${API_ENDPOINTS.appointments}/availability`, {
      params: new HttpParams().set('userId', userId).set('date', date),
    });
  }
}
