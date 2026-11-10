import { Injectable, inject } from '@angular/core';

import { UserStore } from '../store/user.store';
import type {
  CreateUserDto,
  UpdateUserDto,
  User,
  UserRole,
  UserStatus
} from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserFacade {
  private readonly store = inject(UserStore);

  // State Signals exposed to UI
  readonly users = this.store.users;
  readonly students = this.store.students;
  readonly teachers = this.store.teachers;
  readonly loading = this.store.loading;
  readonly errorMessage = this.store.errorMessage;
  readonly successMessage = this.store.successMessage;
  readonly searchTerm = this.store.searchTerm;
  readonly roleFilter = this.store.roleFilter;
  readonly statusFilter = this.store.statusFilter;
  readonly sortBy = this.store.sortBy;
  readonly sortDirection = this.store.sortDirection;
  readonly page = this.store.page;
  readonly pageSize = this.store.pageSize;

  // Computed Signals
  readonly selectedUser = this.store.selectedUser;
  readonly selectedUserIds = this.store.selectedUserIds;
  readonly selectedUserCount = this.store.selectedUserCount;
  readonly allPageUsersSelected = this.store.allPageUsersSelected;
  readonly filteredUsers = this.store.filteredUsers;
  readonly totalFilteredCount = this.store.totalFilteredCount;
  readonly totalPages = this.store.totalPages;
  readonly pageUsers = this.store.pageUsers;
  readonly activeAdminCount = this.store.activeAdminCount;
  readonly availableStudents = this.store.availableStudents;
  readonly availableTeachers = this.store.availableTeachers;
  readonly selectedStudentProfile = this.store.selectedStudentProfile;
  readonly selectedTeacherProfile = this.store.selectedTeacherProfile;

  // Actions
  loadAll(): void {
    this.store.loadAll();
  }

  createUser(dto: CreateUserDto): boolean {
    return this.store.createUser(dto);
  }

  updateUser(dto: UpdateUserDto): boolean {
    return this.store.updateUser(dto);
  }

  changeUserStatus(userId: string, newStatus: UserStatus, currentAdminId?: string): boolean {
    return this.store.changeUserStatus(userId, newStatus, currentAdminId);
  }

  setSearchTerm(term: string): void {
    this.store.setSearchTerm(term);
  }

  setRoleFilter(role: 'all' | UserRole): void {
    this.store.setRoleFilter(role);
  }

  setStatusFilter(status: 'all' | UserStatus): void {
    this.store.setStatusFilter(status);
  }

  setSortBy(sortBy: keyof User): void {
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

  selectUser(id: string | null): void {
    this.store.selectUser(id);
  }

  toggleUserSelection(id: string): void { this.store.toggleUserSelection(id); }
  togglePageSelection(): void { this.store.togglePageSelection(); }
  clearSelection(): void { this.store.clearSelection(); }
  bulkChangeUserStatus(status: 'locked' | 'active', currentAdminId?: string): void { this.store.bulkChangeUserStatus(status, currentAdminId); }

  clearMessages(): void {
    this.store.clearMessages();
  }
}
