import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  EMPTY,
  catchError,
  exhaustMap,
  finalize,
  pipe,
  switchMap,
  tap
} from 'rxjs';

import { TeacherService } from '../services/teacher.service';
import type { Teacher } from '../models/teacher.model';
import { normalizeVietnamese } from '../../../shared/utils/vietnamese.util';

type TeacherState = {
  teachers: Teacher[];
  loading: boolean;
  errorMessage: string;
  successMessage: string;
  searchTerm: string;
  page: number;
  pageSize: number;
};

type SaveTeacherRequest = {
  teacher: Teacher;
  mode: 'add' | 'update';
};

const initialState: TeacherState = {
  teachers: [],
  loading: false,
  errorMessage: '',
  successMessage: '',
  searchTerm: '',
  page: 1,
  pageSize: 5
};

export const TeacherStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  withComputed(({ teachers, searchTerm, page, pageSize }) => {
    const filteredTeachers = computed(() => {
      const keyword = normalizeVietnamese(searchTerm());
      if (!keyword) {
        return teachers();
      }

      return teachers().filter((teacher) =>
        [teacher.code ?? teacher.id, teacher.name, teacher.email, teacher.department].some(
          (value) => normalizeVietnamese(value).includes(keyword)
        )
      );
    });

    const totalPages = computed(() =>
      Math.max(1, Math.ceil(filteredTeachers().length / pageSize()))
    );
    const currentPage = computed(() => Math.min(Math.max(1, page()), totalPages()));

    return {
      teacherCount: computed(() => teachers().length),
      filteredTeachers,
      filteredTeacherCount: computed(() => filteredTeachers().length),
      currentPage,
      totalPages,
      pageTeachers: computed(() => {
        const start = (currentPage() - 1) * pageSize();
        return filteredTeachers().slice(start, start + pageSize());
      })
    };
  }),

  withMethods((store, teacherService = inject(TeacherService)) => {
    function load(): void {
      patchState(store, {
        loading: true,
        errorMessage: ''
      });

      teacherService.getTeachers().subscribe({
        next: (teachers) => {
          patchState(store, {
            teachers,
            loading: false
          });
        },
        error: (error) => {
          console.error('Lỗi tải giảng viên:', error);
          patchState(store, {
            loading: false,
            errorMessage: 'Không thể tải danh sách giảng viên.'
          });
        }
      });
    }

    return {
      loadTeachers(): void {
        load();
      },

      setSearchTerm(searchTerm: string): void {
        patchState(store, { searchTerm, page: 1 });
      },

      setPage(page: number): void {
        patchState(store, {
          page: Math.min(Math.max(1, Math.floor(page)), store.totalPages())
        });
      },

      setPageSize(pageSize: number): void {
        if (!Number.isInteger(pageSize) || pageSize < 1) {
          throw new RangeError('Page size must be a positive integer.');
        }

        patchState(store, { pageSize, page: 1 });
      },

      clearMessages(): void {
        patchState(store, {
          errorMessage: '',
          successMessage: ''
        });
      },

      saveTeacher: rxMethod<SaveTeacherRequest>(
        pipe(
          tap(() => {
            patchState(store, {
              loading: true,
              errorMessage: '',
              successMessage: ''
            });
          }),

          exhaustMap(({ teacher, mode }) => {
            const teacherCode = (teacher.code ?? teacher.id).trim().toLocaleLowerCase();
            const duplicateCode = store.teachers().some((item) =>
              (item.code ?? item.id).trim().toLocaleLowerCase() === teacherCode
              && (mode === 'add' || item.id !== teacher.id)
            );

            if (duplicateCode) {
              patchState(store, {
                errorMessage: `Mã giảng viên "${teacher.code ?? teacher.id}" đã tồn tại.`,
                loading: false
              });
              return EMPTY;
            }

            const request$ = mode === 'add'
              ? teacherService.createTeacher(teacher)
              : teacherService.updateTeacher(teacher);

            return request$.pipe(
              switchMap(() => teacherService.getTeachers()),

              tap((teachers) => {
                patchState(store, {
                  teachers,
                  successMessage: mode === 'add'
                    ? 'Đã thêm giảng viên.'
                    : 'Đã cập nhật giảng viên.'
                });
              }),

              catchError((error) => {
                console.error('Lỗi lưu giảng viên:', error);
                patchState(store, {
                  errorMessage: 'Không thể lưu giảng viên. Vui lòng thử lại.'
                });
                return EMPTY;
              }),

              finalize(() => {
                patchState(store, { loading: false });
              })
            );
          })
        )
      ),

      deleteTeacher: rxMethod<string>(
        pipe(
          tap(() => {
            patchState(store, {
              loading: true,
              errorMessage: '',
              successMessage: ''
            });
          }),

          exhaustMap((id) =>
            teacherService.deleteTeacher(id).pipe(
              switchMap(() => teacherService.getTeachers()),

              tap((teachers) => {
                patchState(store, {
                  teachers,
                  successMessage: 'Đã xóa giảng viên.'
                });
              }),

              catchError((error) => {
                console.error('Lỗi xóa giảng viên:', error);
                patchState(store, {
                  errorMessage: 'Không thể xóa giảng viên.'
                });
                return EMPTY;
              }),

              finalize(() => {
                patchState(store, { loading: false });
              })
            )
          )
        )
      )
    };
  })
);
