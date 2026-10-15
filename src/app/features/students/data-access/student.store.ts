
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
  classFilter: string;
  facultyFilter: string;
  sortBy: keyof Student;
  sortDirection: 'asc' | 'desc';
  page: number;
  pageSize: number;
};

type StudentSortField = keyof Student;

type SaveStudentRequest = {
  student: Student;
  mode: 'add' | 'update';
};

function normalizeText(value: string | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi');
}

const initialState: StudentState = {
  students: [],
  loading: false,
  errorMessage: '',
  successMessage: '',
  searchTerm: '',
  classFilter: '',
  facultyFilter: '',
  sortBy: 'name',
  sortDirection: 'asc',
  page: 1,
  pageSize: 5
};



export const StudentStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  withComputed(({
    students,
    searchTerm,
    classFilter,
    facultyFilter,
    sortBy,
    sortDirection,
    page,
    pageSize
  }) => {
    const filteredStudents = computed(() => {
      const keyword = normalizeText(searchTerm().trim());

      return students()
        .filter((student) => {
          const matchesSearch = !keyword || [
            student.id,
            student.name,
            student.email,
            student.phone,
            student.className,
            student.faculty
          ].some((value) => normalizeText(value).includes(keyword));

          return matchesSearch
            && (!classFilter() || student.className?.trim() === classFilter())
            && (!facultyFilter() || student.faculty?.trim() === facultyFilter());
        })
        .sort((first, second) => {
          const firstValue = first[sortBy()] ?? '';
          const secondValue = second[sortBy()] ?? '';
          const comparison = String(firstValue).localeCompare(
            String(secondValue),
            'vi',
            { sensitivity: 'base', numeric: true }
          );

          return sortDirection() === 'asc' ? comparison : -comparison;
        });
    });

    const totalPages = computed(() => Math.max(
      1,
      Math.ceil(filteredStudents().length / pageSize())
    ));
    const currentPage = computed(() => Math.min(page(), totalPages()));

    return {
      studentCount: computed(() => students().length),
      filteredStudents,
      filteredStudentCount: computed(() => filteredStudents().length),

      classOptions: computed(() => [...new Set(
        students()
          .map((student) => student.className?.trim() ?? '')
          .filter(Boolean)
      )].sort((first, second) => first.localeCompare(second, 'vi'))),

      facultyOptions: computed(() => [...new Set(
        students()
          .map((student) => student.faculty?.trim() ?? '')
          .filter(Boolean)
      )].sort((first, second) => first.localeCompare(second, 'vi'))),

      totalPages,
      currentPage,

      pageStudents: computed(() => {
        const start = (currentPage() - 1) * pageSize();
        return filteredStudents().slice(start, start + pageSize());
      })
    };
  }),

  withMethods((store, studentService = inject(StudentService)) => {
    function replaceStudents(students: Student[]): void {
      const selectedClass = store.classFilter();
      const selectedFaculty = store.facultyFilter();

      patchState(store, {
        students,
        classFilter: students.some(
          (student) => student.className?.trim() === selectedClass
        ) ? selectedClass : '',
        facultyFilter: students.some(
          (student) => student.faculty?.trim() === selectedFaculty
        ) ? selectedFaculty : ''
      });
      patchState(store, { page: Math.min(store.page(), store.totalPages()) });
    }

    function load(): void {
      patchState(store, {
        loading: true,
        errorMessage: ''
      });

      studentService.getStudents().subscribe({
        next: (students) => {
          patchState(store, {
            loading: false
          });
          replaceStudents(students);
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
        patchState(store, { searchTerm, page: 1 });
      },

      setClassFilter(classFilter: string): void {
        patchState(store, { classFilter, page: 1 });
      },

      setFacultyFilter(facultyFilter: string): void {
        patchState(store, { facultyFilter, page: 1 });
      },

      setSortBy(sortBy: StudentSortField): void {
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
                replaceStudents(students);
                patchState(store, {
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
