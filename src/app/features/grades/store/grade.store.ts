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

import { GradeService } from '../services/grade.service';
import type { Grade } from '../models/grade.model';

type GradeState = {
  grades: Grade[];
  loading: boolean;
  errorMessage: string;
  successMessage: string;
  studentFilter: string;
  subjectFilter: string;
  page: number;
  pageSize: number;
};

export type SaveGradeRequest = {
  grade: Omit<Grade, 'id'> & { id?: string };
  mode: 'add' | 'update';
};

const initialState: GradeState = {
  grades: [],
  loading: false,
  errorMessage: '',
  successMessage: '',
  studentFilter: '',
  subjectFilter: '',
  page: 1,
  pageSize: 5
};

export const GradeStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  withComputed(({ grades, studentFilter, subjectFilter, page, pageSize }) => {
    const filteredGrades = computed(() => {
      const currentStudent = studentFilter();
      const currentSubject = subjectFilter();

      return grades().filter((grade) =>
        (!currentStudent || grade.studentId === currentStudent) &&
        (!currentSubject || grade.subjectId === currentSubject)
      );
    });

    const averageScore = computed(() => {
      const validScores = filteredGrades()
        .map((grade) => grade.score)
        .filter((score) => score >= 0 && score <= 10);

      return validScores.length
        ? (validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(2)
        : '—';
    });

    const totalPages = computed(() =>
      Math.max(1, Math.ceil(filteredGrades().length / pageSize()))
    );
    const currentPage = computed(() => Math.min(Math.max(1, page()), totalPages()));

    return {
      gradeCount: computed(() => grades().length),
      filteredGrades,
      filteredGradeCount: computed(() => filteredGrades().length),
      currentPage,
      totalPages,
      pageGrades: computed(() => {
        const start = (currentPage() - 1) * pageSize();
        return filteredGrades().slice(start, start + pageSize());
      }),
      averageScore
    };
  }),

  withMethods((store, gradeService = inject(GradeService)) => {
    function load(): void {
      patchState(store, {
        loading: true,
        errorMessage: ''
      });

      gradeService.getGrades().subscribe({
        next: (grades) => {
          patchState(store, {
            grades,
            loading: false
          });
        },
        error: (error) => {
          console.error('Lỗi tải bảng điểm:', error);
          patchState(store, {
            loading: false,
            errorMessage: 'Không thể tải bảng điểm. Hãy kiểm tra Mock API.'
          });
        }
      });
    }

    return {
      loadGrades(): void {
        load();
      },

      setStudentFilter(studentFilter: string): void {
        patchState(store, { studentFilter, page: 1 });
      },

      setSubjectFilter(subjectFilter: string): void {
        patchState(store, { subjectFilter, page: 1 });
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

      saveGrade: rxMethod<SaveGradeRequest>(
        pipe(
          tap(() => {
            patchState(store, {
              loading: true,
              errorMessage: '',
              successMessage: ''
            });
          }),

          exhaustMap(({ grade, mode }) => {
            const duplicate = store.grades().some((item) =>
              item.studentId === grade.studentId
              && item.subjectId === grade.subjectId
              && (mode === 'add' || item.id !== grade.id)
            );

            if (duplicate) {
              patchState(store, {
                errorMessage: 'Sinh viên đã có điểm cho môn học này. Hãy sửa điểm hiện tại.',
                loading: false
              });
              return EMPTY;
            }

            const request$ = mode === 'add' || !grade.id
              ? gradeService.createGrade({
                  studentId: grade.studentId,
                  subjectId: grade.subjectId,
                  score: grade.score
                })
              : gradeService.updateGrade({
                  id: grade.id,
                  studentId: grade.studentId,
                  subjectId: grade.subjectId,
                  score: grade.score
                });

            return request$.pipe(
              switchMap(() => gradeService.getGrades()),

              tap((grades) => {
                patchState(store, {
                  grades,
                  successMessage: mode === 'add'
                    ? 'Đã thêm điểm.'
                    : 'Đã cập nhật điểm.'
                });
              }),

              catchError((error) => {
                console.error('Lỗi lưu điểm:', error);
                patchState(store, {
                  errorMessage: 'Không thể lưu điểm.'
                });
                return EMPTY;
              }),

              finalize(() => {
                patchState(store, { loading: false });
              })
            );
          })
        )
      )
    };
  })
);
