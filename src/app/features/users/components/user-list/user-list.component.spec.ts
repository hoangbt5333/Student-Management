import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { UserListComponent } from './user-list.component';
import { UserFacade } from '../../facades/user.facade';
import { AuthFacade } from '../../../../core/auth/facades/auth.facade';
import type { User } from '../../models/user.model';

describe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;
  let mockUserFacade: Partial<Record<keyof UserFacade, any>>;
  let mockAuthFacade: Partial<Record<keyof AuthFacade, any>>;

  const mockUsers: User[] = [
    {
      id: 'USR001',
      username: 'admin',
      displayName: 'Quản trị viên',
      email: 'admin@school.edu.vn',
      role: 'admin',
      status: 'active',
      createdAt: '2026-01-01'
    },
    {
      id: 'USR002',
      username: 'gv001',
      displayName: 'Nguyễn Minh An',
      email: 'minhan@example.com',
      role: 'teacher',
      status: 'active',
      teacherId: 'GV001',
      createdAt: '2026-01-02'
    }
  ];

  beforeEach(async () => {
    mockUserFacade = {
      loadAll: vi.fn(),
      pageUsers: signal(mockUsers),
      filteredUsers: signal(mockUsers),
      totalFilteredCount: signal(2),
      totalPages: signal(1),
      page: signal(1),
      pageSize: signal(5),
      searchTerm: signal(''),
      roleFilter: signal('all'),
      statusFilter: signal('all'),
      sortBy: signal('createdAt'),
      loading: signal(false),
      errorMessage: signal(''),
      successMessage: signal(''),
      activeAdminCount: signal(1),
      students: signal([]),
      teachers: signal([]),
      availableStudents: signal([]),
      availableTeachers: signal([]),
      selectUser: vi.fn(),
      setSearchTerm: vi.fn(),
      setRoleFilter: vi.fn(),
      setStatusFilter: vi.fn(),
      setSortBy: vi.fn(),
      setPage: vi.fn(),
      setPageSize: vi.fn(),
      changeUserStatus: vi.fn(),
      clearMessages: vi.fn()
    };

    mockAuthFacade = {
      currentUser: signal({
        id: 'USR001',
        username: 'admin',
        displayName: 'Quản trị viên',
        role: 'admin'
      }),
      can: vi.fn().mockReturnValue(true)
    };

    await TestBed.configureTestingModule({
      imports: [UserListComponent],
      providers: [
        { provide: UserFacade, useValue: mockUserFacade },
        { provide: AuthFacade, useValue: mockAuthFacade }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders page header, search-box, and primary add button', () => {
    const el = fixture.nativeElement;
    expect(el.querySelector('h1').textContent).toContain('Quản lý người dùng');
    expect(el.querySelector('button.primary-button')).toBeTruthy();
    expect(el.querySelector('.search-box input')).toBeTruthy();
  });

  it('disables lock and deactivate button for the currently logged-in admin (BR-06)', () => {
    const lockButtons = fixture.nativeElement.querySelectorAll('.btn-lock-user');
    // First row is USR001 (current admin)
    expect(lockButtons[0].disabled).toBe(true);

    // Second row is USR002 (teacher) -> enabled
    expect(lockButtons[1].disabled).toBe(false);
  });

  it('opens create form when clicking primary-button', () => {
    const addButton = fixture.nativeElement.querySelector('button.primary-button');
    addButton.click();
    fixture.detectChanges();

    expect(component.showForm()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-user-form')).toBeTruthy();
  });
});
