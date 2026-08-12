import { AppRole } from '../../core/auth/roles';

export interface NavigationItem {
  label: string;
  route: string;
  icon: string;
  roles?: AppRole[];
}

export const MAIN_NAVIGATION: NavigationItem[] = [
  { label: 'Tableau de bord', route: '/dashboard', icon: '⌂' },
  { label: 'Mes rendez-vous', route: '/appointments', icon: '◷' },
  { label: 'Disponibilités', route: '/availability', icon: '□' },
  { label: 'Notifications', route: '/notifications', icon: '◦' },
  { label: 'Profil', route: '/profile', icon: '◎' },
  { label: 'Administration', route: '/admin', icon: '◆', roles: ['ADMIN'] },
  { label: 'Utilisateurs', route: '/users', icon: '◇', roles: ['ADMIN'] },
];
