import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, defer, tap } from 'rxjs';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { isJwtExpired } from '../auth/jwt';
import { AppRole, hasAnyRole } from '../auth/roles';
import { AuthResponse, LoginCredentials, User } from '../models/auth.models';
import { SessionFeedback } from './session-feedback';
import { TokenStorage } from './token-storage';
import { DemoModeService, DemoRole } from '../demo/demo-mode.service';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sessionFeedback = inject(SessionFeedback);
  private readonly tokenStorage = inject(TokenStorage);
  private readonly demoMode = inject(DemoModeService);
  private readonly tokenSignal = signal<string | null>(this.tokenStorage.getToken());
  private readonly userSignal = signal<User | null>(this.tokenStorage.getUser());

  readonly isDemo = this.demoMode.isDemo;
  readonly user = computed(() => this.isDemo() ? this.demoMode.user() : this.userSignal());
  readonly token = computed(() => this.isDemo() ? null : this.tokenSignal());
  readonly isAuthenticated = computed(() => this.isDemo()
    ? Boolean(this.demoMode.user())
    : Boolean(this.getAccessToken()) && Boolean(this.userSignal()));
  readonly sessionKind = computed(() => this.isAuthenticated() ? (this.isDemo() ? 'DEMO' : 'REAL') : null);
  readonly roles = computed(() => this.user()?.roles ?? []);
  readonly displayName = computed(() => {
    const user = this.user();

    if (!user) {
      return '';
    }

    return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
  });

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return defer(() => {
      // Submitting the real login form explicitly leaves the local demo.
      if (this.isDemo()) this.clearSession();
      return this.http.post<AuthResponse>(API_ENDPOINTS.auth.login, credentials);
    }).pipe(
      tap((response) => {
        const user = this.mapAuthResponseToUser(response);
        this.tokenStorage.setToken(response.token);
        this.tokenStorage.setUser(user);
        this.tokenSignal.set(response.token);
        this.userSignal.set(user);
      }),
    );
  }

  startDemo(role: DemoRole): void {
    this.sessionFeedback.clear();
    this.demoMode.activate(role);
    void this.router.navigateByUrl(role === 'ADMIN' ? '/admin' : '/dashboard');
  }

  resetDemo(): void {
    this.demoMode.resetDemo();
  }

  logout(options?: { sessionExpired?: boolean; redirect?: boolean }): void {
    const wasDemo = this.isDemo();
    this.clearSession();

    if (options?.sessionExpired) {
      this.sessionFeedback.setSessionExpired();
    } else {
      this.sessionFeedback.clear();
    }

    if (options?.redirect !== false) {
      if (wasDemo) {
        void this.router.navigateByUrl('/');
        return;
      }
      void this.router.navigate(['/login'], {
        queryParams: options?.sessionExpired ? { sessionExpired: 'true' } : undefined,
      });
    }
  }

  getAccessToken(): string | null {
    if (this.isDemo()) return null;
    const token = this.tokenSignal();

    if (!token || isJwtExpired(token)) {
      return null;
    }

    return token;
  }

  hasStoredToken(): boolean {
    return !this.isDemo() && Boolean(this.tokenSignal());
  }

  clearSession(): void {
    if (this.isDemo()) {
      this.demoMode.exit();
      // Do not silently resume another identity when leaving the demo.
      // Persisted real credentials are left untouched.
      this.tokenSignal.set(null);
      this.userSignal.set(null);
      return;
    }
    this.tokenStorage.clear();
    this.tokenSignal.set(null);
    this.userSignal.set(null);
  }

  updateCurrentUser(user: User): void {
    if (this.isDemo()) return;
    this.tokenStorage.setUser(user);
    this.userSignal.set(user);
  }

  hasAnyRole(allowedRoles: AppRole[]): boolean {
    return hasAnyRole(this.roles(), allowedRoles);
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
