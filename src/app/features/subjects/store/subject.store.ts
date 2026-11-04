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

type SubjectState = {
  subjects: Subject[];
  loading: boolean;
  errorMessage: string;
  successMessage: string;
  searchTerm: string;
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
  searchTerm: ''
};

export const SubjectStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  withComputed(({ subjects, searchTerm }) => {
    const filteredSubjects = computed(() => {
      const keyword = searchTerm().trim().toLocaleLowerCase('vi');
      if (!keyword) {
        return subjects();
      }

      return subjects().filter((subject) =>
        [subject.code ?? subject.id, subject.name].some((value) =>
          value.toLocaleLowerCase('vi').includes(keyword)
        )
      );
    });

    return {
      subjectCount: computed(() => subjects().length),
      filteredSubjects,
      filteredSubjectCount: computed(() => filteredSubjects().length)
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
        patchState(store, { searchTerm });
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
