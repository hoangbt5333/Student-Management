import { Injectable, inject } from '@angular/core';
import { ClassStore } from './class.store';
import type { ClassModel } from './models/class.model';

@Injectable({
  providedIn: 'root'
})
export class ClassFacade {
  private readonly store = inject(ClassStore);

  // State
  classes = this.store.classes;
  filteredClasses = this.store.filteredClasses;
  classCount = this.store.classCount;
  filteredClassCount = this.store.filteredClassCount;

  loading = this.store.loading;
  errorMessage = this.store.errorMessage;
  successMessage = this.store.successMessage;
  searchTerm = this.store.searchTerm;
  sortBy = this.store.sortBy;
  sortDirection = this.store.sortDirection;

  // Actions
  loadClasses(): void {
    this.store.loadClasses();
  }

  setSearchTerm(keyword: string): void {
    this.store.setSearchTerm(keyword);
  }

  setSortBy(field: keyof ClassModel): void {
    this.store.setSortBy(field);
  }

  setSortDirection(direction: 'asc' | 'desc'): void {
    this.store.setSortDirection(direction);
  }

  saveClass(classItem: ClassModel, mode: 'add' | 'update'): void {
    this.store.saveClass({ classItem, mode });
  }

  deleteClass(id: string): void {
    this.store.deleteClass(id);
  }

  clearMessages(): void {
    this.store.clearMessages();
  }
}
