import { Injectable, inject } from '@angular/core';
import { SubjectStore } from '../store/subject.store';
import type { Subject } from '../models/subject.model';

@Injectable({
  providedIn: 'root'
})
export class SubjectFacade {
  private readonly store = inject(SubjectStore);

  readonly subjects = this.store.subjects;
  readonly filteredSubjects = this.store.filteredSubjects;
  readonly subjectCount = this.store.subjectCount;
  readonly filteredSubjectCount = this.store.filteredSubjectCount;
  readonly loading = this.store.loading;
  readonly errorMessage = this.store.errorMessage;
  readonly successMessage = this.store.successMessage;
  readonly searchTerm = this.store.searchTerm;

  loadSubjects(): void {
    this.store.loadSubjects();
  }

  setSearchTerm(term: string): void {
    this.store.setSearchTerm(term);
  }

  saveSubject(subject: Subject, mode: 'add' | 'update'): void {
    this.store.saveSubject({ subject, mode });
  }

  deleteSubject(id: string): void {
    this.store.deleteSubject(id);
  }

  clearMessages(): void {
    this.store.clearMessages();
  }
}
