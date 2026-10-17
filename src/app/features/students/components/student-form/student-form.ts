import { Component, input, output, inject, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Student } from '../../data-access/models/student.model';
import { ClassFacade } from '../../../classes/data-access/class.facade';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-student-form',
  styleUrl: './student-form.css',
  templateUrl: './student-form.html',
})
export class StudentForm {
  private fb = inject(FormBuilder);
  readonly classFacade = inject(ClassFacade);

  student = input<Student | null>(null);

  save = output<Student>();
  cancel = output<void>();

  form = this.fb.nonNullable.group({
    id: ['', Validators.required],
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    classId: ['', Validators.required],
    faculty: ['', Validators.required]
  });

  constructor() {
    this.classFacade.loadClasses();
    
    effect(() => {
      const student = this.student();

      if (student) {
        const classes = this.classFacade.classes();

        const matchedClass = classes.find(
          item => item.name === student.className
        );
        
        this.form.reset({
          id: student.code ?? student.id,
          name: student.name,
          email: student.email,
          phone: student.phone,
          classId: student.classId ?? matchedClass?.id ?? '',
          faculty: student.faculty ?? ''
        });
        this.form.controls.id.disable();
      } else {
        this.resetForNewStudent();
      }
    });
  }

  resetForNewStudent(): void {
    this.form.reset({
      id: '',
      name: '',
      email: '',
      phone: '',
      classId: '',
      faculty: ''
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
    const selectedClass = this.classFacade.classes().find(
      classItem => classItem.id === student.classId
    );

    this.save.emit({
      id: this.student()?.id ?? student.id,
      code: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      classId: student.classId,
      className: selectedClass?.name,
      faculty: student.faculty
    });
  }

  onCancel(): void{
    this.cancel.emit();
  }
}
