import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { PageResponse } from '../models/api.models';
import { AppNotification, NotificationQuery } from '../models/notification.models';

@Injectable({ providedIn: 'root' })
export class NotificationsApi {
  private readonly http = inject(HttpClient);

  findAll(query?: NotificationQuery): Observable<PageResponse<AppNotification>> {
    let params = new HttpParams();

    if (query?.page !== undefined) {
      params = params.set('page', query.page);
    }
    if (query?.size !== undefined) {
      params = params.set('size', query.size);
    }
    if (query?.unreadOnly !== undefined) {
      params = params.set('unreadOnly', query.unreadOnly);
    }
    if (query?.type) {
      params = params.set('type', query.type);
    }

    return this.http.get<PageResponse<AppNotification>>(API_ENDPOINTS.notifications, { params });
  }

  markAsRead(id: number): Observable<AppNotification> {
    return this.http.patch<AppNotification>(`${API_ENDPOINTS.notifications}/${id}/read`, {});
  }
}
