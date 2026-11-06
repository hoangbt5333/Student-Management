import { Component, effect, inject, input, output, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { UserFacade } from '../../facades/user.facade';
import type { User, UserRole, UserStatus } from '../../models/user.model';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormComponent {
  private readonly fb = inject(FormBuilder);
  readonly userFacade = inject(UserFacade);

  user = input<User | null>(null);

  save = output<void>();
  cancel = output<void>();

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    role: ['student' as UserRole, Validators.required],
    displayName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.minLength(6)]],
    studentId: [''],
    teacherId: [''],
    status: ['active' as UserStatus, Validators.required]
  });

  get isEditMode(): boolean {
    return this.user() !== null;
  }

  constructor() {
    effect(() => {
      const currentUser = this.user();
      if (currentUser) {
        // Edit mode
        this.form.reset({
          username: currentUser.username,
          role: currentUser.role,
          displayName: currentUser.displayName,
          email: currentUser.email,
          password: '',
          studentId: currentUser.studentId ?? '',
          teacherId: currentUser.teacherId ?? '',
          status: currentUser.status
        });

        // Username và Role là bất biến sau khi tạo
        this.form.controls.username.disable();
        this.form.controls.role.disable();
        this.form.controls.password.clearValidators();
        this.form.controls.password.updateValueAndValidity();

        this.applyProfileFieldEnforcement(currentUser.role);
      } else {
        // Create mode
        this.form.reset({
          username: '',
          role: 'student',
          displayName: '',
          email: '',
          password: '',
          studentId: '',
          teacherId: '',
          status: 'active'
        });

        this.form.controls.username.enable();
        this.form.controls.role.enable();
        this.form.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
        this.form.controls.password.updateValueAndValidity();

        this.applyProfileFieldEnforcement('student');
      }
    });

    // Theo dõi thay đổi Role (chỉ có tác dụng trong Create mode)
    this.form.controls.role.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((role) => {
        if (!this.isEditMode) {
          this.form.patchValue({ studentId: '', teacherId: '', displayName: '', email: '' });
          this.applyProfileFieldEnforcement(role);
        }
      });

    // Theo dõi thay đổi Student profile selection
    this.form.controls.studentId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((studentId) => {
        if (studentId) {
          const student = this.userFacade.students().find(s => s.id === studentId);
          if (student) {
            this.form.patchValue({
              displayName: student.name,
              email: student.email
            });
          }
        }
      });

    // Theo dõi thay đổi Teacher profile selection
    this.form.controls.teacherId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((teacherId) => {
        if (teacherId) {
          const teacher = this.userFacade.teachers().find(t => t.id === teacherId);
          if (teacher) {
            this.form.patchValue({
              displayName: teacher.name,
              email: teacher.email
            });
          }
        }
      });
  }

  private applyProfileFieldEnforcement(role: UserRole): void {
    if (role === 'student' || role === 'teacher') {
      // Quyết định 2: Tự động điền theo hồ sơ nghiệp vụ, admin không sửa
      this.form.controls.displayName.disable();
      this.form.controls.email.disable();
    } else {
      // Admin: Nhập thủ công
      this.form.controls.displayName.enable();
      this.form.controls.email.enable();
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    if (this.isEditMode) {
      const currentUser = this.user();
      if (!currentUser) return;

      const success = this.userFacade.updateUser({
        id: currentUser.id,
        displayName: raw.displayName,
        email: raw.email,
        role: currentUser.role, // role bất biến
        status: raw.status,
        studentId: currentUser.role === 'student' ? raw.studentId : undefined,
        teacherId: currentUser.role === 'teacher' ? raw.teacherId : undefined
      });

      if (success) {
        this.form.markAsPristine();
        this.save.emit();
      }
    } else {
      const success = this.userFacade.createUser({
        username: raw.username,
        displayName: raw.displayName,
        email: raw.email,
        role: raw.role,
        password: raw.password,
        status: raw.status,
        studentId: raw.role === 'student' ? raw.studentId : undefined,
        teacherId: raw.role === 'teacher' ? raw.teacherId : undefined
      });

      if (success) {
        this.form.markAsPristine();
        this.save.emit();
      }
    }
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty;
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
