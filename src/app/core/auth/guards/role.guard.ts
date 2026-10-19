import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router
} from '@angular/router';

import { AuthFacade } from '../facades/auth.facade';
import { UserRole } from '../models/auth.model';

export const roleGuard: CanActivateFn = (route) => {
  const authFacade = inject(AuthFacade);
  const router = inject(Router);

  const currentUser = authFacade.currentUser();

  // Chưa đăng nhập: chuyển đến login.
  if (!currentUser) {
    return router.createUrlTree(['/login']);
  }

  // Danh sách role được phép truy cập route.
  const allowedRoles = route.data['roles'] as UserRole[] | undefined;

  // Route không khai báo roles thì không giới hạn role.
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  // Kiểm tra role của người dùng.
  if (allowedRoles.includes(currentUser.role)) {
    return true;
  }

  // Không đủ quyền.
  return router.createUrlTree(['/forbidden']);
};
