
import { computed, inject } from '@angular/core';

import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState
} from '@ngrx/signals';
import {
  EMPTY,
  catchError,
  exhaustMap,
  finalize,
  pipe,
  switchMap,
  tap
} from 'rxjs';

import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { StudentService } from './student';
import type { Student } from './student';

type StudentState = {
  students: Student[];
  loading: boolean;
  errorMessage: string;
  successMessage: string;
  searchTerm: string;
};

type SaveStudentRequest = {
  student: Student;
  mode: 'add' | 'update';
};

const initialState: StudentState = {
  students: [],
  loading: false,
  errorMessage: '',
  successMessage: '',
  searchTerm: ''
};



export const StudentStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  withComputed(({ students, searchTerm }) => ({
    studentCount: computed(() => students().length),

    filteredStudents: computed(() => {
      const keyword = searchTerm().trim().toLowerCase();

      if (!keyword) {
        return students();
      }

      return students().filter(student =>
        student.id.toLowerCase().includes(keyword) ||
        student.name.toLowerCase().includes(keyword)
      );
    })
  })),

  withMethods((store, studentService = inject(StudentService)) => {
    function load(): void {
      patchState(store, {
        loading: true,
        errorMessage: ''
      });

      studentService.getStudents().subscribe({
        next: (students) => {
          patchState(store, {
            students,
            loading: false
          });
        },
        error: (error) => {
          console.error('Lỗi tải sinh viên:', error);

          patchState(store, {
            loading: false,
            errorMessage: 'Không thể tải danh sách sinh viên.'
          });
        }
      });
    }

    return {
      loadStudents(): void {
        load();
      },

      setSearchTerm(searchTerm: string): void {
        patchState(store, { searchTerm });
      },

      addStudent(student: Student): void {
        patchState(store, {
          loading: true,
          errorMessage: ''
        });

        studentService.addStudent(student).subscribe({
          next: () => load(),
          error: (error) => {
            console.error('Lỗi thêm sinh viên:', error);

            patchState(store, {
              loading: false,
              errorMessage: 'Không thể thêm sinh viên.'
            });
          }
        });
      },

      updateStudent(student: Student): void {
        patchState(store, {
          loading: true,
          errorMessage: ''
        });

        studentService.updateStudent(student).subscribe({
          next: () => load(),
          error: (error) => {
            console.error('Lỗi cập nhật sinh viên:', error);

            patchState(store, {
              loading: false,
              errorMessage: 'Không thể cập nhật sinh viên.'
            });
          }
        });
      },

      saveStudent: rxMethod<SaveStudentRequest>(
        pipe(
          tap(() => {
            patchState(store, {
              loading: true,
              errorMessage: '',
              successMessage: ''
            });
          }),

          exhaustMap(({ student, mode }) => {
            const request$ =
              mode === 'add'
                ? studentService.addStudent(student)
                : studentService.updateStudent(student);

            return request$.pipe(
              // Chỉ tải lại danh sách sau khi API ghi dữ liệu thành công
              switchMap(() => studentService.getStudents()),

              // Chỉ cập nhật danh sách và báo thành công khi tải lại xong
              tap((students) => {
                patchState(store, {
                  students,
                  successMessage:
                    mode === 'add'
                      ? 'Thêm sinh viên thành công.'
                      : 'Cập nhật sinh viên thành công.'
                });
              }),

              catchError((error) => {
                console.error('Lỗi lưu sinh viên:', error);

                patchState(store, {
                  errorMessage:
                    'Không thể hoàn tất thao tác. Vui lòng kiểm tra và thử lại.'
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

      deleteStudent(id: string): void {
        patchState(store, {
          loading: true,
          errorMessage: ''
        });

        studentService.deleteStudent(id).subscribe({
          next: () => load(),
          error: (error) => {
            console.error('Lỗi xóa sinh viên:', error);

            patchState(store, {
              loading: false,
              errorMessage: 'Không thể xóa sinh viên.'
            });
          }
        });
      }
    };
  })
);

