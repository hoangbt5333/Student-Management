import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthStore } from '../store/auth.store';
import { LoginCredentials, UserRole, AppPermission } from '../models/auth.model';
import { App } from '../../../app';

@Injectable({
  providedIn: 'root'
})
export class AuthFacade {
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);

  readonly currentUser = this.store.currentUser;
  readonly isAuthenticated = this.store.isAuthenticated;
  readonly role = this.store.role;
  readonly loading = this.store.loading;
  readonly errorMessage = this.store.errorMessage;

  login(credentials: LoginCredentials): void {
    this.store.login(credentials);
  }

  logout(): void {
    this.store.logout();
    void this.router.navigateByUrl('/login');
  }

  clearError(): void {
    this.store.clearError();
  }

  can(permission: AppPermission): boolean {
    const currentRole = this.role();
    if (!currentRole) {
        return false;
    }
    return ROLE_PERMISSIONS[currentRole].includes(permission);
  }
}

const ROLE_PERMISSIONS: Record<UserRole, AppPermission[]> = {
  admin: [
    'view-students',
    'manage-students',
    'view-classes',
    'manage-classes',
    'view-teachers',
    'manage-teachers',
    'view-subjects',
    'manage-subjects',
    'view-grades',
    'manage-grades',
    'manage-users'
  ],

  teacher: [
    'view-students',
    'view-classes',
    'view-teachers',
    'view-subjects',
    'view-grades',
    'manage-grades'
  ],

  student: [
    'view-students',
    'view-classes',
    'view-subjects',
    'view-teachers'
  ]
};
