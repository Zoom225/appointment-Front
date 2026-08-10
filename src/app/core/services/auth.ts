import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, LoginCredentials, User } from '../models/auth.models';
import { TokenStorage } from './token-storage';

const API_URL = 'https://ton-backend-render.example.com/api';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenStorage = inject(TokenStorage);
  private readonly userSignal = signal<User | null>(null);

  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.tokenStorage.getToken()));

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/login`, credentials).pipe(
      tap((response) => {
        this.tokenStorage.setToken(response.accessToken);
        this.userSignal.set(response.user);
      }),
    );
  }

  logout(): void {
    this.tokenStorage.clear();
    this.userSignal.set(null);
    void this.router.navigateByUrl('/login');
  }

  getAccessToken(): string | null {
    return this.tokenStorage.getToken();
  }
}
