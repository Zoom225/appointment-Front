import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { unwrapCollection } from '../api/api-response';
import { AppUser, BackendUser, UserRole } from '../models/user.models';

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly http = inject(HttpClient);

  findAll(): Observable<AppUser[]> {
    return this.http
      .get<BackendUser[] | { data?: BackendUser[]; items?: BackendUser[]; results?: BackendUser[]; content?: BackendUser[] }>(
        API_ENDPOINTS.users,
      )
      .pipe(map((response) => unwrapCollection(response).map((user) => this.mapUser(user))));
  }

  findById(id: string): Observable<AppUser> {
    return this.http.get<BackendUser>(`${API_ENDPOINTS.users}/${id}`).pipe(map((user) => this.mapUser(user)));
  }

  updateStatus(id: string, isActive: boolean): Observable<AppUser> {
    return this.http
      .patch<BackendUser>(`${API_ENDPOINTS.users}/${id}`, { isActive })
      .pipe(map((user) => this.mapUser(user)));
  }

  private mapUser(user: BackendUser): AppUser {
    return {
      id: String(user.id ?? user._id ?? ''),
      email: user.email ?? '',
      firstName: user.firstName ?? user.first_name,
      lastName: user.lastName ?? user.last_name,
      role: this.mapRole(user.role ?? user.roles?.[0]),
      isActive: user.isActive ?? user.active ?? user.enabled ?? true,
    };
  }

  private mapRole(role: string | undefined): UserRole {
    if (role === 'admin' || role === 'staff' || role === 'user') {
      return role;
    }

    return 'user';
  }
}
