import { Injectable, inject } from '@angular/core';
import { TeacherStore } from '../store/teacher.store';
import type { Teacher } from '../models/teacher.model';

@Injectable({
  providedIn: 'root'
})
export class TeacherFacade {
  private readonly store = inject(TeacherStore);

  readonly teachers = this.store.teachers;
  readonly filteredTeachers = this.store.filteredTeachers;
  readonly teacherCount = this.store.teacherCount;
  readonly filteredTeacherCount = this.store.filteredTeacherCount;
  readonly loading = this.store.loading;
  readonly errorMessage = this.store.errorMessage;
  readonly successMessage = this.store.successMessage;
  readonly searchTerm = this.store.searchTerm;

  loadTeachers(): void {
    this.store.loadTeachers();
  }

  setSearchTerm(term: string): void {
    this.store.setSearchTerm(term);
  }

  saveTeacher(teacher: Teacher, mode: 'add' | 'update'): void {
    this.store.saveTeacher({ teacher, mode });
  }

  deleteTeacher(id: string): void {
    this.store.deleteTeacher(id);
  }

  clearMessages(): void {
    this.store.clearMessages();
  }
}
