import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { AdminStatistics } from '../models/admin.models';
import { Appointment, AppointmentAudit, AppointmentStatus } from '../models/appointment.models';
import { PageResponse } from '../models/api.models';
import { AppNotification } from '../models/notification.models';

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);

  getStatistics(periodFrom?: string, periodTo?: string): Observable<AdminStatistics> {
    let params = new HttpParams();
    if (periodFrom) {
      params = params.set('periodFrom', periodFrom);
    }
    if (periodTo) {
      params = params.set('periodTo', periodTo);
    }
    return this.http.get<AdminStatistics>(API_ENDPOINTS.admin.statistics, { params });
  }

  getAppointments(params?: {
    page?: number;
    size?: number;
    userId?: number;
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
    if (params?.userId !== undefined) {
      httpParams = httpParams.set('userId', params.userId);
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
    return this.http.get<PageResponse<Appointment>>(API_ENDPOINTS.admin.appointments, { params: httpParams });
  }

  updateAppointmentStatus(id: number, status: AppointmentStatus): Observable<Appointment> {
    return this.http.patch<Appointment>(`${API_ENDPOINTS.admin.appointments}/${id}/status`, { status });
  }

  getAppointmentHistory(id: number): Observable<AppointmentAudit[]> {
    return this.http.get<AppointmentAudit[]>(`${API_ENDPOINTS.admin.appointments}/${id}/history`);
  }

  getNotifications(page = 0, size = 10): Observable<PageResponse<AppNotification>> {
    return this.http.get<PageResponse<AppNotification>>(API_ENDPOINTS.admin.notifications, {
      params: new HttpParams().set('page', page).set('size', size),
    });
  }
}
