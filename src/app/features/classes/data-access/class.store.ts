
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

import { ClassService } from './class.service';
import { ClassModel, CreateClassDto, UpdateClassDto } from './models/class.model';

type ClassSortField = keyof ClassModel;

type ClassState = {
  classes: ClassModel[];
  loading: boolean;
  errorMessage: string;
  successMessage: string;
  searchTerm: string;
  sortBy: ClassSortField;
  sortDirection: 'asc' | 'desc';
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
  sortDirection: 'asc'
};

function normalizeText(value: string | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi');
}

export const ClassStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  withComputed(({
    classes,
    searchTerm,
    sortBy,
    sortDirection
  }) => {
    const filteredClasses = computed(() => {
      const keyword = normalizeText(searchTerm().trim());

      return classes()
        .filter((item) => {
          if (!keyword) return true;

          return [
            item.id,
            item.code,
            item.name,
            item.department,
            item.academicYear
          ].some((value) => normalizeText(value).includes(keyword));
        })
        .sort((first, second) => {
          const comparison = String(first[sortBy()] ?? '').localeCompare(
            String(second[sortBy()] ?? ''),
            'vi',
            { sensitivity: 'base', numeric: true }
          );

          return sortDirection() === 'asc'
            ? comparison
            : -comparison;
        });
    });

    return {
      filteredClasses,
      classCount: computed(() => classes().length),
      filteredClassCount: computed(() => filteredClasses().length)
    };
  }),

  withMethods((store, classService = inject(ClassService)) => {
    function load(): void {
      patchState(store, {
        loading: true,
        errorMessage: '',
        successMessage: ''
      });

      classService.getAll().pipe(
        tap((classes) => {
          patchState(store, { classes });
        }),
        catchError((error) => {
          console.error('Lỗi tải danh sách lớp:', error);
          patchState(store, {
            errorMessage: 'Không thể tải danh sách lớp.'
          });
          return EMPTY;
        }),
        finalize(() => {
          patchState(store, { loading: false });
        })
      ).subscribe();
    }

    function hasDuplicateId(
      classItem: ClassModel,
      mode: 'add' | 'update'
    ): boolean {
      return store.classes().some((item) => {
        const sameId =
          (item.code ?? item.id).trim().toLocaleLowerCase() ===
          classItem.id.trim().toLocaleLowerCase();

        return sameId && (mode === 'add' || item.id !== classItem.id);
      });
    }

    return {
      loadClasses(): void {
        load();
      },

      setSearchTerm(searchTerm: string): void {
        patchState(store, { searchTerm });
      },

      setSortBy(sortBy: ClassSortField): void {
        patchState(store, { sortBy });
      },

      setSortDirection(sortDirection: 'asc' | 'desc'): void {
        patchState(store, { sortDirection });
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
            if (hasDuplicateId(classItem, mode)) {
              patchState(store, {
                errorMessage: `Mã lớp "${classItem.id}" đã tồn tại.`,
                loading: false
              });

              return EMPTY;
            }
            
            const request$ = (() => {
                if (mode === 'add') {
                    return classService.create(classItem);
                }

                const { id, ...data } = classItem;
                return classService.update(id, data);
            })();

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
