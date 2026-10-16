import { Injectable, inject } from '@angular/core';
import { StudentStore } from './student.store';
import type { Student } from './models/student.model';

@Injectable({
  providedIn: 'root'
})
export class StudentFacade {
  private store = inject(StudentStore);

  // Expose state cho component đọc
  students = this.store.students;
  filteredStudents = this.store.filteredStudents;
  pageStudents = this.store.pageStudents;
  classOptions = this.store.classOptions;
  facultyOptions = this.store.facultyOptions;
  studentCount = this.store.studentCount;
  filteredStudentCount = this.store.filteredStudentCount;
  currentPage = this.store.currentPage;
  totalPages = this.store.totalPages;

  loading = this.store.loading;
  errorMessage = this.store.errorMessage;
  successMessage = this.store.successMessage;
  searchTerm = this.store.searchTerm;
  classFilter = this.store.classFilter;
  facultyFilter = this.store.facultyFilter;
  sortBy = this.store.sortBy;
  sortDirection = this.store.sortDirection;
  pageSize = this.store.pageSize;

  // Expose các thao tác nghiệp vụ
  loadStudents(): void {
    this.store.loadStudents();
  }

  setSearchTerm(keyword: string): void {
    this.store.setSearchTerm(keyword);
  }

  setClassFilter(classFilter: string): void {
    this.store.setClassFilter(classFilter);
  }

  setFacultyFilter(facultyFilter: string): void {
    this.store.setFacultyFilter(facultyFilter);
  }

  setSortBy(sortBy: keyof Student): void {
    this.store.setSortBy(sortBy);
  }

  setSortDirection(sortDirection: 'asc' | 'desc'): void {
    this.store.setSortDirection(sortDirection);
  }

  setPage(page: number): void {
    this.store.setPage(page);
  }

  setPageSize(pageSize: number): void {
    this.store.setPageSize(pageSize);
  }

  saveStudent(student: Student, mode: 'add' | 'update'): void {
    this.store.saveStudent({ student, mode });
  }

  deleteStudent(id: string): void {
    this.store.deleteStudent(id);
  }
}