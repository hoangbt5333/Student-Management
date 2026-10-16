
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';

import { StudentStore } from './student.store';
import type { Student } from './models/student.model';

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

  it('should search, filter, sort, and paginate consistently', () => {
    const students: Student[] = Array.from({ length: 7 }, (_, index) => ({
      id: `SV00${index + 1}`,
      name: `Sinh viên ${index + 1}`,
      email: `student${index + 1}@example.com`,
      phone: `090000000${index + 1}`,
      className: index < 4 ? 'CTK42' : 'CTK43',
      faculty: index % 2 === 0 ? 'Công nghệ thông tin' : 'Toán'
    }));

    store.loadStudents();
    httpMock.expectOne('http://localhost:3000/students').flush(students);

    expect(store.pageStudents().map((student) => student.id)).toEqual([
      'SV001',
      'SV002',
      'SV003',
      'SV004',
      'SV005'
    ]);
    expect(store.totalPages()).toBe(2);

    store.setPage(2);
    expect(store.currentPage()).toBe(2);
    expect(store.pageStudents()).toHaveLength(2);

    store.setSearchTerm('cong nghe thong tin');
    expect(store.currentPage()).toBe(1);
    expect(store.filteredStudentCount()).toBe(4);

    store.setClassFilter('CTK42');
    store.setFacultyFilter('Công nghệ thông tin');
    expect(store.filteredStudents().map((student) => student.id)).toEqual([
      'SV001',
      'SV003'
    ]);

    store.setSortBy('id');
    store.setSortDirection('desc');
    expect(store.pageStudents().map((student) => student.id)).toEqual([
      'SV003',
      'SV001'
    ]);
  });

  it('should clamp the current page when refreshed data gets smaller', () => {
    const students: Student[] = Array.from({ length: 7 }, (_, index) => ({
      id: `SV00${index + 1}`,
      name: `Sinh viên ${index + 1}`,
      email: `student${index + 1}@example.com`,
      phone: `090000000${index + 1}`
    }));

    store.loadStudents();
    httpMock.expectOne('http://localhost:3000/students').flush(students);
    store.setPage(2);
    expect(store.currentPage()).toBe(2);

    store.loadStudents();
    httpMock.expectOne('http://localhost:3000/students').flush(students.slice(0, 3));

    expect(store.currentPage()).toBe(1);
    expect(store.pageStudents()).toHaveLength(3);
  });

  it('should clear filters whose values disappear after a data refresh', () => {
    const students: Student[] = [
      {
        id: 'SV001',
        name: 'Nguyen Van A',
        email: 'a@example.com',
        phone: '0900000001',
        className: 'CTK42',
        faculty: 'Công nghệ thông tin'
      }
    ];

    store.loadStudents();
    httpMock.expectOne('http://localhost:3000/students').flush(students);
    store.setClassFilter('CTK42');
    store.setFacultyFilter('Công nghệ thông tin');

    store.loadStudents();
    httpMock.expectOne('http://localhost:3000/students').flush([{
      ...students[0],
      className: 'CTK43',
      faculty: 'Toán'
    }]);

    expect(store.classFilter()).toBe('');
    expect(store.facultyFilter()).toBe('');
    expect(store.filteredStudents()).toHaveLength(1);
  });
});
