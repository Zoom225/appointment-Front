import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { User } from '../models/auth.models';
import { DemoModeService } from '../demo/demo-mode.service';
import { DemoDataService } from '../demo/demo-data.service';

@Injectable({ providedIn: 'root' })
export class ProfileApi {
  private readonly http = inject(HttpClient);
  private readonly mode = inject(DemoModeService);
  private readonly demo = inject(DemoDataService);

  getProfileById(userId: number): Observable<User> {
    if (this.mode.isDemo()) return this.demo.getProfileById(userId);
    return this.http.get<User>(`${API_ENDPOINTS.users}/${userId}`);
  }

  getProfileByEmail(email: string): Observable<User> {
    if (this.mode.isDemo()) return this.demo.getProfileByEmail(email);
    return this.http.get<User>(API_ENDPOINTS.users, {
      params: new HttpParams().set('email', email),
    });
  }
}
