import { HttpInterceptorFn } from '@angular/common/http';

export const clientHeaderInterceptor: HttpInterceptorFn = (
  req,
  next
) => {
  const updatedRequest = req.clone({
    setHeaders: {
      'X-Client-Version': '1.0.0'
    }
  });

  return next(updatedRequest);
};