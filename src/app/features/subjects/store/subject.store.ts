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

import { SubjectService } from '../services/subject.service';
import type { Subject } from '../models/subject.model';
import { normalizeVietnamese } from '../../../shared/utils/vietnamese.util';

type SubjectState = {
  subjects: Subject[];
  loading: boolean;
  errorMessage: string;
  successMessage: string;
  searchTerm: string;
  page: number;
  pageSize: number;
};

type SaveSubjectRequest = {
  subject: Subject;
  mode: 'add' | 'update';
};

const initialState: SubjectState = {
  subjects: [],
  loading: false,
  errorMessage: '',
  successMessage: '',
  searchTerm: '',
  page: 1,
  pageSize: 5
};

export const SubjectStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  withComputed(({ subjects, searchTerm, page, pageSize }) => {
    const filteredSubjects = computed(() => {
      const keyword = normalizeVietnamese(searchTerm());
      if (!keyword) {
        return subjects();
      }

      return subjects().filter((subject) =>
        [subject.code ?? subject.id, subject.name].some((value) =>
          normalizeVietnamese(value).includes(keyword)
        )
      );
    });

    const totalPages = computed(() => {
      const size = pageSize();
      return Math.max(1, Math.ceil(filteredSubjects().length / (size > 0 ? size : 1)));
    });

    const currentPage = computed(() => {
      return Math.min(Math.max(1, page()), totalPages());
    });

    const pageSubjects = computed(() => {
      const start = (currentPage() - 1) * pageSize();
      return filteredSubjects().slice(start, start + pageSize());
    });

    return {
      subjectCount: computed(() => subjects().length),
      filteredSubjects,
      filteredSubjectCount: computed(() => filteredSubjects().length),
      totalPages,
      currentPage,
      pageSubjects
    };
  }),

  withMethods((store, subjectService = inject(SubjectService)) => {
    function load(): void {
      patchState(store, {
        loading: true,
        errorMessage: ''
      });

      subjectService.getSubjects().subscribe({
        next: (subjects) => {
          patchState(store, {
            subjects,
            loading: false
          });
        },
        error: (error) => {
          console.error('Lỗi tải danh sách môn học:', error);
          patchState(store, {
            loading: false,
            errorMessage: 'Không thể tải danh sách môn học.'
          });
        }
      });
    }

    return {
      loadSubjects(): void {
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

      saveSubject: rxMethod<SaveSubjectRequest>(
        pipe(
          tap(() => {
            patchState(store, {
              loading: true,
              errorMessage: '',
              successMessage: ''
            });
          }),

          exhaustMap(({ subject, mode }) => {
            const subjectCode = (subject.code ?? subject.id).trim().toLocaleLowerCase();
            const duplicateCode = store.subjects().some((item) =>
              (item.code ?? item.id).trim().toLocaleLowerCase() === subjectCode
              && (mode === 'add' || item.id !== subject.id)
            );

            if (duplicateCode) {
              patchState(store, {
                errorMessage: `Mã môn học "${subject.code ?? subject.id}" đã tồn tại.`,
                loading: false
              });
              return EMPTY;
            }

            const request$ = mode === 'add'
              ? subjectService.createSubject(subject)
              : subjectService.updateSubject(subject);

            return request$.pipe(
              switchMap(() => subjectService.getSubjects()),

              tap((subjects) => {
                patchState(store, {
                  subjects,
                  successMessage: mode === 'add'
                    ? 'Đã thêm môn học.'
                    : 'Đã cập nhật môn học.'
                });
              }),

              catchError((error) => {
                console.error('Lỗi lưu môn học:', error);
                patchState(store, {
                  errorMessage: 'Không thể lưu môn học. Vui lòng thử lại.'
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

      deleteSubject: rxMethod<string>(
        pipe(
          tap(() => {
            patchState(store, {
              loading: true,
              errorMessage: '',
              successMessage: ''
            });
          }),

          exhaustMap((id) =>
            subjectService.deleteSubject(id).pipe(
              switchMap(() => subjectService.getSubjects()),

              tap((subjects) => {
                patchState(store, {
                  subjects,
                  successMessage: 'Đã xóa môn học.'
                });
              }),

              catchError((error) => {
                console.error('Lỗi xóa môn học:', error);
                patchState(store, {
                  errorMessage: 'Không thể xóa môn học.'
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
