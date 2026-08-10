export type UserRole = 'admin' | 'staff' | 'user';

export interface BackendUser {
  id?: string | number;
  _id?: string;
  email?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  role?: string;
  roles?: string[];
  isActive?: boolean;
  active?: boolean;
  enabled?: boolean;
}

export interface AppUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
}
