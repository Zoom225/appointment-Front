import { Injectable } from '@angular/core';
import { User } from '../models/auth.models';

const ACCESS_TOKEN_KEY = 'rendez_vous_access_token';
const CURRENT_USER_KEY = 'rendez_vous_current_user';

@Injectable({ providedIn: 'root' })
export class TokenStorage {
  getToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }

  getUser(): User | null {
    const rawUser = localStorage.getItem(CURRENT_USER_KEY);

    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as User;
    } catch {
      localStorage.removeItem(CURRENT_USER_KEY);
      return null;
    }
  }

  setUser(user: User): void {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  }

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}
