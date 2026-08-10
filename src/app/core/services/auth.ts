import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { AuthResponse, LoginCredentials, User } from '../models/auth.models';
import { TokenStorage } from './token-storage';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenStorage = inject(TokenStorage);
  private readonly tokenSignal = signal<string | null>(this.tokenStorage.getToken());
  private readonly userSignal = signal<User | null>(null);

  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.tokenSignal()));

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(API_ENDPOINTS.auth.login, credentials).pipe(
      tap((response) => {
        this.tokenStorage.setToken(response.accessToken);
        this.tokenSignal.set(response.accessToken);
        this.userSignal.set(response.user);
      }),
    );
  }

  loadCurrentUser(): Observable<User> {
    return this.http.get<User>(API_ENDPOINTS.auth.me).pipe(
      tap((user) => {
        this.userSignal.set(user);
      }),
    );
  }

  logout(): void {
    this.tokenStorage.clear();
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    void this.router.navigateByUrl('/login');
  }

  getAccessToken(): string | null {
    return this.tokenSignal();
  }
}
