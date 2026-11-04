import { Injectable, inject } from '@angular/core';
import { GradeStore, type SaveGradeRequest } from '../store/grade.store';
import type { Grade } from '../models/grade.model';

@Injectable({
  providedIn: 'root'
})
export class GradeFacade {
  private readonly store = inject(GradeStore);

  readonly grades = this.store.grades;
  readonly filteredGrades = this.store.filteredGrades;
  readonly gradeCount = this.store.gradeCount;
  readonly filteredGradeCount = this.store.filteredGradeCount;
  readonly averageScore = this.store.averageScore;
  readonly loading = this.store.loading;
  readonly errorMessage = this.store.errorMessage;
  readonly successMessage = this.store.successMessage;
  readonly studentFilter = this.store.studentFilter;
  readonly subjectFilter = this.store.subjectFilter;

  loadGrades(): void {
    this.store.loadGrades();
  }

  setStudentFilter(studentFilter: string): void {
    this.store.setStudentFilter(studentFilter);
  }

  setSubjectFilter(subjectFilter: string): void {
    this.store.setSubjectFilter(subjectFilter);
  }

  saveGrade(grade: Omit<Grade, 'id'> & { id?: string }, mode: 'add' | 'update'): void {
    this.store.saveGrade({ grade, mode });
  }

  clearMessages(): void {
    this.store.clearMessages();
  }
}
