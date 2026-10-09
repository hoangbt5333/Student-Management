import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';


@Component({
  imports: [ ReactiveFormsModule],
  selector: 'app-student-list',
  styleUrl: './student-list.css',
  templateUrl: './student-list.html',
})
export class StudentList {

  private fb = inject(FormBuilder);

  students = [
    { id: 1, name: 'John Doe', email: 'john.doe@abcuniversity.edu' },
    { id: 2, name: 'Jane Smith', email: 'jane.smith@abcuniversity.edu' },
    { id: 3, name: 'Alice Johnson', email: 'alice.johnson@abcuniversity.edu' },
  ];

  studentForm = this.fb.group({
    id: ['', Validators.required],
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
  });

  addStudent() {
    if (this.studentForm.invalid) {
      this.studentForm.markAllAsTouched();
      return;
    }

    console.log(this.studentForm.getRawValue());
  }

}
