
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthFacade } from '../facades/auth.facade';

export const authGuard: CanActivateFn = (route, state) => {
  const authFacade = inject(AuthFacade);
  const router = inject(Router);

  // Đã đăng nhập thì cho phép truy cập.
  if (authFacade.isAuthenticated()) {
    return true;
  }

  // Chưa đăng nhập thì chuyển đến trang login.
  // Lưu lại URL người dùng muốn truy cập.
  return router.createUrlTree(['/login'], {
    queryParams: {
      returnUrl: state.url
    }
  });
};
