import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { ClassModel } from '../../data-access/models/class.model';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-class-form',
  styleUrl: './class-form.css',
  templateUrl: './class-form.html',
})
export class ClassForm {
  private readonly fb = inject(FormBuilder);

  classItem = input<ClassModel | null>(null);
  
  saved = output<{
    classItem: ClassModel,
    mode: 'add' | 'update'
  }>();

  cancelled = output<void>();

  readonly form = this.fb.nonNullable.group({
    id: ['', [Validators.required, Validators.pattern(/^CLS\d{3,}$/)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    department: ['', [Validators.required, Validators.maxLength(100)]],
    academicYear: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{4}$/)]]
  });

  constructor() {
    effect(() => {
      const item = this.classItem();

      if (item) {
        this.form.reset({ ...item, id: item.code ?? item.id });
        this.form.controls.id.disable();
      } else {
        this.form.reset({
          id: '',
          name: '',
          department: '',
          academicYear: ''
        });
        this.form.controls.id.enable();
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    const classItem: ClassModel = {
      ...values,
      id: this.classItem()?.id ?? values.id,
      code: values.id
    };

    this.saved.emit({
      classItem,
      mode: this.classItem() ? 'update' : 'add'
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
