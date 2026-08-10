export type UserRole = 'admin' | 'staff' | 'user';

export interface AppUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
}
