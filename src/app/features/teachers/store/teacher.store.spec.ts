import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';

import { TeacherStore } from './teacher.store';
import type { Teacher } from '../models/teacher.model';

describe('TeacherStore', () => {
  let store: InstanceType<typeof TeacherStore>;
  let httpMock: HttpTestingController;

  const mockTeachers: Teacher[] = [
    {
      id: 'GV001',
      code: 'GV001',
      name: 'Nguyễn Văn Đạt',
      email: 'dat.nguyen@university.edu.vn',
      department: 'Công nghệ thông tin'
    },
    {
      id: 'GV002',
      code: 'GV002',
      name: 'Trần Thị Thu Thảo',
      email: 'thao.tran@university.edu.vn',
      department: 'Điện tử viễn thông'
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TeacherStore
      ]
    });

    store = TestBed.inject(TeacherStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should load teachers successfully', () => {
    store.loadTeachers();

    const req = httpMock.expectOne('http://localhost:3001/teachers');
    expect(req.request.method).toBe('GET');
    req.flush(mockTeachers);

    expect(store.teachers()).toEqual(mockTeachers);
    expect(store.teacherCount()).toBe(2);
    expect(store.loading()).toBe(false);
    expect(store.errorMessage()).toBe('');
  });

  it('should paginate teachers and reset to the first page when the search changes', () => {
    const teachers = Array.from({ length: 12 }, (_, index) => ({
      id: `GV${String(index + 1).padStart(3, '0')}`,
      code: `GV${String(index + 1).padStart(3, '0')}`,
      name: `Giảng viên ${index + 1}`,
      email: `teacher${index + 1}@university.edu.vn`,
      department: index < 2 ? 'Công nghệ thông tin' : 'Toán'
    }));

    store.loadTeachers();
    httpMock.expectOne('http://localhost:3001/teachers').flush(teachers);

    expect(store.pageTeachers()).toHaveLength(5);
    expect(store.totalPages()).toBe(3);

    store.setPage(2);
    expect(store.currentPage()).toBe(2);
    expect(store.pageTeachers()).toHaveLength(5);

    store.setPage(3);
    expect(store.currentPage()).toBe(3);
    expect(store.pageTeachers()).toHaveLength(2);

    store.setSearchTerm('cong nghe thong tin');
    expect(store.currentPage()).toBe(1);
    expect(store.pageTeachers()).toHaveLength(2);
    expect(store.filteredTeacherCount()).toBe(2);
  });

  it('should update page size and clamp invalid page requests', () => {
    store.loadTeachers();
    httpMock.expectOne('http://localhost:3001/teachers').flush(mockTeachers);

    store.setPage(20);
    expect(store.currentPage()).toBe(1);

    store.setPageSize(1);
    expect(store.pageSize()).toBe(1);
    expect(store.pageTeachers()).toHaveLength(1);

    expect(() => store.setPageSize(0)).toThrow(RangeError);
  });

  it('should filter teachers with Vietnamese diacritic insensitivity', () => {
    store.loadTeachers();
    const req = httpMock.expectOne('http://localhost:3001/teachers');
    req.flush(mockTeachers);

    // 1. Search unaccented "dat" -> matches "Nguyễn Văn Đạt" (tests both accent and đ/Đ)
    store.setSearchTerm('dat');
    expect(store.filteredTeachers()).toHaveLength(1);
    expect(store.filteredTeachers()[0].id).toBe('GV001');

    // 2. Search unaccented department "cong nghe thong tin"
    store.setSearchTerm('cong nghe thong tin');
    expect(store.filteredTeachers()).toHaveLength(1);
    expect(store.filteredTeachers()[0].id).toBe('GV001');

    // 3. Search unaccented "thao" -> matches "Trần Thị Thu Thảo"
    store.setSearchTerm('thao');
    expect(store.filteredTeachers()).toHaveLength(1);
    expect(store.filteredTeachers()[0].id).toBe('GV002');

    // 4. Search department with "dien tu"
    store.setSearchTerm('dien tu');
    expect(store.filteredTeachers()).toHaveLength(1);
    expect(store.filteredTeachers()[0].id).toBe('GV002');

    // 5. Search code
    store.setSearchTerm('GV001');
    expect(store.filteredTeachers()).toHaveLength(1);
    expect(store.filteredTeachers()[0].id).toBe('GV001');

    // 6. Reset search
    store.setSearchTerm('');
    expect(store.filteredTeachers()).toHaveLength(2);
  });
});
