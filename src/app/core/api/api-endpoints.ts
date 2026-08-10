import { environment } from '../../../environments/environment';

export const API_ENDPOINTS = {
  auth: {
    login: `${environment.apiUrl}/auth/login`,
    me: `${environment.apiUrl}/auth/me`,
  },
  appointments: `${environment.apiUrl}/appointments`,
  users: `${environment.apiUrl}/users`,
  profile: `${environment.apiUrl}/profile`,
} as const;
