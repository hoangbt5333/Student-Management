import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState
} from '@ngrx/signals';
import { finalize } from 'rxjs';

import { AuthService } from '../services/auth.service';
import {
  AuthUser,
  LoginCredentials
} from '../models/auth.model';

type AuthState = {
  currentUser: AuthUser | null;
  loading: boolean;
  errorMessage: string;
};

function getSavedUser(): AuthUser | null {
  try {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }

    const raw = sessionStorage.getItem('demo-auth-user');

    if (!raw) {
      return null;
    }

    const user: AuthUser = JSON.parse(raw);

    // Kiểm tra cấu trúc tối thiểu của dữ liệu đã lưu.
    if (
      !user.id ||
      !user.username ||
      !user.displayName ||
      !['admin', 'teacher', 'student'].includes(user.role)
    ) {
      sessionStorage.removeItem('demo-auth-user');
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

const initialState: AuthState = {
  currentUser: getSavedUser(),
  loading: false,
  errorMessage: ''
};

export const AuthStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  withComputed(({ currentUser }) => ({
    isAuthenticated: computed(() => currentUser() !== null),
    role: computed(() => currentUser()?.role ?? null)
  })),

  withMethods((store, authService = inject(AuthService)) => ({
    login(credentials: LoginCredentials): void {
      patchState(store, {
        loading: true,
        errorMessage: ''
      });

      authService.login(credentials)
        .pipe(
          finalize(() => {
            patchState(store, { loading: false });
          })
        )
        .subscribe({
          next: (user) => {
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem(
                'demo-auth-user',
                JSON.stringify(user)
              );
            }

            patchState(store, {
              currentUser: user,
              errorMessage: ''
            });
          },

          error: (error: unknown) => {
            const message =
              error instanceof Error
                ? error.message
                : 'Đăng nhập thất bại. Vui lòng thử lại.';

            patchState(store, {
              errorMessage: message
            });
          }
        });
    },

    logout(): void {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('demo-auth-user');
      }

      patchState(store, {
        currentUser: null,
        loading: false,
        errorMessage: ''
      });
    },

    clearError(): void {
      patchState(store, { errorMessage: '' });
    }
  }))
);