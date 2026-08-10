import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { isJwtExpired } from '../auth/jwt';
import { AppRole, hasAnyRole } from '../auth/roles';
import { AuthResponse, LoginCredentials, User } from '../models/auth.models';
import { TokenStorage } from './token-storage';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenStorage = inject(TokenStorage);
  private readonly tokenSignal = signal<string | null>(this.tokenStorage.getToken());
  private readonly userSignal = signal<User | null>(this.tokenStorage.getUser());

  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.tokenSignal()) && !isJwtExpired(this.tokenSignal()));
  readonly displayName = computed(() => {
    const user = this.userSignal();

    if (!user) {
      return '';
    }

    return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
  });

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(API_ENDPOINTS.auth.login, credentials).pipe(
      tap((response) => {
        const user = this.mapAuthResponseToUser(response);

        this.tokenStorage.setToken(response.token);
        this.tokenStorage.setUser(user);
        this.tokenSignal.set(response.token);
        this.userSignal.set(user);
      }),
    );
  }

  loadCurrentUser(): Observable<User> {
    return this.http.get<User>(API_ENDPOINTS.auth.me).pipe(
      tap((user) => {
        this.tokenStorage.setUser(user);
        this.userSignal.set(user);
      }),
    );
  }

  logout(options?: { sessionExpired?: boolean }): void {
    this.tokenStorage.clear();
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    void this.router.navigate(['/login'], {
      queryParams: options?.sessionExpired ? { sessionExpired: 'true' } : undefined,
    });
  }

  getAccessToken(): string | null {
    const token = this.tokenSignal();

    return isJwtExpired(token) ? null : token;
  }

  hasStoredToken(): boolean {
    return Boolean(this.tokenSignal());
  }

  clearSession(): void {
    this.tokenStorage.clear();
    this.tokenSignal.set(null);
    this.userSignal.set(null);
  }

  updateCurrentUser(user: User): void {
    this.tokenStorage.setUser(user);
    this.userSignal.set(user);
  }

  hasAnyRole(allowedRoles: AppRole[]): boolean {
    const user = this.userSignal();

    return user ? hasAnyRole(user.roles, allowedRoles) : false;
  }

  private mapAuthResponseToUser(response: AuthResponse): User {
    return {
      id: response.id,
      email: response.email,
      firstName: response.firstName,
      lastName: response.lastName,
      roles: response.roles,
    };
  }
}
