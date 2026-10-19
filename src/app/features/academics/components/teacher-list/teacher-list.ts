import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AcademicService } from '../../data-access/academic.service';
import type { Teacher } from '../../data-access/academic.model';
import { AuthFacade } from '../../../../core/auth/facades/auth.facade';

@Component({
  selector: 'app-teacher-list',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './teacher-list.html',
  styleUrl: '../catalog.css',
})
export class TeacherListComponent implements OnInit {
  private readonly service = inject(AcademicService);
  private readonly fb = inject(FormBuilder);
  readonly authFacade = inject(AuthFacade);

  readonly teachers = signal<Teacher[]>([]);
  readonly searchTerm = signal('');
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly editingId = signal('');
  readonly showForm = signal(false);
  readonly filteredTeachers = computed(() => {
    const keyword = this.searchTerm().trim().toLocaleLowerCase('vi');
    return this.teachers().filter((teacher) => [teacher.code ?? teacher.id, teacher.name, teacher.email].some((value) => value.toLocaleLowerCase('vi').includes(keyword)));
  });
  readonly form = this.fb.nonNullable.group({
    id: ['', [Validators.required, Validators.pattern(/^GV\d{3,}$/)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    department: ['', [Validators.required, Validators.maxLength(100)]],
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.service.getTeachers().subscribe({
      next: (items) => { this.teachers.set(items); this.loading.set(false); },
      error: () => { this.errorMessage.set('Không thể tải giảng viên. Hãy kiểm tra Mock API.'); this.loading.set(false); },
    });
  }

  openAdd(): void { this.editingId.set(''); this.form.reset({ id: '', name: '', email: '', department: '' }); this.form.controls.id.enable(); this.showForm.set(true); this.clearMessages(); }

  edit(teacher: Teacher): void {
    this.editingId.set(teacher.id);
    this.form.reset({ ...teacher, id: teacher.code ?? teacher.id });
    this.form.controls.id.disable();
    this.showForm.set(true);
    this.clearMessages();
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const values = this.form.getRawValue();
    const teacher: Teacher = { ...values, id: this.editingId() || values.id, code: values.id };
    if (!this.editingId() && this.teachers().some((item) => (item.code ?? item.id).toLowerCase() === values.id.toLowerCase())) {
      this.errorMessage.set('Mã giảng viên đã tồn tại.'); return;
    }
    this.loading.set(true);
    const request = this.editingId() ? this.service.updateTeacher(teacher) : this.service.createTeacher(teacher);
    request.subscribe({
      next: () => { this.successMessage.set(this.editingId() ? 'Đã cập nhật giảng viên.' : 'Đã thêm giảng viên.'); this.showForm.set(false); this.load(); },
      error: () => { this.errorMessage.set('Không thể lưu giảng viên. Vui lòng thử lại.'); this.loading.set(false); },
    });
  }

  delete(teacher: Teacher): void {
    this.service.getSubjects().subscribe({
      next: (subjects) => {
        if (subjects.some((subject) => subject.teacherId === teacher.id)) { this.errorMessage.set('Không thể xóa giảng viên đang phụ trách môn học.'); return; }
        if (!window.confirm(`Xóa giảng viên ${teacher.name}?`)) return;
        this.loading.set(true);
        this.service.deleteTeacher(teacher.id).subscribe({
          next: () => { this.successMessage.set('Đã xóa giảng viên.'); this.load(); },
          error: () => { this.errorMessage.set('Không thể xóa giảng viên.'); this.loading.set(false); },
        });
      },
      error: () => this.errorMessage.set('Không thể kiểm tra môn học đang phụ trách.'),
    });
  }

  closeForm(): void { this.showForm.set(false); this.form.controls.id.enable(); }
  setSearch(value: string): void { this.searchTerm.set(value); }
  private clearMessages(): void { this.errorMessage.set(''); this.successMessage.set(''); }
}
