import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { API_BASE_URL } from '../api/api.config';
import { Auth } from '../services/auth';
import { SessionFeedback } from '../services/session-feedback';

const PUBLIC_FRONTEND_ROUTES = new Set(['/', '/login']);

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const sessionFeedback = inject(SessionFeedback);
  const token = auth.getAccessToken();
  const isApiRequest = request.url.startsWith(API_BASE_URL);
  const isLoginRequest = request.url === API_ENDPOINTS.auth.login;
  const authenticatedRequest = token && isApiRequest
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (!isApiRequest || !(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      const currentPath = router.url.split(/[?#]/, 1)[0] || '/';
      const isPublicRoute = PUBLIC_FRONTEND_ROUTES.has(currentPath);

      if (error.status === 401 && !isLoginRequest) {
        auth.logout({ sessionExpired: true, redirect: !isPublicRoute });
      } else if (error.status === 403 && !isLoginRequest && !isPublicRoute && currentPath !== '/forbidden') {
        sessionFeedback.setAccessDenied();
        void router.navigate(['/forbidden']);
      }

      return throwError(() => error);
    }),
  );
};
