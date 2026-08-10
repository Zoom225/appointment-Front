import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { AppUser } from '../models/user.models';

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly http = inject(HttpClient);

  findAll(): Observable<AppUser[]> {
    return this.http.get<AppUser[]>(API_ENDPOINTS.users);
  }

  findById(id: string): Observable<AppUser> {
    return this.http.get<AppUser>(`${API_ENDPOINTS.users}/${id}`);
  }
}
