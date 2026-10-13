import { Injectable, inject } from '@angular/core';
import { StudentStore } from './student.store';
import type { Student } from './student';

@Injectable({
  providedIn: 'root'
})
export class StudentFacade {
  private store = inject(StudentStore);

  // Expose state cho component đọc
  students = this.store.students;
  filteredStudents = this.store.filteredStudents;
  studentCount = this.store.studentCount;

  loading = this.store.loading;
  errorMessage = this.store.errorMessage;
  successMessage = this.store.successMessage;
  searchTerm = this.store.searchTerm;

  // Expose các thao tác nghiệp vụ
  loadStudents(): void {
    this.store.loadStudents();
  }

  setSearchTerm(keyword: string): void {
    this.store.setSearchTerm(keyword);
  }

  saveStudent(student: Student, mode: 'add' | 'update'): void {
    this.store.saveStudent({ student, mode });
  }

  deleteStudent(id: string): void {
    this.store.deleteStudent(id);
  }
}