import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';

import { SubjectStore } from './subject.store';
import type { Subject } from '../models/subject.model';

describe('SubjectStore', () => {
  let store: InstanceType<typeof SubjectStore>;
  let httpMock: HttpTestingController;

  const mockSubjects: Subject[] = [
    {
      id: 'MH001',
      code: 'MH001',
      name: 'Toán cao cấp',
      credits: 3,
      teacherId: 'GV001'
    },
    {
      id: 'MH002',
      code: 'MH002',
      name: 'Lập trình Web',
      credits: 4,
      teacherId: 'GV002'
    },
    {
      id: 'MH003',
      code: 'MH003',
      name: 'Đại số tuyến tính',
      credits: 3,
      teacherId: 'GV001'
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SubjectStore
      ]
    });

    store = TestBed.inject(SubjectStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should load subjects successfully', () => {
    store.loadSubjects();

    const req = httpMock.expectOne('http://localhost:3001/subjects');
    expect(req.request.method).toBe('GET');
    req.flush(mockSubjects);

    expect(store.subjects()).toEqual(mockSubjects);
    expect(store.subjectCount()).toBe(3);
    expect(store.loading()).toBe(false);
    expect(store.errorMessage()).toBe('');
  });

  it('should search subjects with Vietnamese diacritic insensitivity', () => {
    store.loadSubjects();
    const req = httpMock.expectOne('http://localhost:3001/subjects');
    req.flush(mockSubjects);

    // 1. Search unaccented "toan" -> matches "Toán cao cấp"
    store.setSearchTerm('toan');
    expect(store.filteredSubjects()).toHaveLength(1);
    expect(store.filteredSubjects()[0].id).toBe('MH001');

    // 2. Search unaccented "lap trinh" -> matches "Lập trình Web"
    store.setSearchTerm('lap trinh');
    expect(store.filteredSubjects()).toHaveLength(1);
    expect(store.filteredSubjects()[0].id).toBe('MH002');

    // 3. Search with d vs Đ "dai so" -> matches "Đại số tuyến tính"
    store.setSearchTerm('dai so');
    expect(store.filteredSubjects()).toHaveLength(1);
    expect(store.filteredSubjects()[0].id).toBe('MH003');

    // 4. Search with accented keyword "Đại số"
    store.setSearchTerm('Đại số');
    expect(store.filteredSubjects()).toHaveLength(1);
    expect(store.filteredSubjects()[0].id).toBe('MH003');

    // 5. Search by subject code
    store.setSearchTerm('MH002');
    expect(store.filteredSubjects()).toHaveLength(1);
    expect(store.filteredSubjects()[0].id).toBe('MH002');

    // 6. Reset search
    store.setSearchTerm('');
    expect(store.filteredSubjects()).toHaveLength(3);

    // 7. Non-matching search
    store.setSearchTerm('Vật lý');
    expect(store.filteredSubjects()).toHaveLength(0);
  });

  it('should initialize with default pagination state', () => {
    expect(store.page()).toBe(1);
    expect(store.currentPage()).toBe(1);
    expect(store.pageSize()).toBe(5);
    expect(store.totalPages()).toBe(1);
    expect(store.pageSubjects()).toEqual([]);
  });

  it('should paginate subjects with default page size (5)', () => {
    const sevenSubjects: Subject[] = Array.from({ length: 7 }, (_, i) => ({
      id: `MH00${i + 1}`,
      code: `MH00${i + 1}`,
      name: `Môn học ${i + 1}`,
      credits: 3
    }));

    store.loadSubjects();
    httpMock.expectOne('http://localhost:3001/subjects').flush(sevenSubjects);

    expect(store.subjectCount()).toBe(7);
    expect(store.filteredSubjectCount()).toBe(7);
    expect(store.totalPages()).toBe(2);
    expect(store.currentPage()).toBe(1);
    expect(store.pageSubjects()).toHaveLength(5);
    expect(store.pageSubjects()[0].id).toBe('MH001');
    expect(store.pageSubjects()[4].id).toBe('MH005');
  });

  it('should navigate pages and clamp page numbers', () => {
    const sevenSubjects: Subject[] = Array.from({ length: 7 }, (_, i) => ({
      id: `MH00${i + 1}`,
      code: `MH00${i + 1}`,
      name: `Môn học ${i + 1}`,
      credits: 3
    }));

    store.loadSubjects();
    httpMock.expectOne('http://localhost:3001/subjects').flush(sevenSubjects);

    store.setPage(2);
    expect(store.currentPage()).toBe(2);
    expect(store.pageSubjects()).toHaveLength(2);
    expect(store.pageSubjects()[0].id).toBe('MH006');
    expect(store.pageSubjects()[1].id).toBe('MH007');

    // Clamp above
    store.setPage(99);
    expect(store.currentPage()).toBe(2);

    // Clamp below
    store.setPage(0);
    expect(store.currentPage()).toBe(1);
  });

  it('should reset page to 1 on search change', () => {
    const sevenSubjects: Subject[] = Array.from({ length: 7 }, (_, i) => ({
      id: `MH00${i + 1}`,
      code: `MH00${i + 1}`,
      name: `Môn học ${i + 1}`,
      credits: 3
    }));

    store.loadSubjects();
    httpMock.expectOne('http://localhost:3001/subjects').flush(sevenSubjects);

    store.setPage(2);
    expect(store.currentPage()).toBe(2);

    store.setSearchTerm('Môn học 1');
    expect(store.currentPage()).toBe(1);
    expect(store.filteredSubjectCount()).toBe(1);
  });

  it('should update page size and recalculate pages', () => {
    const sevenSubjects: Subject[] = Array.from({ length: 7 }, (_, i) => ({
      id: `MH00${i + 1}`,
      code: `MH00${i + 1}`,
      name: `Môn học ${i + 1}`,
      credits: 3
    }));

    store.loadSubjects();
    httpMock.expectOne('http://localhost:3001/subjects').flush(sevenSubjects);

    store.setPage(2);
    expect(store.currentPage()).toBe(2);

    store.setPageSize(10);
    expect(store.pageSize()).toBe(10);
    expect(store.currentPage()).toBe(1);
    expect(store.totalPages()).toBe(1);
    expect(store.pageSubjects()).toHaveLength(7);

    store.setPageSize(2);
    expect(store.pageSize()).toBe(2);
    expect(store.totalPages()).toBe(4);
    expect(store.pageSubjects()).toHaveLength(2);
  });

  it('should throw RangeError for non-positive page size', () => {
    expect(() => store.setPageSize(0)).toThrow(RangeError);
    expect(() => store.setPageSize(-3)).toThrow(RangeError);
  });

  it('should clamp currentPage when subjects list shrinks', () => {
    const sevenSubjects: Subject[] = Array.from({ length: 7 }, (_, i) => ({
      id: `MH00${i + 1}`,
      code: `MH00${i + 1}`,
      name: `Môn học ${i + 1}`,
      credits: 3
    }));

    store.loadSubjects();
    httpMock.expectOne('http://localhost:3001/subjects').flush(sevenSubjects);

    store.setPage(2);
    expect(store.currentPage()).toBe(2);

    store.loadSubjects();
    httpMock.expectOne('http://localhost:3001/subjects').flush(sevenSubjects.slice(0, 3));

    expect(store.totalPages()).toBe(1);
    expect(store.currentPage()).toBe(1);
    expect(store.pageSubjects()).toHaveLength(3);
  });
});
