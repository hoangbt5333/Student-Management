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
});
