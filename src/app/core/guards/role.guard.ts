import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppRole, hasAnyRole } from '../auth/roles';
import { Auth } from '../services/auth';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const allowedRoles = route.data['roles'] as AppRole[] | undefined;

  if (!allowedRoles?.length) {
    return true;
  }

  const user = auth.user();

  return user && hasAnyRole(user.roles, allowedRoles) ? true : router.createUrlTree(['/forbidden']);
};
