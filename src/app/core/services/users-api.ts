import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { PageResponse } from '../models/api.models';
import { AppUser, BackendUser } from '../models/user.models';

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly http = inject(HttpClient);

  findAll(params?: { page?: number; size?: number; query?: string; role?: string }): Observable<PageResponse<AppUser>> {
    let httpParams = new HttpParams();

    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', params.page);
    }
    if (params?.size !== undefined) {
      httpParams = httpParams.set('size', params.size);
    }
    if (params?.query) {
      httpParams = httpParams.set('query', params.query);
    }
    if (params?.role) {
      httpParams = httpParams.set('role', params.role);
    }

    return this.http.get<PageResponse<AppUser>>(API_ENDPOINTS.admin.users, { params: httpParams });
  }

  findById(id: number): Observable<BackendUser> {
    return this.http.get<BackendUser>(`${API_ENDPOINTS.admin.users}/${id}`);
  }
}
