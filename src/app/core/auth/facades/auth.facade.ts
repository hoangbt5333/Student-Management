import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthStore } from '../store/auth.store';
import { LoginCredentials } from '../models/auth.model';

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
}