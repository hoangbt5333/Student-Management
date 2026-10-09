import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { StudentService } from '../../services/student';
import type { Student } from '../../services/student';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './student-list.html',
  styleUrl: './student-list.css'
})
export class StudentListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private studentService = inject(StudentService);
  private changeDetector = inject(ChangeDetectorRef);

  students: Student[] = [];
  errorMessage = '';
  loading = false;
  editingStudentId: string | null = null;

  studentForm = this.fb.group({
    id: ['', Validators.required],
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]]
  });

  ngOnInit(): void {
    this.loadStudents();
  }

  loadStudents(): void {
    this.loading = true;
    this.errorMessage = '';

    this.studentService.getStudents().subscribe({
      next: (data) => {
        this.students = data;
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: (error) => {
        console.error('Lỗi tải danh sách:', error);
        this.errorMessage =
          'Không thể tải danh sách sinh viên. Hãy kiểm tra backend.';
        this.loading = false;
        this.changeDetector.markForCheck();
      }
    });
  }

  addStudent(): void {
    if (this.studentForm.invalid) {
      this.studentForm.markAllAsTouched();
      return;
    }

    const value = this.studentForm.getRawValue();

    const newStudent: Student = {
      id: value.id!,
      name: value.name!,
      email: value.email!,
      phone: value.phone!
    };

    if (this.students.some(student => student.id === newStudent.id)) {
      this.errorMessage = 'Mã sinh viên đã tồn tại!';
      return;
    }

    this.errorMessage = '';

    this.studentService.addStudent(newStudent).subscribe({
      next: () => {
        this.studentForm.reset();
        this.loadStudents();
      },
      error: (error) => {
        console.error('Lỗi thêm sinh viên:', error);
        this.errorMessage =
          'Không thể thêm sinh viên. Hãy kiểm tra mã sinh viên và backend.';
        this.changeDetector.markForCheck();
      }
    });
  }

  editStudent(student: Student): void {
    this.editingStudentId = student.id;

    this.studentForm.patchValue({
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone
    });

    // Do not change student's ID
    this.studentForm.controls.id.disable(); 
  }

  cancelEdit(): void {
    this.editingStudentId = null;
    this.studentForm.reset();
    this.studentForm.controls.id.enable();
  }

  updateStudent(): void {
    if (this.studentForm.invalid || !this.editingStudentId) {
      this.studentForm.markAllAsTouched();
      return;
    }

    // getRawValue() lấy cả trường đang bị disable
    const value = this.studentForm.getRawValue();

    const updatedStudent: Student = {
      id: this.editingStudentId,
      name: value.name!,
      email: value.email!,
      phone: value.phone!
    };

    this.studentService.updateStudent(updatedStudent).subscribe({
      next: () => {
        this.cancelEdit();
        this.loadStudents();
      },
      error: (error) => {
        console.error('Lỗi cập nhật sinh viên:', error);
        this.errorMessage = 'Không thể cập nhật sinh viên.';
      }
    });
  }
  
  saveStudent(): void {
    if (this.editingStudentId) {
      this.updateStudent();
    } else {
      this.addStudent();
    }
  }

  deleteStudent(id: string): void {
    this.errorMessage = '';

    this.studentService.deleteStudent(id).subscribe({
      next: () => {
        this.loadStudents();
      },
      error: (error) => {
        console.error('Lỗi xóa sinh viên:', error);
        this.errorMessage = 'Không thể xóa sinh viên.';
        this.changeDetector.markForCheck();
      }
    });
  }
}