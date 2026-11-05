import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('authenticates a user from the users collection and maps teacherId', () => {
    let result: unknown;
    service.login({
      username: 'gv001',
      password: 'Gv123456!'
    }).subscribe(user => {
      result = user;
    });

    const request = httpMock.expectOne('http://localhost:3001/users');
    expect(request.request.method).toBe('GET');
    request.flush([
      {
        id: 'USR002',
        username: 'gv001',
        password: 'Gv123456!',
        displayName: 'Nguyễn Văn Giảng',
        role: 'teacher',
        status: 'active',
        teacherId: 'GV001'
      }
    ]);

    expect(result).toEqual({
      id: 'USR002',
      username: 'gv001',
      displayName: 'Nguyễn Văn Giảng',
      email: undefined,
      role: 'teacher',
      status: 'active',
      teacherId: 'GV001'
    });
  });

  it('throws an error when an account is locked', () => {
    let errorResult: Error | undefined;
    let nextCalled = false;

    service.login({
      username: 'locked_user',
      password: 'Pass123456!'
    }).subscribe({
      next: () => {
        nextCalled = true;
      },
      error: (err) => {
        errorResult = err;
      }
    });

    const request = httpMock.expectOne('http://localhost:3001/users');
    request.flush([
      {
        id: 'USR999',
        username: 'locked_user',
        password: 'Pass123456!',
        displayName: 'Tài khoản bị khóa',
        role: 'student',
        status: 'locked',
        studentId: 'SV001'
      }
    ]);

    expect(nextCalled).toBe(false);
    expect(errorResult?.message).toContain('Tài khoản đã bị khóa');
  });

  it('throws an error when an account is inactive', () => {
    let errorResult: Error | undefined;
    let nextCalled = false;

    service.login({
      username: 'inactive_user',
      password: 'Pass123456!'
    }).subscribe({
      next: () => {
        nextCalled = true;
      },
      error: (err) => {
        errorResult = err;
      }
    });

    const request = httpMock.expectOne('http://localhost:3001/users');
    request.flush([
      {
        id: 'USR998',
        username: 'inactive_user',
        password: 'Pass123456!',
        displayName: 'Tài khoản vô hiệu',
        role: 'teacher',
        status: 'inactive',
        teacherId: 'GV001'
      }
    ]);

    expect(nextCalled).toBe(false);
    expect(errorResult?.message).toContain('Tài khoản đã bị vô hiệu hóa');
  });
});
