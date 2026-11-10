import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { UserListComponent } from './user-list.component';
import { UserFacade } from '../../facades/user.facade';
import { AuthFacade } from '../../../../core/auth/facades/auth.facade';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { UserFormComponent } from '../user-form/user-form.component';
import { UserDetailComponent } from '../user-detail/user-detail.component';
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
      users: signal(mockUsers),
      pageUsers: signal(mockUsers),
      filteredUsers: signal(mockUsers),
      totalFilteredCount: signal(2),
      totalPages: signal(1),
      page: signal(1),
      pageSize: signal(5),
      searchTerm: signal(''),
      hasActiveFilters: signal(false),
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
      selectedStudentProfile: signal(null),
      selectedTeacherProfile: signal(null),
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

  it('debounces search input by 300ms before calling setSearchTerm', () => {
    vi.useFakeTimers();
    try {
      component.searchControl.setValue('admin');
      expect(mockUserFacade.setSearchTerm).not.toHaveBeenCalled();

      vi.advanceTimersByTime(299);
      expect(mockUserFacade.setSearchTerm).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(mockUserFacade.setSearchTerm).toHaveBeenCalledWith('admin');
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows no-results only when a non-empty search yields no filtered users', () => {
    mockUserFacade.users.set(mockUsers);
    mockUserFacade.searchTerm.set('missing');
    mockUserFacade.filteredUsers.set([]);
    mockUserFacade.pageUsers.set([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.empty-state').textContent).toContain('Không tìm thấy kết quả');

    mockUserFacade.searchTerm.set('');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state').textContent).toContain('Không có tài khoản nào.');
  });

  it('shows the regular empty state for an empty dataset or filter result', () => {
    mockUserFacade.users.set([]);
    mockUserFacade.searchTerm.set('missing');
    mockUserFacade.filteredUsers.set([]);
    mockUserFacade.pageUsers.set([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state').textContent).toContain('Không có tài khoản nào.');

    mockUserFacade.users.set(mockUsers);
    mockUserFacade.searchTerm.set('');
    mockUserFacade.filteredUsers.set([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state').textContent).toContain('Không có tài khoản nào.');
  });

  it('gives loading state precedence over empty results', () => {
    mockUserFacade.users.set([]);
    mockUserFacade.pageUsers.set([]);
    mockUserFacade.loading.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.loading-state')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.empty-state')).toBeNull();
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

  it('does not display modal initially', () => {
    expect(fixture.debugElement.query(By.directive(ModalComponent))).toBeNull();
  });

  it('opens create modal with title "Tạo mới tài khoản" when clicking primary-button', () => {
    const addButton = fixture.nativeElement.querySelector('button.primary-button');
    addButton.click();
    fixture.detectChanges();

    expect(component.showForm()).toBe(true);
    const modalDe = fixture.debugElement.query(By.directive(ModalComponent));
    expect(modalDe).not.toBeNull();
    const modalComp = modalDe.componentInstance as ModalComponent;
    expect(modalComp.title()).toBe('Tạo mới tài khoản');
    expect(fixture.debugElement.query(By.directive(UserFormComponent))).not.toBeNull();
  });

  it('opens edit modal with title "Chỉnh sửa tài khoản" when openEdit is called', () => {
    component.openEdit(mockUsers[0]);
    fixture.detectChanges();

    expect(component.showForm()).toBe(true);
    const modalDe = fixture.debugElement.query(By.directive(ModalComponent));
    expect(modalDe).not.toBeNull();
    const modalComp = modalDe.componentInstance as ModalComponent;
    expect(modalComp.title()).toBe('Chỉnh sửa tài khoản');
    expect(component.editingUser()).toEqual(mockUsers[0]);
    expect(fixture.debugElement.query(By.directive(UserFormComponent))).not.toBeNull();
  });

  it('opens detail modal with title "Chi tiết tài khoản #..." when openDetail is called', () => {
    component.openDetail(mockUsers[1]);
    fixture.detectChanges();

    expect(component.showDetail()).toBe(true);
    const modalDe = fixture.debugElement.query(By.directive(ModalComponent));
    expect(modalDe).not.toBeNull();
    const modalComp = modalDe.componentInstance as ModalComponent;
    expect(modalComp.title()).toBe('Chi tiết tài khoản #' + mockUsers[1].username);
    expect(component.detailedUser()).toEqual(mockUsers[1]);
    expect(fixture.debugElement.query(By.directive(UserDetailComponent))).not.toBeNull();
  });

  it('closes form modal when closeForm is called', () => {
    component.openCreate();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(ModalComponent))).not.toBeNull();

    component.closeForm();
    fixture.detectChanges();
    expect(component.showForm()).toBe(false);
    expect(fixture.debugElement.query(By.directive(ModalComponent))).toBeNull();
  });

  it('closes detail modal when closeDetail is called', () => {
    component.openDetail(mockUsers[0]);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(ModalComponent))).not.toBeNull();

    component.closeDetail();
    fixture.detectChanges();
    expect(component.showDetail()).toBe(false);
    expect(fixture.debugElement.query(By.directive(ModalComponent))).toBeNull();
  });

  it('warns and blocks closing form when form has unsaved changes and user cancels confirm', () => {
    component.openCreate();
    fixture.detectChanges();

    const formComp = fixture.debugElement.query(By.directive(UserFormComponent)).componentInstance as UserFormComponent;
    formComp.form.controls.displayName.setValue('New Name');
    formComp.form.markAsDirty();
    fixture.detectChanges();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    component.closeForm();
    fixture.detectChanges();

    expect(confirmSpy).toHaveBeenCalled();
    expect(component.showForm()).toBe(true);
  });

  it('allows closing form when form has unsaved changes and user confirms', () => {
    component.openCreate();
    fixture.detectChanges();

    const formComp = fixture.debugElement.query(By.directive(UserFormComponent)).componentInstance as UserFormComponent;
    formComp.form.controls.displayName.setValue('New Name');
    formComp.form.markAsDirty();
    fixture.detectChanges();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.closeForm();
    fixture.detectChanges();

    expect(confirmSpy).toHaveBeenCalled();
    expect(component.showForm()).toBe(false);
  });
});