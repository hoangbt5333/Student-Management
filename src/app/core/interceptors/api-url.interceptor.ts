import { InjectionToken, inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => 'http://localhost:3001'
});

export const apiUrlInterceptor: HttpInterceptorFn = (req, next) => {
  // If the request URL is already absolute (starts with http://, https://, or //), pass it through unchanged
  if (/^(https?:|\/\/)/i.test(req.url)) {
    return next(req);
  }

  const baseUrl = inject(API_BASE_URL);
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const cleanPath = req.url.startsWith('/') ? req.url : `/${req.url}`;
  const resolvedUrl = `${cleanBaseUrl}${cleanPath}`;

  const clonedReq = req.clone({
    url: resolvedUrl
  });

  return next(clonedReq);
};
