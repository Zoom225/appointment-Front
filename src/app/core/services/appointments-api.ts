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
  PublicAppointmentVerification,
} from '../models/appointment.models';
import { PageResponse } from '../models/api.models';
import { DemoModeService } from '../demo/demo-mode.service';
import { DemoAppointmentService } from '../demo/demo-appointment.service';

@Injectable({ providedIn: 'root' })
export class AppointmentsApi {
  private readonly http = inject(HttpClient);
  private readonly mode = inject(DemoModeService);
  private readonly demo = inject(DemoAppointmentService);

  findAll(params?: {
    page?: number;
    size?: number;
    status?: AppointmentStatus;
    startFrom?: string;
    startTo?: string;
  }): Observable<PageResponse<Appointment>> {
    if (this.mode.isDemo()) return this.demo.findAll(params);
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
    if (this.mode.isDemo()) return this.demo.findById(id);
    return this.http.get<Appointment>(`${API_ENDPOINTS.appointments}/${id}`);
  }

  findUpcoming(page = 0, size = 20): Observable<PageResponse<Appointment>> {
    if (this.mode.isDemo()) return this.demo.findUpcoming(page, size);
    return this.http.get<PageResponse<Appointment>>(API_ENDPOINTS.myAppointments.upcoming, {
      params: new HttpParams().set('page', page).set('size', size),
    });
  }

  findHistory(page = 0, size = 20): Observable<PageResponse<Appointment>> {
    if (this.mode.isDemo()) return this.demo.findHistory(page, size);
    return this.http.get<PageResponse<Appointment>>(API_ENDPOINTS.myAppointments.history, {
      params: new HttpParams().set('page', page).set('size', size),
    });
  }

  create(payload: AppointmentCreateRequest): Observable<Appointment> {
    if (this.mode.isDemo()) return this.demo.create(payload);
    return this.http.post<Appointment>(API_ENDPOINTS.appointments, payload);
  }

  update(id: number, payload: AppointmentUpdateRequest): Observable<Appointment> {
    if (this.mode.isDemo()) return this.demo.update(id, payload);
    return this.http.put<Appointment>(`${API_ENDPOINTS.appointments}/${id}`, payload);
  }

  updateStatus(id: number, status: AppointmentStatus): Observable<Appointment> {
    if (this.mode.isDemo()) return this.demo.updateStatus(id, status);
    const payload: AppointmentStatusUpdateRequest = { status };
    return this.http.patch<Appointment>(`${API_ENDPOINTS.appointments}/${id}`, payload);
  }

  cancel(id: number): Observable<Appointment> {
    if (this.mode.isDemo()) return this.demo.cancel(id);
    return this.http.patch<Appointment>(`${API_ENDPOINTS.appointments}/${id}/cancel`, {});
  }

  getAvailability(date: string): Observable<AppointmentAvailabilitySlot[]> {
    if (this.mode.isDemo()) return this.demo.getAvailability(date);
    return this.http.get<AppointmentAvailabilitySlot[]>(`${API_ENDPOINTS.appointments}/availability`, {
      params: new HttpParams().set('date', date),
    });
  }

  verifyPublicAppointment(token: string): Observable<PublicAppointmentVerification> {
    if (this.mode.isDemo()) return this.demo.verifyPublicAppointment(token);
    return this.http.get<PublicAppointmentVerification>(API_ENDPOINTS.publicAppointmentVerification, {
      params: new HttpParams().set('token', token),
    });
  }
}
