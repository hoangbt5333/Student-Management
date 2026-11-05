import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

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
  email?: string;
  role: UserRole;
  status?: 'active' | 'locked' | 'inactive';
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

        if (account.status === 'locked') {
          throw new Error('Tài khoản đã bị khóa. Vui lòng liên hệ Quản trị viên để được hỗ trợ.');
        }

        if (account.status === 'inactive') {
          throw new Error('Tài khoản đã bị vô hiệu hóa.');
        }

        return {
          id: account.id,
          username: account.username,
          displayName: account.displayName,
          email: account.email,
          role: account.role,
          status: account.status ?? 'active',
          studentId: account.studentId,
          teacherId: account.teacherId
        };
      })
    );
  }
}
