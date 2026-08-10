import { AppRole } from '../../core/auth/roles';

export interface NavigationItem {
  label: string;
  route: string;
  roles?: AppRole[];
}

export const MAIN_NAVIGATION: NavigationItem[] = [
  {
    label: 'Tableau de bord',
    route: '/dashboard',
  },
  {
    label: 'Rendez-vous',
    route: '/appointments',
  },
  {
    label: 'Utilisateurs',
    route: '/users',
    roles: ['ADMIN'],
  },
  {
    label: 'Profil',
    route: '/profile',
  },
];
