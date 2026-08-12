import { API_BASE_URL } from './api.config';

export const API_ENDPOINTS = {
  auth: {
    login: `${API_BASE_URL}/api/auth/login`,
  },
  appointments: `${API_BASE_URL}/api/appointments`,
  notifications: `${API_BASE_URL}/api/notifications`,
  users: `${API_BASE_URL}/api/users`,
  admin: {
    appointments: `${API_BASE_URL}/api/admin/appointments`,
    notifications: `${API_BASE_URL}/api/admin/notifications`,
    statistics: `${API_BASE_URL}/api/admin/statistics`,
    users: `${API_BASE_URL}/api/admin/users`,
  },
} as const;
