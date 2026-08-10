import { Injectable } from '@angular/core';

const ACCESS_TOKEN_KEY = 'rendez_vous_access_token';

@Injectable({ providedIn: 'root' })
export class TokenStorage {
  getToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}
