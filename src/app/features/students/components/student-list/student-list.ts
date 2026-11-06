import { Component, inject, OnInit, signal, effect, ViewChild, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

import type { Student } from '../../models/student.model';
import { StudentTable } from '../student-table/student-table';
import { StudentForm } from '../student-form/student-form';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { StudentFacade } from '../../facades/student.facade';
import { AuthFacade } from '../../../../core/auth/facades/auth.facade';
import { confirmDiscardChanges, HasPendingChanges } from '../../../../core/guards/pending-changes.guard';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [StudentForm, StudentTable, ModalComponent, PaginationComponent, ReactiveFormsModule],
  templateUrl: './student-list.html',
  styleUrl: './student-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentListComponent implements OnInit, HasPendingChanges {
  @ViewChild(StudentForm) private studentForm?: StudentForm;
  readonly facade = inject(StudentFacade);
  readonly authFacade = inject(AuthFacade);

  readonly searchControl = new FormControl('', { nonNullable: true });

  private clearSelectionOnSaveSuccess = effect(() => {
    const message = this.facade.successMessage();

    if (message) {
      this.selectedStudent.set(null);
      this.studentForm?.resetForNewStudent();
      this.cancelEdit(true);
    }
  });

  selectedStudent = signal<Student | null>(null);
  showForm = signal(false);

  hasUnsavedChanges(): boolean {
    return this.showForm() && (this.studentForm?.hasUnsavedChanges() ?? false);
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
    }
  }


  students = this.facade.students;
  loading = this.facade.loading;
  errorMessage = this.facade.errorMessage;
  successMessage = this.facade.successMessage;
  studentCount = this.facade.studentCount;
  pageStudents = this.facade.pageStudents;
  filteredStudentCount = this.facade.filteredStudentCount;
  classOptions = this.facade.classOptions;
  facultyOptions = this.facade.facultyOptions;
  currentPage = this.facade.currentPage;
  pageSize = this.facade.pageSize;

  readonly sortFields: { value: keyof Student; label: string }[] = [
    { value: 'id', label: 'Mã sinh viên' },
    { value: 'name', label: 'Họ tên' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Số điện thoại' },
    { value: 'className', label: 'Lớp' },
    { value: 'faculty', label: 'Khoa' }
  ];

  constructor() {
    const initialTerm = this.facade.searchTerm ? this.facade.searchTerm() : '';
    this.searchControl.setValue(initialTerm, { emitEvent: false });

    if (this.facade.searchTerm) {
      effect(() => {
        const current = this.facade.searchTerm();
        if (this.searchControl.value !== current) {
          this.searchControl.setValue(current, { emitEvent: false });
        }
      });
    }

    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed()
      )
      .subscribe((keyword) => {
        this.facade.setSearchTerm(keyword);
      });
  }

  ngOnInit(): void {
    this.facade.loadStudents();
  }

  search(keyword: string): void {
    this.searchControl.setValue(keyword);
  }

  setClassFilter(value: string): void {
    this.facade.setClassFilter(value);
  }

  setFacultyFilter(value: string): void {
    this.facade.setFacultyFilter(value);
  }

  setSortBy(value: string): void {
    const field = this.sortFields.find((sortField) => sortField.value === value);

    if (!field) {
      throw new RangeError(`Unsupported student sort field: ${value}`);
    }

    this.facade.setSortBy(field.value);
  }

  setSortDirection(value: string): void {
    if (value !== 'asc' && value !== 'desc') {
      throw new RangeError(`Unsupported sort direction: ${value}`);
    }

    this.facade.setSortDirection(value);
  }

  setPageSize(size: number): void {
    this.facade.setPageSize(size);
  }

  setPage(page: number): void {
    this.facade.setPage(page);
  }

  editStudent(student: Student): void {
    this.selectedStudent.set(student);
    this.showForm.set(true);
  }

  openAddStudent(): void {
    this.selectedStudent.set(null);
    this.studentForm?.resetForNewStudent();
    this.showForm.set(true);
  }

  cancelEdit(force = false): void {
    if (!force && this.hasUnsavedChanges()) {
      if (!confirmDiscardChanges()) {
        return;
      }
    }
    this.selectedStudent.set(null);
    this.showForm.set(false);
  }
  
  saveStudent(student: Student): void {
    const mode = this.selectedStudent() ? 'update' : 'add';

    this.facade.saveStudent(student, mode);
  }

  deleteStudent(id: string): void {
    const confirmed = confirm('Bạn có chắc muốn xóa sinh viên này?');

    if (!confirmed) {
      return;
    }
    
    this.facade.deleteStudent(id);
  }
}
