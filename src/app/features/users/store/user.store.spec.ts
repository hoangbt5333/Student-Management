import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { UserStore } from './user.store';
import { UserService } from '../services/user.service';
import { StudentService } from '../../students/services/student.service';
import { TeacherService } from '../../teachers/services/teacher.service';
import type { User } from '../models/user.model';
import type { Student } from '../../students/models/student.model';
import type { Teacher } from '../../teachers/models/teacher.model';

describe('UserStore', () => {
  let store: InstanceType<typeof UserStore>;
  let mockUserService: Partial<Record<keyof UserService, any>>;
  let mockStudentService: Partial<Record<keyof StudentService, any>>;
  let mockTeacherService: Partial<Record<keyof TeacherService, any>>;

  const mockUsers: User[] = [
    {
      id: 'USR001',
      username: 'admin',
      displayName: 'Quản trị viên',
      email: 'admin@school.edu.vn',
      role: 'admin',
      status: 'active',
      createdAt: '2026-01-01T08:00:00.000Z'
    },
    {
      id: 'USR002',
      username: 'faculty-account',
      displayName: 'Nguyễn Minh An',
      email: 'minhan@example.com',
      role: 'teacher',
      status: 'active',
      teacherId: 'GV001',
      createdAt: '2026-01-02T08:00:00.000Z'
    },
    {
      id: 'USR003',
      username: 'sv001',
      displayName: 'Nguyen Van A',
      email: 'a@example.com',
      role: 'student',
      status: 'active',
      studentId: 'SV001',
      createdAt: '2026-01-03T08:00:00.000Z'
    }
  ];

  const mockStudents: Student[] = [
    { id: 'SV001', name: 'Nguyen Van A', email: 'a@example.com', phone: '0901234567' },
    { id: 'SV002', name: 'Tran Thi B', email: 'b@example.com', phone: '0901234568' }
  ];

  const mockTeachers: Teacher[] = [
    { id: 'GV001', name: 'Nguyễn Minh An', email: 'minhan@example.com', department: 'CNTT' },
    { id: 'GV002', name: 'Trần Thu Hà', email: 'thuha@example.com', department: 'KHMT' }
  ];

  beforeEach(() => {
    mockUserService = {
      getUsers: vi.fn().mockReturnValue(of([...mockUsers])),
      createUser: vi.fn().mockImplementation((u: User) => of(u)),
      updateUser: vi.fn().mockImplementation((u: User) => of(u)),
      patchUser: vi.fn().mockImplementation((id: string, p: Partial<User>) => of({ ...mockUsers[0], ...p, id }))
    };

    mockStudentService = {
      getStudents: vi.fn().mockReturnValue(of([...mockStudents]))
    };

    mockTeacherService = {
      getTeachers: vi.fn().mockReturnValue(of([...mockTeachers]))
    };

    TestBed.configureTestingModule({
      providers: [
        UserStore,
        { provide: UserService, useValue: mockUserService },
        { provide: StudentService, useValue: mockStudentService },
        { provide: TeacherService, useValue: mockTeacherService }
      ]
    });

    store = TestBed.inject(UserStore);
    store.loadAll();
  });

  it('tracks row and current-page selections without duplicate IDs', () => {
    store.toggleUserSelection('USR002');
    store.toggleUserSelection('USR002');
    expect(store.selectedUserIds()).toEqual([]);
    store.togglePageSelection();
    expect(store.selectedUserIds()).toHaveLength(3);
    expect(store.allPageUsersSelected()).toBe(true);
    store.togglePageSelection();
    expect(store.selectedUserIds()).toEqual([]);
  });

  it('excludes self and invalid-status accounts from bulk locking', () => {
    mockUserService.getUsers = vi.fn().mockReturnValue(of([
      mockUsers[0],
      mockUsers[1],
      { ...mockUsers[2], status: 'locked' }
    ]));
    store.loadAll();

    store.toggleUserSelection('USR001');
    store.toggleUserSelection('USR002');
    store.toggleUserSelection('USR003');
    store.bulkChangeUserStatus('locked', 'USR001');
    expect(mockUserService.patchUser).toHaveBeenCalledTimes(1);
    expect(mockUserService.patchUser).toHaveBeenCalledWith('USR002', expect.objectContaining({ status: 'locked' }));
  });

  it('successfully bulk unlocks locked accounts', () => {
    mockUserService.getUsers = vi.fn().mockReturnValue(of([
      { ...mockUsers[1], status: 'locked' }
    ]));
    store.loadAll();

    store.toggleUserSelection('USR002');
    store.bulkChangeUserStatus('active');
    expect(mockUserService.patchUser).toHaveBeenCalledTimes(1);
    expect(mockUserService.patchUser).toHaveBeenCalledWith('USR002', expect.objectContaining({ status: 'active' }));
    expect(store.selectedUserIds()).toEqual([]);
  });

  it('preserves an active admin when the selected request would lock the last one', () => {
    store.toggleUserSelection('USR001');
    store.bulkChangeUserStatus('locked', 'OTHER');
    expect(mockUserService.patchUser).not.toHaveBeenCalled();
    expect(store.errorMessage()).toContain('Không có tài khoản phù hợp');
  });

  it('updates successful bulk requests, retains failed selections, and reports partial failure', () => {
    mockUserService.patchUser = vi.fn().mockImplementation((id: string) => id === 'USR002'
      ? of({ ...mockUsers[1], status: 'locked' })
      : throwError(() => new Error('request failed')));
    store.toggleUserSelection('USR002');
    store.toggleUserSelection('USR003');
    store.bulkChangeUserStatus('locked');
    expect(store.users().find(user => user.id === 'USR002')?.status).toBe('locked');
    expect(store.selectedUserIds()).toEqual(['USR003']);
    expect(store.successMessage()).toContain('1 tài khoản');
    expect(store.errorMessage()).toContain('Một số tài khoản');
  });

  it('ignores bulk statuses other than the supported active and locked transitions', () => {
    store.bulkChangeUserStatus('locked');
    expect(store.errorMessage()).toContain('Không có tài khoản phù hợp');
    expect(mockUserService.patchUser).not.toHaveBeenCalled();
  });

  it('starts with no active filters', () => {
    expect(store.hasActiveFilters()).toBe(false);
  });

  it('marks search, role, and status filters active independently', () => {
    store.setSearchTerm('  admin  ');
    expect(store.hasActiveFilters()).toBe(true);
    store.resetFilters();

    store.setRoleFilter('teacher');
    expect(store.hasActiveFilters()).toBe(true);
    store.resetFilters();

    store.setStatusFilter('locked');
    expect(store.hasActiveFilters()).toBe(true);
  });

  it('resets filters and page without changing unrelated state', () => {
    store.setSearchTerm('admin');
    store.setRoleFilter('teacher');
    store.setStatusFilter('locked');
    store.setPage(3);
    store.setPageSize(10);
    store.setSortBy('username');
    store.selectUser('USR001');
    const users = store.users();
    const students = store.students();
    const teachers = store.teachers();

    store.resetFilters();

    expect(store.searchTerm()).toBe('');
    expect(store.roleFilter()).toBe('all');
    expect(store.statusFilter()).toBe('all');
    expect(store.page()).toBe(1);
    expect(store.pageSize()).toBe(10);
    expect(store.sortBy()).toBe('username');
    expect(store.selectedUserId()).toBe('USR001');
    expect(store.users()).toBe(users);
    expect(store.students()).toBe(students);
    expect(store.teachers()).toBe(teachers);
  });

  it('loads all users, students, and teachers initially', () => {
    expect(store.users().length).toBe(3);
    expect(store.students().length).toBe(2);
    expect(store.teachers().length).toBe(2);
    expect(store.activeAdminCount()).toBe(1);
  });

  it('correctly computes available unlinked students and teachers', () => {
    // SV001 is linked to USR003, so only SV002 is unlinked
    const availableStudents = store.availableStudents();
    expect(availableStudents.length).toBe(1);
    expect(availableStudents[0].id).toBe('SV002');

    // GV001 is linked to USR002, so only GV002 is unlinked
    const availableTeachers = store.availableTeachers();
    expect(availableTeachers.length).toBe(1);
    expect(availableTeachers[0].id).toBe('GV002');
  });

  it('filters by name, email, username and linked IDs case- and diacritic-insensitively', () => {
    store.setSearchTerm('nguyen');
    expect(store.filteredUsers().map(user => user.id).sort()).toEqual(['USR002', 'USR003']);

    store.setSearchTerm('MINHAN@EXAMPLE.COM');
    expect(store.filteredUsers().map(user => user.id)).toEqual(['USR002']);

    store.setSearchTerm('faculty-account');
    expect(store.filteredUsers().map(user => user.id)).toEqual(['USR002']);

    store.setSearchTerm('admin');
    expect(store.filteredUsers().map(user => user.id)).toEqual(['USR001']);
  });

  it('trims search terms, returns all users for blank queries, and preserves source users', () => {
    const sourceUsers = store.users();
    store.setSearchTerm('  ');
    expect(store.filteredUsers()).toHaveLength(3);
    expect(store.filteredUsers().map(user => user.id).sort()).toEqual(sourceUsers.map(user => user.id).sort());

    store.setSearchTerm('no-match');
    expect(store.filteredUsers()).toHaveLength(0);
    expect(store.users()).toBe(sourceUsers);
  });

  it('combines search with role and status filters', () => {
    store.setRoleFilter('teacher');
    store.setStatusFilter('active');
    store.setSearchTerm('MINHAN');
    expect(store.filteredUsers().map(user => user.id)).toEqual(['USR002']);

    store.setSearchTerm('admin');
    expect(store.filteredUsers()).toHaveLength(0);
  });

  it('BR-05: prevents creating user with duplicate username', () => {
    const success = store.createUser({
      username: 'ADMIN', // case-insensitive duplicate
      displayName: 'Admin Duplicate',
      email: 'dup@example.com',
      role: 'admin',
      password: 'Pass123456!',
      status: 'active'
    });

    expect(success).toBe(false);
    expect(store.errorMessage()).toContain('đã tồn tại trong hệ thống');
    expect(mockUserService.createUser).not.toHaveBeenCalled();
  });

  it('BR-03 & BR-04: requires unlinked student profile when creating student user', () => {
    // Missing studentId
    let success = store.createUser({
      username: 'sv_new',
      displayName: 'Student New',
      email: 'new@example.com',
      role: 'student',
      password: 'Pass123456!',
      status: 'active'
    });
    expect(success).toBe(false);
    expect(store.errorMessage()).toContain('bắt buộc phải liên kết với một hồ sơ sinh viên');

    // Already linked studentId SV001
    success = store.createUser({
      username: 'sv_new',
      displayName: 'Student New',
      email: 'new@example.com',
      role: 'student',
      password: 'Pass123456!',
      status: 'active',
      studentId: 'SV001'
    });
    expect(success).toBe(false);
    expect(store.errorMessage()).toContain('đã được liên kết với một tài khoản khác');

    // Valid unlinked SV002
    success = store.createUser({
      username: 'sv_valid',
      displayName: 'Ignored Name',
      email: 'ignored@example.com',
      role: 'student',
      password: 'Pass123456!',
      status: 'active',
      studentId: 'SV002'
    });
    expect(success).toBe(true);
    expect(mockUserService.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'sv_valid',
        displayName: 'Tran Thi B', // Auto-filled from SV002
        email: 'b@example.com',     // Auto-filled from SV002
        studentId: 'SV002'
      })
    );
  });

  it('BR-06: prevents current admin from self-locking or self-deactivating', () => {
    const currentAdminId = 'USR001';

    // Try locking own account
    let result = store.changeUserStatus('USR001', 'locked', currentAdminId);
    expect(result).toBe(false);
    expect(store.errorMessage()).toContain('Không thể tự khóa hoặc vô hiệu hóa tài khoản của chính bạn');

    // Try deactivating own account
    result = store.changeUserStatus('USR001', 'inactive', currentAdminId);
    expect(result).toBe(false);
    expect(store.errorMessage()).toContain('Không thể tự khóa hoặc vô hiệu hóa tài khoản của chính bạn');

    expect(mockUserService.patchUser).not.toHaveBeenCalled();
  });

  it('BR-07: protects the last active admin from being locked or deactivated', () => {
    // We only have 1 active admin (USR001). Attempting to lock USR001 as someone else:
    const otherAdminId = 'OTHER_CALLER';
    const result = store.changeUserStatus('USR001', 'locked', otherAdminId);

    expect(result).toBe(false);
    expect(store.errorMessage()).toContain('Không thể khóa hoặc vô hiệu hóa Quản trị viên kích hoạt cuối cùng');
    expect(mockUserService.patchUser).not.toHaveBeenCalled();
  });

  it('allows locking another user when rules are satisfied', () => {
    const currentAdminId = 'USR001';
    const result = store.changeUserStatus('USR002', 'locked', currentAdminId);

    expect(result).toBe(true);
    expect(mockUserService.patchUser).toHaveBeenCalledWith('USR002', expect.objectContaining({
      status: 'locked'
    }));
  });
});
