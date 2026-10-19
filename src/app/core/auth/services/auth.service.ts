import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, throwError } from 'rxjs';

import {
  AuthUser,
  LoginCredentials,
  UserRole
} from '../models/auth.model';

interface DemoAccount {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
  studentId?: string;
  teacherId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3001/users';

  login(credentials: LoginCredentials): Observable<AuthUser> {
    return this.http.get<DemoAccount[]>(this.apiUrl).pipe(
      map(accounts => {
        const account = accounts.find(item =>
          item.username === credentials.username.trim() &&
          item.password === credentials.password
        );

        if (!account) {
          throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác.');
        }

        return {
          id: account.id,
          username: account.username,
          displayName: account.displayName,
          role: account.role,
          studentId: account.studentId,
          teacherId: account.teacherId
        };
      })
    );
  }
}