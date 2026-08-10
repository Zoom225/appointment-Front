export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  message?: string;
  roles: string[];
  token: string;
}

export interface UpdateProfilePayload {
  firstName: string;
  lastName: string;
}
