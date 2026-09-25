import { Routes, UrlMatcher } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role.guard';
import { MainLayout } from './layouts/main-layout/main-layout';

const privateRouteMatcher: UrlMatcher = (segments) => (segments.length === 0 ? null : { consumed: [] });

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'verify-appointment',
    loadComponent: () => import('./features/verify-appointment/verify-appointment').then((m) => m.VerifyAppointment),
  },
  {
    matcher: privateRouteMatcher,
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'appointments',
        pathMatch: 'full',
        loadComponent: () => import('./features/appointments/appointments').then((m) => m.Appointments),
      },
      {
        path: 'appointments/new',
        loadComponent: () => import('./features/appointment-new/appointment-new').then((m) => m.AppointmentNew),
      },
      {
        path: 'appointments/history',
        loadComponent: () => import('./features/appointment-history/appointment-history').then((m) => m.AppointmentHistory),
      },
      {
        path: 'availability',
        loadComponent: () => import('./features/availability/availability').then((m) => m.Availability),
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/notifications').then((m) => m.Notifications),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
      },
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () => import('./features/admin/admin').then((m) => m.Admin),
      },
      {
        path: 'admin/appointments',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () => import('./features/admin-appointments/admin-appointments').then((m) => m.AdminAppointments),
      },
      {
        path: 'admin/appointments/history',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'], history: true },
        loadComponent: () => import('./features/admin-appointments/admin-appointments').then((m) => m.AdminAppointments),
      },
      {
        path: 'admin/users',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        loadComponent: () => import('./features/users/users').then((m) => m.Users),
      },
      { path: 'users', redirectTo: 'admin/users' },
      {
        path: 'forbidden',
        loadComponent: () => import('./features/forbidden/forbidden').then((m) => m.Forbidden),
      },
      {
        path: 'not-found',
        loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'not-found',
  },
];
