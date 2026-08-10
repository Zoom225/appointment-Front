import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { UpdateProfilePayload, User } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class ProfileApi {
  private readonly http = inject(HttpClient);

  getProfile(): Observable<User> {
    return this.http.get<User>(API_ENDPOINTS.profile);
  }

  updateProfile(payload: UpdateProfilePayload): Observable<User> {
    return this.http.patch<User>(API_ENDPOINTS.profile, payload);
  }
}
