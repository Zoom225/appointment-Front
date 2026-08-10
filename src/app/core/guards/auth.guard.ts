import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';
import { SessionFeedback } from '../services/session-feedback';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const sessionFeedback = inject(SessionFeedback);

  if (auth.isAuthenticated()) {
    return true;
  }

  const hadStoredToken = auth.hasStoredToken();
  auth.clearSession();

  if (hadStoredToken) {
    sessionFeedback.setSessionExpired();
  }

  return router.createUrlTree(['/login'], {
    queryParams: {
      returnUrl: router.url,
      ...(hadStoredToken ? { sessionExpired: 'true' } : {}),
    },
  });
};
