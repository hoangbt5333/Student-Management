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

import { ClassService } from '../services/class.service';
import { ClassModel, CreateClassDto, UpdateClassDto } from '../models/class.model';
import { normalizeVietnamese } from '../../../shared/utils/vietnamese.util';

type ClassSortField = keyof ClassModel;

type ClassState = {
  classes: ClassModel[];
  loading: boolean;
  errorMessage: string;
  successMessage: string;
  searchTerm: string;
  sortBy: ClassSortField;
  sortDirection: 'asc' | 'desc';
  page: number;
  pageSize: number;
};

type SaveClassRequest = {
  classItem: ClassModel;
  mode: 'add' | 'update';
};

const initialState: ClassState = {
  classes: [],
  loading: false,
  errorMessage: '',
  successMessage: '',
  searchTerm: '',
  sortBy: 'name',
  sortDirection: 'asc',
  page: 1,
  pageSize: 5
};

export const ClassStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  withComputed(({
    classes,
    searchTerm,
    sortBy,
    sortDirection,
    page,
    pageSize
  }) => {
    const filteredClasses = computed(() => {
      const keyword = normalizeVietnamese(searchTerm());

      return classes()
        .filter((classItem) => {
          if (!keyword) {
            return true;
          }

          return [
            classItem.code,
            classItem.id,
            classItem.name,
            classItem.department,
            classItem.academicYear
          ].some((value) => normalizeVietnamese(value ?? '').includes(keyword));
        })
        .sort((first, second) => {
          const field = sortBy();
          const firstValue = field === 'id' ? first.code ?? first.id : first[field] ?? '';
          const secondValue = field === 'id' ? second.code ?? second.id : second[field] ?? '';

          const comparison = String(firstValue).localeCompare(
            String(secondValue),
            'vi',
            { sensitivity: 'base', numeric: true }
          );

          return sortDirection() === 'asc' ? comparison : -comparison;
        });
    });

    const totalPages = computed(() => {
      const size = pageSize();
      return Math.max(1, Math.ceil(filteredClasses().length / (size > 0 ? size : 1)));
    });

    const currentPage = computed(() => {
      return Math.min(Math.max(1, page()), totalPages());
    });

    const pageClasses = computed(() => {
      const start = (currentPage() - 1) * pageSize();
      return filteredClasses().slice(start, start + pageSize());
    });

    return {
      classCount: computed(() => classes().length),
      filteredClasses,
      filteredClassCount: computed(() => filteredClasses().length),
      totalPages,
      currentPage,
      pageClasses
    };
  }),

  withMethods((store, classService = inject(ClassService)) => {
    function load(): void {
      patchState(store, {
        loading: true,
        errorMessage: ''
      });

      classService.getAll().subscribe({
        next: (classes) => {
          patchState(store, {
            classes,
            loading: false
          });
        },
        error: (error) => {
          console.error('Lỗi tải danh sách lớp:', error);
          patchState(store, {
            loading: false,
            errorMessage: 'Không thể tải danh sách lớp.'
          });
        }
      });
    }

    return {
      loadClasses(): void {
        load();
      },

      setSearchTerm(searchTerm: string): void {
        patchState(store, { searchTerm, page: 1 });
      },

      setSortBy(sortBy: ClassSortField): void {
        patchState(store, { sortBy, page: 1 });
      },

      setSortDirection(sortDirection: 'asc' | 'desc'): void {
        patchState(store, { sortDirection, page: 1 });
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

      saveClass: rxMethod<SaveClassRequest>(
        pipe(
          tap(() => {
            patchState(store, {
              loading: true,
              errorMessage: '',
              successMessage: ''
            });
          }),

          exhaustMap(({ classItem, mode }) => {
            const classCode = (classItem.code ?? classItem.id).trim().toLocaleLowerCase();
            const duplicateCode = store.classes().some((item) =>
              (item.code ?? item.id).trim().toLocaleLowerCase() === classCode
              && (mode === 'add' || item.id !== classItem.id)
            );

            if (duplicateCode) {
              patchState(store, {
                errorMessage: `Mã lớp "${classItem.code ?? classItem.id}" đã tồn tại.`,
                loading: false
              });
              return EMPTY;
            }

            const request$ = mode === 'add'
              ? classService.create(classItem)
              : classService.update(classItem.id, classItem);

            return request$.pipe(
              switchMap(() => classService.getAll()),

              tap((classes) => {
                patchState(store, {
                  classes,
                  successMessage: mode === 'add'
                    ? 'Thêm lớp thành công.'
                    : 'Cập nhật lớp thành công.'
                });
              }),

              catchError((error) => {
                console.error('Lỗi lưu lớp:', error);
                patchState(store, {
                  errorMessage:
                    'Không thể lưu lớp. Hãy kiểm tra dữ liệu và thử lại.'
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

      deleteClass: rxMethod<string>(
        pipe(
          tap(() => {
            patchState(store, {
              loading: true,
              errorMessage: '',
              successMessage: ''
            });
          }),

          exhaustMap((id) =>
            classService.delete(id).pipe(
              switchMap(() => classService.getAll()),

              tap((classes) => {
                patchState(store, {
                  classes,
                  successMessage: 'Xóa lớp thành công.'
                });
              }),

              catchError((error) => {
                console.error('Lỗi xóa lớp:', error);
                patchState(store, {
                  errorMessage:
                    'Không thể xóa lớp. Vui lòng thử lại.'
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
