import { Component, inject, OnInit, signal, effect, ViewChild } from '@angular/core';

import type { Student } from '../../data-access/student';
import { StudentTable } from '../student-table/student-table';
import { StudentForm } from '../student-form/student-form';
import { StudentFacade } from '../../data-access/student.facade';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [StudentForm, StudentTable],
  templateUrl: './student-list.html',
  styleUrl: './student-list.css'
})
export class StudentListComponent implements OnInit {
  @ViewChild(StudentForm) private studentForm?: StudentForm;
  readonly facade = inject(StudentFacade);

  private clearSelectionOnSaveSuccess = effect(() => {
    const message = this.facade.successMessage();

    if (message) {
      this.selectedStudent.set(null);
      this.studentForm?.resetForNewStudent();
    }
  });

  selectedStudent = signal<Student | null>(null);

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
  totalPages = this.facade.totalPages;
  pageSize = this.facade.pageSize;

  readonly sortFields: { value: keyof Student; label: string }[] = [
    { value: 'id', label: 'Mã sinh viên' },
    { value: 'name', label: 'Họ tên' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Số điện thoại' },
    { value: 'className', label: 'Lớp' },
    { value: 'faculty', label: 'Khoa' }
  ];

  ngOnInit(): void {
    this.facade.loadStudents();
  }

  search(keyword: string): void {
    this.facade.setSearchTerm(keyword);
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

  setPageSize(value: string): void {
    this.facade.setPageSize(Number(value));
  }

  setPage(page: number): void {
    this.facade.setPage(page);
  }

  editStudent(student: Student): void {
    this.selectedStudent.set(student);
  }

  cancelEdit(): void {
    this.selectedStudent.set(null);
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