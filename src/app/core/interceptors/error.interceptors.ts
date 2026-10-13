import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        switch (error.status) {
          case 0:
            console.error(
              'Không thể kết nối đến server.',
              error
            );
            break;

          case 400:
            console.error('Request không hợp lệ.', error);
            break;

          case 401:
            console.error('Cần xác thực người dùng.', error);
            break;

          case 403:
            console.error('Bạn không có quyền truy cập.', error);
            break;

          case 404:
            console.error('Không tìm thấy tài nguyên.', error);
            break;

          default:
            if (error.status >= 500) {
              console.error('Lỗi phía server.', error);
            } else {
              console.error('Lỗi HTTP:', error.status, error);
            }
        }
      }

      return throwError(() => error);
    })
  );
};