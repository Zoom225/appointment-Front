import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { PageResponse } from '../models/api.models';
import { AppNotification, NotificationQuery } from '../models/notification.models';
import { DemoModeService } from '../demo/demo-mode.service';
import { DemoDataService } from '../demo/demo-data.service';

@Injectable({ providedIn: 'root' })
export class NotificationsApi {
  private readonly http = inject(HttpClient);
  private readonly mode = inject(DemoModeService);
  private readonly demo = inject(DemoDataService);

  findAll(query?: NotificationQuery): Observable<PageResponse<AppNotification>> {
    if (this.mode.isDemo()) return this.demo.findNotifications(query);
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
    if (this.mode.isDemo()) return this.demo.markAsRead(id);
    return this.http.patch<AppNotification>(`${API_ENDPOINTS.notifications}/${id}/read`, {});
  }
}
