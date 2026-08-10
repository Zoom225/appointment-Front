import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppRole, hasAnyRole } from '../auth/roles';
import { Auth } from '../services/auth';
import { SessionFeedback } from '../services/session-feedback';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const sessionFeedback = inject(SessionFeedback);
  const allowedRoles = route.data['roles'] as AppRole[] | undefined;

  if (!allowedRoles?.length) {
    return true;
  }

  const user = auth.user();

  if (user && hasAnyRole(user.roles, allowedRoles)) {
    return true;
  }

  sessionFeedback.setAccessDenied();

  return router.createUrlTree(['/forbidden']);
};
