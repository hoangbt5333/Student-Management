import { Component, input, output, inject, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Student } from '../../data-access/student';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-student-form',
  styleUrl: './student-form.css',
  templateUrl: './student-form.html',
})
export class StudentForm {
  private fb = inject(FormBuilder);

  student = input<Student | null>(null);

  save = output<Student>();
  cancel = output<void>();

  form = this.fb.nonNullable.group({
    id: ['', Validators.required],
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]]
  });

  constructor() {
    effect(() => {
      const student = this.student();

      if (student) {
        //Chế độ sửa
        this.form.reset(student);
        this.form.controls.id.disable();
      } else {
        //Chế độ thêm mới
        this.resetForNewStudent();
      }
    });
  }

  resetForNewStudent(): void {
    this.form.reset({
      id: '',
      name: '',
      email: '',
      phone: ''
    });
    this.form.controls.id.enable();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // getRawValue() vẫn lấy được id đang bị disable
    const student = this.form.getRawValue();

    this.save.emit({
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone
    });
  }

  onCancel(): void{
    this.cancel.emit();
  }
}
