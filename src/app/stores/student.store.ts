
import { computed, inject } from '@angular/core';

import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState
} from '@ngrx/signals';

import { StudentService } from '../services/student';
import type { Student } from '../services/student';

type StudentState = {
  students: Student[];
  loading: boolean;
  errorMessage: string;
  searchTerm: string;
};

const initialState: StudentState = {
  students: [],
  loading: false,
  errorMessage: '',
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

