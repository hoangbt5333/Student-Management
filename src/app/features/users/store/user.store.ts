import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
  withHooks
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  catchError,
  exhaustMap,
  finalize,
  forkJoin,
  of,
  pipe,
  switchMap,
  tap
} from 'rxjs';

import { UserService } from '../services/user.service';
import { StudentService } from '../../students/services/student.service';
import { TeacherService } from '../../teachers/services/teacher.service';
import type {
  CreateUserDto,
  UpdateUserDto,
  User,
  UserRole,
  UserStatus
} from '../models/user.model';
import type { Student } from '../../students/models/student.model';
import type { Teacher } from '../../teachers/models/teacher.model';
import { normalizeVietnamese } from '../../../shared/utils/vietnamese.util';

type UserState = {
  users: User[];
  students: Student[];
  teachers: Teacher[];
  selectedUserId: string | null;
  selectedUserIds: string[];
  loading: boolean;
  errorMessage: string;
  successMessage: string;
  searchTerm: string;
  roleFilter: 'all' | UserRole;
  statusFilter: 'all' | UserStatus;
  sortBy: keyof User;
  sortDirection: 'asc' | 'desc';
  page: number;
  pageSize: number;
};

const initialState: UserState = {
  users: [],
  students: [],
  teachers: [],
  selectedUserId: null,
  selectedUserIds: [],
  loading: false,
  errorMessage: '',
  successMessage: '',
  searchTerm: '',
  roleFilter: 'all',
  statusFilter: 'all',
  sortBy: 'createdAt',
  sortDirection: 'desc',
  page: 1,
  pageSize: 5
};

export const UserStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  withComputed(({
    users,
    students,
    teachers,
    selectedUserId,
    selectedUserIds,
    searchTerm,
    roleFilter,
    statusFilter,
    sortBy,
    sortDirection,
    page,
    pageSize
  }) => {
    const selectedUser = computed(() => {
      const id = selectedUserId();
      if (!id) return null;
      return users().find(u => u.id === id) ?? null;
    });

    const activeAdminCount = computed(() => {
      return users().filter(
        u => u.role === 'admin' && (u.status === 'active' || !u.status)
      ).length;
    });

    const linkedStudentIds = computed(() => {
      return new Set(
        users()
          .map(u => u.studentId)
          .filter((id): id is string => Boolean(id))
      );
    });

    const linkedTeacherIds = computed(() => {
      return new Set(
        users()
          .map(u => u.teacherId)
          .filter((id): id is string => Boolean(id))
      );
    });

    const availableStudents = computed(() => {
      const current = selectedUser();
      const currentLinkedId = current?.role === 'student' ? current.studentId : undefined;
      const linked = linkedStudentIds();
      return students().filter(
        s => !linked.has(s.id) || s.id === currentLinkedId
      );
    });

    const availableTeachers = computed(() => {
      const current = selectedUser();
      const currentLinkedId = current?.role === 'teacher' ? current.teacherId : undefined;
      const linked = linkedTeacherIds();
      return teachers().filter(
        t => !linked.has(t.id) || t.id === currentLinkedId
      );
    });

    const filteredUsers = computed(() => {
      const keyword = normalizeVietnamese(searchTerm().trim());
      const role = roleFilter();
      const status = statusFilter();
      const field = sortBy();
      const direction = sortDirection();

      return users()
        .filter(user => {
          if (role !== 'all' && user.role !== role) {
            return false;
          }
          if (status !== 'all' && user.status !== status) {
            return false;
          }
          if (!keyword) {
            return true;
          }

          const idMatch = normalizeVietnamese(user.id).includes(keyword);
          const studentIdMatch = user.studentId ? normalizeVietnamese(user.studentId).includes(keyword) : false;
          const teacherIdMatch = user.teacherId ? normalizeVietnamese(user.teacherId).includes(keyword) : false;
          const usernameMatch = normalizeVietnamese(user.username).includes(keyword);
          const nameMatch = normalizeVietnamese(user.displayName).includes(keyword);
          const emailMatch = normalizeVietnamese(user.email).includes(keyword);
          return idMatch || studentIdMatch || teacherIdMatch || usernameMatch || nameMatch || emailMatch;
        })
        .sort((a, b) => {
          const valA = a[field] ?? '';
          const valB = b[field] ?? '';
          const compare = String(valA).localeCompare(String(valB), 'vi', { numeric: true });
          return direction === 'asc' ? compare : -compare;
        });
    });

    const totalFilteredCount = computed(() => filteredUsers().length);

    const totalPages = computed(() => {
      const total = totalFilteredCount();
      const size = pageSize();
      return Math.max(1, Math.ceil(total / size));
    });

    const pageUsers = computed(() => {
      const list = filteredUsers();
      const current = page();
      const size = pageSize();
      const start = (current - 1) * size;
      return list.slice(start, start + size);
    });

    const selectedUserCount = computed(() => selectedUserIds().length);
    const selectedPageUserCount = computed(() => pageUsers().filter(user => selectedUserIds().includes(user.id)).length);
    const allPageUsersSelected = computed(() => {
      const page = pageUsers();
      return page.length > 0 && selectedPageUserCount() === page.length;
    });
    const canBulkLock = computed(() => selectedUserIds().some(id => {
      const user = users().find(candidate => candidate.id === id);
      return user?.status === 'active' && user.id !== undefined;
    }));
    const canBulkActivate = computed(() => selectedUserIds().some(id => users().some(user => user.id === id && user.status === 'locked')));

    const selectedStudentProfile = computed(() => {
      const user = selectedUser();
      if (!user?.studentId) return null;
      return students().find(s => s.id === user.studentId) ?? null;
    });

    const selectedTeacherProfile = computed(() => {
      const user = selectedUser();
      if (!user?.teacherId) return null;
      return teachers().find(t => t.id === user.teacherId) ?? null;
    });

    return {
      selectedUser,
      selectedUserCount,
      allPageUsersSelected,
      selectedPageUserCount,
      canBulkLock,
      canBulkActivate,
      hasActiveFilters: computed(() => Boolean(searchTerm().trim()) || roleFilter() !== 'all' || statusFilter() !== 'all'),
      activeAdminCount,
      linkedStudentIds,
      linkedTeacherIds,
      availableStudents,
      availableTeachers,
      filteredUsers,
      totalFilteredCount,
      totalPages,
      pageUsers,
      selectedStudentProfile,
      selectedTeacherProfile
    };
  }),

  withMethods((
    store,
    userService = inject(UserService),
    studentService = inject(StudentService),
    teacherService = inject(TeacherService)
  ) => ({
    loadAll: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, errorMessage: '' })),
        switchMap(() =>
          forkJoin({
            users: userService.getUsers(),
            students: studentService.getStudents(),
            teachers: teacherService.getTeachers()
          }).pipe(
            tap(({ users, students, teachers }) => {
              const normalizedUsers: User[] = users.map(u => ({
                ...u,
                status: u.status ?? 'active'
              }));
              patchState(store, {
                users: normalizedUsers,
                students,
                teachers,
                loading: false
              });
            }),
            catchError((err: unknown) => {
              const message = err instanceof Error ? err.message : 'Không thể tải dữ liệu quản lý người dùng.';
              patchState(store, { errorMessage: message, loading: false });
              return of(null);
            })
          )
        )
      )
    ),

    createUser(dto: CreateUserDto): boolean {
      patchState(store, { errorMessage: '', successMessage: '' });

      const cleanUsername = dto.username.trim();
      const isDuplicateUsername = store.users().some(
        u => u.username.trim().toLowerCase() === cleanUsername.toLowerCase()
      );

      if (isDuplicateUsername) {
        patchState(store, {
          errorMessage: `Tên đăng nhập "${cleanUsername}" đã tồn tại trong hệ thống.`
        });
        return false;
      }

      if (dto.role === 'student') {
        if (!dto.studentId) {
          patchState(store, {
            errorMessage: 'Tài khoản sinh viên bắt buộc phải liên kết với một hồ sơ sinh viên.'
          });
          return false;
        }
        if (store.linkedStudentIds().has(dto.studentId)) {
          patchState(store, {
            errorMessage: 'Hồ sơ sinh viên này đã được liên kết với một tài khoản khác.'
          });
          return false;
        }
      }

      if (dto.role === 'teacher') {
        if (!dto.teacherId) {
          patchState(store, {
            errorMessage: 'Tài khoản giảng viên bắt buộc phải liên kết với một hồ sơ giảng viên.'
          });
          return false;
        }
        if (store.linkedTeacherIds().has(dto.teacherId)) {
          patchState(store, {
            errorMessage: 'Hồ sơ giảng viên này đã được liên kết với một tài khoản khác.'
          });
          return false;
        }
      }

      let finalDisplayName = dto.displayName.trim();
      let finalEmail = dto.email.trim();

      if (dto.role === 'student' && dto.studentId) {
        const student = store.students().find(s => s.id === dto.studentId);
        if (student) {
          finalDisplayName = student.name;
          finalEmail = student.email;
        }
      } else if (dto.role === 'teacher' && dto.teacherId) {
        const teacher = store.teachers().find(t => t.id === dto.teacherId);
        if (teacher) {
          finalDisplayName = teacher.name;
          finalEmail = teacher.email;
        }
      }

      const generatedId = 'USR' + String(Date.now()).slice(-5);
      const newUser: User = {
        id: generatedId,
        username: cleanUsername,
        displayName: finalDisplayName,
        email: finalEmail,
        role: dto.role,
        status: dto.status ?? 'active',
        password: dto.password,
        studentId: dto.role === 'student' ? dto.studentId : undefined,
        teacherId: dto.role === 'teacher' ? dto.teacherId : undefined,
        createdAt: new Date().toISOString()
      };

      patchState(store, { loading: true });
      userService.createUser(newUser).pipe(
        finalize(() => patchState(store, { loading: false }))
      ).subscribe({
        next: (created) => {
          patchState(store, {
            users: [...store.users(), created],
            successMessage: `Tạo tài khoản "${created.username}" thành công.`
          });
        },
        error: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Tạo tài khoản thất bại.';
          patchState(store, { errorMessage: message });
        }
      });

      return true;
    },

    updateUser(dto: UpdateUserDto): boolean {
      patchState(store, { errorMessage: '', successMessage: '' });

      const existing = store.users().find(u => u.id === dto.id);
      if (!existing) {
        patchState(store, { errorMessage: 'Không tìm thấy tài khoản cần cập nhật.' });
        return false;
      }

      // Quyết định 3: Không cho phép thay đổi vai trò sau khi tạo
      const immutableRole = existing.role;

      // BR-07: Không cho phép vô hiệu hóa/khóa Admin active cuối cùng
      if (
        immutableRole === 'admin' &&
        existing.status === 'active' &&
        dto.status !== 'active' &&
        store.activeAdminCount() <= 1
      ) {
        patchState(store, {
          errorMessage: 'Không thể khóa hoặc vô hiệu hóa Quản trị viên kích hoạt cuối cùng trong hệ thống.'
        });
        return false;
      }

      if (immutableRole === 'student') {
        if (!dto.studentId) {
          patchState(store, {
            errorMessage: 'Tài khoản sinh viên bắt buộc phải liên kết với một hồ sơ sinh viên.'
          });
          return false;
        }
        const isLinkedByOther = store.users().some(
          u => u.id !== dto.id && u.studentId === dto.studentId
        );
        if (isLinkedByOther) {
          patchState(store, {
            errorMessage: 'Hồ sơ sinh viên này đã được liên kết với một tài khoản khác.'
          });
          return false;
        }
      }

      if (immutableRole === 'teacher') {
        if (!dto.teacherId) {
          patchState(store, {
            errorMessage: 'Tài khoản giảng viên bắt buộc phải liên kết với một hồ sơ giảng viên.'
          });
          return false;
        }
        const isLinkedByOther = store.users().some(
          u => u.id !== dto.id && u.teacherId === dto.teacherId
        );
        if (isLinkedByOther) {
          patchState(store, {
            errorMessage: 'Hồ sơ giảng viên này đã được liên kết với một tài khoản khác.'
          });
          return false;
        }
      }

      let finalDisplayName = dto.displayName.trim();
      let finalEmail = dto.email.trim();

      if (immutableRole === 'student' && dto.studentId) {
        const student = store.students().find(s => s.id === dto.studentId);
        if (student) {
          finalDisplayName = student.name;
          finalEmail = student.email;
        }
      } else if (immutableRole === 'teacher' && dto.teacherId) {
        const teacher = store.teachers().find(t => t.id === dto.teacherId);
        if (teacher) {
          finalDisplayName = teacher.name;
          finalEmail = teacher.email;
        }
      }

      const updatedUser: User = {
        ...existing,
        displayName: finalDisplayName,
        email: finalEmail,
        status: dto.status,
        studentId: immutableRole === 'student' ? dto.studentId : undefined,
        teacherId: immutableRole === 'teacher' ? dto.teacherId : undefined,
        updatedAt: new Date().toISOString()
      };

      patchState(store, { loading: true });
      userService.updateUser(updatedUser).pipe(
        finalize(() => patchState(store, { loading: false }))
      ).subscribe({
        next: (saved) => {
          patchState(store, {
            users: store.users().map(u => (u.id === saved.id ? saved : u)),
            successMessage: `Cập nhật thông tin tài khoản "${saved.username}" thành công.`
          });
        },
        error: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Cập nhật tài khoản thất bại.';
          patchState(store, { errorMessage: message });
        }
      });

      return true;
    },

    changeUserStatus(userId: string, newStatus: UserStatus, currentAdminId?: string): boolean {
      patchState(store, { errorMessage: '', successMessage: '' });

      const target = store.users().find(u => u.id === userId);
      if (!target) {
        patchState(store, { errorMessage: 'Không tìm thấy tài khoản để đổi trạng thái.' });
        return false;
      }

      // BR-06: Chặn tự khóa/vô hiệu hóa chính mình
      if (
        (newStatus === 'locked' || newStatus === 'inactive') &&
        currentAdminId &&
        target.id === currentAdminId
      ) {
        patchState(store, {
          errorMessage: 'Không thể tự khóa hoặc vô hiệu hóa tài khoản của chính bạn.'
        });
        return false;
      }

      // BR-07: Bảo vệ Admin active cuối cùng
      if (
        target.role === 'admin' &&
        target.status === 'active' &&
        newStatus !== 'active' &&
        store.activeAdminCount() <= 1
      ) {
        patchState(store, {
          errorMessage: 'Không thể khóa hoặc vô hiệu hóa Quản trị viên kích hoạt cuối cùng trong hệ thống.'
        });
        return false;
      }

      const statusLabels: Record<UserStatus, string> = {
        active: 'kích hoạt',
        locked: 'khóa',
        inactive: 'vô hiệu hóa'
      };

      patchState(store, { loading: true });
      const updatedAt = new Date().toISOString();
      userService.patchUser(userId, { status: newStatus, updatedAt }).pipe(
        finalize(() => patchState(store, { loading: false }))
      ).subscribe({
        next: (saved) => {
          patchState(store, {
            users: store.users().map(u => (u.id === saved.id ? saved : u)),
            successMessage: `Đã ${statusLabels[newStatus]} tài khoản "${saved.username}" thành công.`
          });
        },
        error: (err: unknown) => {
          const message = err instanceof Error ? err.message : 'Đổi trạng thái tài khoản thất bại.';
          patchState(store, { errorMessage: message });
        }
      });

      return true;
    },

    resetFilters(): void {
      patchState(store, { searchTerm: '', roleFilter: 'all', statusFilter: 'all', page: 1 });
    },

    setSearchTerm(searchTerm: string): void {
      patchState(store, { searchTerm, page: 1 });
    },

    setRoleFilter(roleFilter: 'all' | UserRole): void {
      patchState(store, { roleFilter, page: 1 });
    },

    setStatusFilter(statusFilter: 'all' | UserStatus): void {
      patchState(store, { statusFilter, page: 1 });
    },

    setSortBy(sortBy: keyof User): void {
      patchState(store, { sortBy, page: 1 });
    },

    setSortDirection(sortDirection: 'asc' | 'desc'): void {
      patchState(store, { sortDirection, page: 1 });
    },

    setPage(page: number): void {
      patchState(store, { page });
    },

    setPageSize(pageSize: number): void {
      patchState(store, { pageSize, page: 1 });
    },

    selectUser(selectedUserId: string | null): void {
      patchState(store, { selectedUserId });
    },

    toggleUserSelection(id: string): void {
      const ids = store.selectedUserIds();
      patchState(store, { selectedUserIds: ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id] });
    },

    togglePageSelection(): void {
      const pageIds = store.pageUsers().map(user => user.id);
      const selected = new Set(store.selectedUserIds());
      const allSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));
      patchState(store, { selectedUserIds: allSelected
        ? [...selected].filter(id => !pageIds.includes(id))
        : [...selected, ...pageIds.filter(id => !selected.has(id))] });
    },

    clearSelection(): void {
      patchState(store, { selectedUserIds: [] });
    },

    bulkChangeUserStatus(status: 'locked' | 'active', currentAdminId?: string): void {
      patchState(store, { errorMessage: '', successMessage: '' });
      const candidates = store.selectedUserIds().map(id => store.users().find(user => user.id === id))
        .filter((user): user is User => user !== undefined)
        .filter(user => user.status !== status &&
          (status !== 'locked' || user.status === 'active') &&
          (status !== 'active' || user.status === 'locked'));
      let remainingActiveAdmins = store.activeAdminCount();
      const allowed = candidates.filter(user => {
        if (status !== 'locked') return true;
        if (user.id === currentAdminId) return false;
        if (user.role === 'admin' && user.status === 'active') {
          if (remainingActiveAdmins <= 1) return false;
          remainingActiveAdmins--;
        }
        return true;
      });
      const timestamp = new Date().toISOString();
      if (!allowed.length) {
        patchState(store, { errorMessage: 'Không có tài khoản phù hợp để cập nhật.' });
        return;
      }
      patchState(store, { loading: true });
      forkJoin(allowed.map(user => userService.patchUser(user.id, { status, updatedAt: timestamp }).pipe(
        catchError(() => of(null as User | null))
      ))).pipe(finalize(() => patchState(store, { loading: false }))).subscribe((results: (User | null)[]) => {
        const succeeded = results.filter((result): result is User => result !== null);
        patchState(store, {
          users: store.users().map(user => succeeded.find((saved: User) => saved.id === user.id) ?? user),
          selectedUserIds: store.selectedUserIds().filter(id => !succeeded.some((saved: User) => saved.id === id)),
          successMessage: succeeded.length ? `Đã cập nhật ${succeeded.length} tài khoản.` : '',
          errorMessage: succeeded.length < allowed.length ? 'Một số tài khoản không thể cập nhật.' : ''
        });
      });
    },

    clearMessages(): void {
      patchState(store, { errorMessage: '', successMessage: '' });
    }
  }))
);
