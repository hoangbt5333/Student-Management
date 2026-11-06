import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';

import { ClassStore } from './class.store';
import type { ClassModel } from '../models/class.model';

describe('ClassStore', () => {
  let store: InstanceType<typeof ClassStore>;
  let httpMock: HttpTestingController;

  const mockClasses: ClassModel[] = Array.from({ length: 7 }, (_, index) => ({
    id: `CLS00${index + 1}`,
    code: `CLS00${index + 1}`,
    name: `Lớp ${index + 1}`,
    department: 'Công nghệ thông tin',
    academicYear: '2025-2026'
  }));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ClassStore
      ]
    });

    store = TestBed.inject(ClassStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should initialize with default pagination state', () => {
    expect(store.page()).toBe(1);
    expect(store.currentPage()).toBe(1);
    expect(store.pageSize()).toBe(5);
    expect(store.totalPages()).toBe(1);
    expect(store.pageClasses()).toEqual([]);
  });

  it('should paginate classes into pages of default size (5)', () => {
    store.loadClasses();
    const req = httpMock.expectOne('http://localhost:3001/classes');
    req.flush(mockClasses);

    expect(store.classes()).toHaveLength(7);
    expect(store.filteredClassCount()).toBe(7);
    expect(store.totalPages()).toBe(2);
    expect(store.currentPage()).toBe(1);
    expect(store.pageClasses()).toHaveLength(5);
    expect(store.pageClasses()[0].id).toBe('CLS001');
    expect(store.pageClasses()[4].id).toBe('CLS005');
  });

  it('should navigate between pages and clamp page index', () => {
    store.loadClasses();
    httpMock.expectOne('http://localhost:3001/classes').flush(mockClasses);

    store.setPage(2);
    expect(store.currentPage()).toBe(2);
    expect(store.pageClasses()).toHaveLength(2);
    expect(store.pageClasses()[0].id).toBe('CLS006');
    expect(store.pageClasses()[1].id).toBe('CLS007');

    // Attempting to navigate past totalPages clamps to max page (2)
    store.setPage(99);
    expect(store.currentPage()).toBe(2);

    // Attempting to navigate below 1 clamps to 1
    store.setPage(0);
    expect(store.currentPage()).toBe(1);
  });

  it('should reset page to 1 when changing search term, sort field, or sort direction', () => {
    store.loadClasses();
    httpMock.expectOne('http://localhost:3001/classes').flush(mockClasses);

    store.setPage(2);
    expect(store.currentPage()).toBe(2);

    store.setSearchTerm('Lớp');
    expect(store.currentPage()).toBe(1);

    store.setPage(2);
    expect(store.currentPage()).toBe(2);

    store.setSortBy('department');
    expect(store.currentPage()).toBe(1);

    store.setPage(2);
    expect(store.currentPage()).toBe(2);

    store.setSortDirection('desc');
    expect(store.currentPage()).toBe(1);
  });

  it('should update page size and recalculate total pages', () => {
    store.loadClasses();
    httpMock.expectOne('http://localhost:3001/classes').flush(mockClasses);

    store.setPage(2);
    expect(store.currentPage()).toBe(2);

    store.setPageSize(10);
    expect(store.pageSize()).toBe(10);
    expect(store.currentPage()).toBe(1);
    expect(store.totalPages()).toBe(1);
    expect(store.pageClasses()).toHaveLength(7);

    store.setPageSize(2);
    expect(store.pageSize()).toBe(2);
    expect(store.totalPages()).toBe(4);
    expect(store.pageClasses()).toHaveLength(2);
  });

  it('should throw RangeError when setting invalid page size', () => {
    expect(() => store.setPageSize(0)).toThrow(RangeError);
    expect(() => store.setPageSize(-5)).toThrow(RangeError);
  });

  it('should clamp currentPage when loaded classes shrink', () => {
    store.loadClasses();
    httpMock.expectOne('http://localhost:3001/classes').flush(mockClasses);

    store.setPage(2);
    expect(store.currentPage()).toBe(2);

    // Reload with only 3 classes
    store.loadClasses();
    httpMock.expectOne('http://localhost:3001/classes').flush(mockClasses.slice(0, 3));

    expect(store.totalPages()).toBe(1);
    expect(store.currentPage()).toBe(1);
    expect(store.pageClasses()).toHaveLength(3);
  });
});
