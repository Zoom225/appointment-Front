import { API_BASE_URL } from './api.config';

export const API_ENDPOINTS = {
  auth: {
    login: `${API_BASE_URL}/auth/login`,
    me: `${API_BASE_URL}/auth/me`,
  },
  appointments: `${API_BASE_URL}/appointments`,
  users: `${API_BASE_URL}/users`,
  profile: `${API_BASE_URL}/profile`,
} as const;
