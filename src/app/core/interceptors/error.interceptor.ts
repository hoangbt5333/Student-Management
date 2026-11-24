import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { InjectionToken, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, retry, throwError, timer } from 'rxjs';
import { AuthFacade } from '../auth/facades/auth.facade';
import { NotificationService } from '../services/notification.service';

export interface ErrorRetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  backoffFactor: number;
}

export const DEFAULT_ERROR_RETRY_CONFIG: ErrorRetryConfig = {
  maxRetries: 2,
  initialDelayMs: 1000,
  backoffFactor: 2
};

export const ERROR_RETRY_CONFIG = new InjectionToken<ErrorRetryConfig>(
  'ERROR_RETRY_CONFIG',
  {
    providedIn: 'root',
    factory: () => DEFAULT_ERROR_RETRY_CONFIG
  }
);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notification = inject(NotificationService, { optional: true });
  const authFacade = inject(AuthFacade, { optional: true });
  const router = inject(Router, { optional: true });
  const retryConfig =
    inject(ERROR_RETRY_CONFIG, { optional: true }) ?? DEFAULT_ERROR_RETRY_CONFIG;

  return next(req).pipe(
    retry({
      count: retryConfig.maxRetries,
      delay: (error: unknown, retryCount: number) => {
        const isNetworkOrServerError =
          error instanceof HttpErrorResponse &&
          (error.status === 0 || error.status >= 500);

        // Only retry idempotent GET requests on network (0) or server (5xx) errors
        if (req.method === 'GET' && isNetworkOrServerError) {
          const delayTime =
            retryConfig.initialDelayMs *
            Math.pow(retryConfig.backoffFactor, retryCount - 1);
          return timer(delayTime);
        }

        // Do not retry mutating requests (POST, PUT, PATCH, DELETE) or client errors (4xx)
        throw error;
      }
    }),
    catchError((error: unknown) => {
      let message = 'Đã xảy ra lỗi. Vui lòng thử lại';

      if (error instanceof HttpErrorResponse) {
        switch (error.status) {
          case 0:
            console.error('Không thể kết nối đến server.', error);
            message = 'Không thể kết nối đến máy chủ. Hãy kiểm tra API';
            break;

          case 400:
            console.error('Request không hợp lệ.', error);
            message = 'Kiểm tra dữ liệu gửi đi.';
            break;

          case 401:
            console.error('Cần xác thực người dùng.', error);
            message = 'Bạn cần đăng nhập để tiếp tục.';
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.removeItem('demo-auth-user');
            }
            if (authFacade) {
              authFacade.logout();
            } else if (router) {
              void router.navigateByUrl('/login');
            }
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

      if (notification) {
        notification.showError(message);
      }

      return throwError(() => error);
    })
  );
};
