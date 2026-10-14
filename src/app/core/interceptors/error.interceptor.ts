import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { inject } from '@angular/core';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notification = inject(NotificationService);
  
  return next(req).pipe(
    catchError((error: unknown) => {
      let message = 'Đã xảy ra lỗi. Vui lòng thử lại';

      if (error instanceof HttpErrorResponse) {
        switch (error.status) {
          case 0:
            console.error(
              'Không thể kết nối đến server.',
              error
            );
            message = 'Không thể kết nối đến máy chủ. Hãy kiểm tra API';
            break;

          case 400:
            console.error('Request không hợp lệ.', error);
            message = 'Kiểm tra dữ liệu gửi đi.';
            break;

          case 401:
            console.error('Cần xác thực người dùng.', error);
            message = 'Bạn cần đăng nhập để tiếp tục.';
            break;

          case 403:
            console.error('Bạn không có quyền truy cập.', error);
            message = 'Bạn không có quyền thực hiện ';
            break;

          case 404:
            console.error('Không tìm thấy tài nguyên.', error);
            message = 'Không tìm thấy dữ liệu.';
            break;

          default:
            if (error.status >= 500) {
              console.error('Lỗi phía server.', error);
              message = 'Máy chủ đang gặp sự cố. Hãy thử lại.';
            } else {
              console.error('Lỗi HTTP:', error.status, error);
              message = 'Lỗi HTTP';
            }
        }
      }

      notification.showError(message);

      return throwError(() => error);
    })
  );
};