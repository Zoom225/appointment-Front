import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { API_BASE_URL } from '../api/api.config';
import { DemoModeService } from './demo-mode.service';

/** Fail closed if a future feature accidentally tries to use the API in demo mode. */
export const demoNetworkInterceptor: HttpInterceptorFn = (request, next) => {
  const demoMode = inject(DemoModeService);
  const isApprovedDemoFunction = request.url === '/api/demo/send-confirmation';
  const isBackendRequest = !isApprovedDemoFunction &&
    (request.url.startsWith(API_BASE_URL) || /^\/?api(?:\/|$)/.test(request.url));

  if (demoMode.isDemo() && isBackendRequest) {
    return throwError(() => new HttpErrorResponse({
      status: 403,
      statusText: 'Local demo only',
      url: request.url,
      error: { message: 'Mode démo : cette opération réseau est désactivée.' },
    }));
  }

  return next(request);
};
