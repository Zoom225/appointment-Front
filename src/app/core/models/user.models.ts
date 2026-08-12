export type UserRole = 'ROLE_ADMIN' | 'ROLE_USER';

export interface BackendUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface AppUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}
