import { AppRole } from '../../core/auth/roles';

export interface NavigationItem {
  label: string;
  route: string;
  roles?: AppRole[];
}

export const MAIN_NAVIGATION: NavigationItem[] = [
  { label: 'Tableau de bord', route: '/dashboard' },
  { label: 'Mes rendez-vous', route: '/appointments' },
  { label: 'Disponibilités', route: '/availability' },
  { label: 'Notifications', route: '/notifications' },
  { label: 'Profil', route: '/profile' },
  { label: 'Administration', route: '/admin', roles: ['ADMIN'] },
  { label: 'Utilisateurs', route: '/users', roles: ['ADMIN'] },
];
