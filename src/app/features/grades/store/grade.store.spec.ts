import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';

import { GradeStore } from './grade.store';
import type { Grade } from '../models/grade.model';

describe('GradeStore', () => {
  let store: InstanceType<typeof GradeStore>;
  let httpMock: HttpTestingController;

  const mockGrades: Grade[] = Array.from({ length: 12 }, (_, index) => ({
    id: `G00${index + 1}`,
    studentId: index < 6 ? 'SV001' : 'SV002',
    subjectId: index % 2 === 0 ? 'MH001' : 'MH002',
    score: 7.0 + (index % 4) * 0.5
  }));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        GradeStore
      ]
    });

    store = TestBed.inject(GradeStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should initialize with default state and pagination values', () => {
    expect(store.grades()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.page()).toBe(1);
    expect(store.currentPage()).toBe(1);
    expect(store.pageSize()).toBe(5);
    expect(store.totalPages()).toBe(1);
    expect(store.pageGrades()).toEqual([]);
    expect(store.averageScore()).toBe('—');
  });

  it('should paginate grades with default size 5', () => {
    store.loadGrades();
    const req = httpMock.expectOne('http://localhost:3001/grades');
    req.flush(mockGrades);

    expect(store.grades()).toHaveLength(12);
    expect(store.filteredGradeCount()).toBe(12);
    expect(store.totalPages()).toBe(3);
    expect(store.currentPage()).toBe(1);
    expect(store.pageGrades()).toHaveLength(5);
    expect(store.pageGrades()[0].id).toBe('G001');

    store.setPage(2);
    expect(store.currentPage()).toBe(2);
    expect(store.pageGrades()).toHaveLength(5);
    expect(store.pageGrades()[0].id).toBe('G006');

    store.setPage(3);
    expect(store.currentPage()).toBe(3);
    expect(store.pageGrades()).toHaveLength(2);
  });

  it('should clamp out-of-range page requests', () => {
    store.loadGrades();
    httpMock.expectOne('http://localhost:3001/grades').flush(mockGrades);

    store.setPage(99);
    expect(store.currentPage()).toBe(3);

    store.setPage(-5);
    expect(store.currentPage()).toBe(1);
  });

  it('should update page size and clamp invalid page size requests', () => {
    store.loadGrades();
    httpMock.expectOne('http://localhost:3001/grades').flush(mockGrades);

    store.setPageSize(10);
    expect(store.pageSize()).toBe(10);
    expect(store.totalPages()).toBe(2);
    expect(store.pageGrades()).toHaveLength(10);

    expect(() => store.setPageSize(0)).toThrow(RangeError);
    expect(() => store.setPageSize(-1)).toThrow(RangeError);
  });

  it('should filter by student and reset to page 1', () => {
    store.loadGrades();
    httpMock.expectOne('http://localhost:3001/grades').flush(mockGrades);

    store.setPage(2);
    expect(store.currentPage()).toBe(2);

    store.setStudentFilter('SV001');
    expect(store.currentPage()).toBe(1);
    expect(store.filteredGradeCount()).toBe(6);
    expect(store.totalPages()).toBe(2);
  });

  it('should filter by subject and reset to page 1', () => {
    store.loadGrades();
    httpMock.expectOne('http://localhost:3001/grades').flush(mockGrades);

    store.setPage(2);
    expect(store.currentPage()).toBe(2);

    store.setSubjectFilter('MH001');
    expect(store.currentPage()).toBe(1);
    expect(store.filteredGradeCount()).toBe(6);
    expect(store.totalPages()).toBe(2);
  });

  it('should compute average score accurately for filtered grades', () => {
    const grades: Grade[] = [
      { id: '1', studentId: 'S1', subjectId: 'M1', score: 8.0 },
      { id: '2', studentId: 'S1', subjectId: 'M2', score: 9.0 }
    ];

    store.loadGrades();
    httpMock.expectOne('http://localhost:3001/grades').flush(grades);

    expect(store.averageScore()).toBe('8.50');
  });

  it('should handle load grades error gracefully', () => {
    store.loadGrades();
    const req = httpMock.expectOne('http://localhost:3001/grades');
    req.flush('Error', { status: 500, statusText: 'Server Error' });

    expect(store.loading()).toBe(false);
    expect(store.errorMessage()).toBe('Không thể tải bảng điểm. Hãy kiểm tra Mock API.');
    expect(store.grades()).toEqual([]);
  });
});
