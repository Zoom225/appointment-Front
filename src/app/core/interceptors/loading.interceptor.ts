import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { API_BASE_URL } from '../api/api.config';
import { Loading } from '../services/loading';

export const loadingInterceptor: HttpInterceptorFn = (request, next) => {
  const loading = inject(Loading);
  const isApiRequest = request.url.startsWith(API_BASE_URL);

  if (!isApiRequest) {
    return next(request);
  }

  loading.start();

  return next(request).pipe(finalize(() => loading.stop()));
};
