export interface NavigationItem {
  label: string;
  route: string;
  icon: string;
  exact?: boolean;
}

export const USER_NAVIGATION: NavigationItem[] = [
  { label: 'Dashboard', route: '/dashboard', icon: '⌂' },
  { label: 'Prendre rendez-vous', route: '/appointments/new', icon: '+' },
  { label: 'Mes rendez-vous', route: '/appointments', icon: '◷', exact: true },
  { label: 'Historique', route: '/appointments/history', icon: '↺' },
  { label: 'Notifications', route: '/notifications', icon: '◦' },
  { label: 'Profil', route: '/profile', icon: '◎' },
];

export const ADMIN_NAVIGATION: NavigationItem[] = [
  { label: 'Dashboard', route: '/admin', icon: '⌂', exact: true },
  { label: 'Rendez-vous', route: '/admin/appointments', icon: '◷', exact: true },
  { label: 'Historique', route: '/admin/appointments/history', icon: '↺' },
  { label: 'Utilisateurs', route: '/admin/users', icon: '◇' },
  { label: 'Notifications', route: '/notifications', icon: '◦' },
  { label: 'Profil', route: '/profile', icon: '◎' },
];
