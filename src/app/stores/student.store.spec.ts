
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';

import { StudentStore } from './student.store';
import { Student } from '../services/student';

describe('StudentStore', () => {
  let store: InstanceType<typeof StudentStore>;
  let httpMock: HttpTestingController;

  const mockStudents: Student[] = [
    {
      id: 'SV001',
      name: 'Nguyen Van A',
      email: 'a@example.com',
      phone: '0900000001'
    },
    {
      id: 'SV002',
      name: 'Tran Thi B',
      email: 'b@example.com',
      phone: '0900000002'
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        StudentStore
      ]
    });

    store = TestBed.inject(StudentStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should load students successfully', () => {
    store.loadStudents();

    const request = httpMock.expectOne(
      'http://localhost:3000/students'
    );

    expect(request.request.method).toBe('GET');

    request.flush(mockStudents);

    expect(store.students()).toEqual(mockStudents);
    expect(store.loading()).toBe(false);
    expect(store.errorMessage()).toBe('');
  });

  it('should handle load students error', () => {
    store.loadStudents();

    const request = httpMock.expectOne(
      'http://localhost:3000/students'
    );

    request.flush('Server error', {
      status: 500,
      statusText: 'Internal Server Error'
    });

    expect(store.loading()).toBe(false);
    expect(store.errorMessage()).toBe(
      'Không thể tải danh sách sinh viên.'
    );
  });

  it('should add a student and reload the list', () => {
    const newStudent: Student = {
      id: 'SV003',
      name: 'Le Van C',
      email: 'c@example.com',
      phone: '0900000003'
    };

    store.saveStudent({
      student: newStudent,
      mode: 'add'
    });

    const postRequest = httpMock.expectOne(
      'http://localhost:3000/students'
    );

    expect(postRequest.request.method).toBe('POST');
    expect(postRequest.request.body).toEqual(newStudent);

    postRequest.flush(newStudent);

    const getRequest = httpMock.expectOne(
      'http://localhost:3000/students'
    );

    expect(getRequest.request.method).toBe('GET');

    getRequest.flush([...mockStudents, newStudent]);

    expect(store.students()).toEqual([
      ...mockStudents,
      newStudent
    ]);

    expect(store.successMessage()).toBe(
      'Thêm sinh viên thành công.'
    );

    expect(store.errorMessage()).toBe('');
    expect(store.loading()).toBe(false);
  });
});
