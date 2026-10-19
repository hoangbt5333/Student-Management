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
        teacherId: 'GV001'
      }
    ]);

    expect(result).toEqual({
      id: 'USR002',
      username: 'gv001',
      displayName: 'Nguyễn Văn Giảng',
      role: 'teacher',
      teacherId: 'GV001'
    });
  });
});
