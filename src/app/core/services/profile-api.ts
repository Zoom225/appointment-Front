import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { User } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class ProfileApi {
  private readonly http = inject(HttpClient);

  getProfileById(userId: number): Observable<User> {
    return this.http.get<User>(`${API_ENDPOINTS.users}/${userId}`);
  }

  getProfileByEmail(email: string): Observable<User> {
    return this.http.get<User>(API_ENDPOINTS.users, {
      params: new HttpParams().set('email', email),
    });
  }
}
