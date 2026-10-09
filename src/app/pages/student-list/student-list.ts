import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
}

@Component({
  imports: [ ReactiveFormsModule],
  selector: 'app-student-list',
  styleUrl: './student-list.css',
  templateUrl: './student-list.html',
})
export class StudentList {

  private fb = inject(FormBuilder);

  students = [
    { id: '1', name: 'John Doe', email: 'john.doe@abcuniversity.edu', phone: '1234567890' },
    { id: '2', name: 'Jane Smith', email: 'jane.smith@abcuniversity.edu', phone: '0987654321' },
    { id: '3', name: 'Alice Johnson', email: 'alice.johnson@abcuniversity.edu', phone: '5555555555' },
  ];

  studentForm = this.fb.group({
    id: ['', Validators.required],
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
  });

  addStudent(): void {
    if (this.studentForm.invalid) {
      this.studentForm.markAllAsTouched();
      return;
    }

    const formValue = this.studentForm.getRawValue();

    const isDuplicateId = this.students.some(student => student.id === formValue.id);

    if (isDuplicateId) {
      alert('Mã sinh viên đã tồn tại.');
      return;
    }

    const newStudent:Student = {
      id: formValue.id!,
      name: formValue.name!,
      email: formValue.email!,
      phone: formValue.phone!,
    };

    this.students = [...this.students, newStudent];

    this.studentForm.reset();
  }

  deleteStudent(studentId: string): void {
    this.students = this.students.filter(student => student.id !== studentId);
  }
}