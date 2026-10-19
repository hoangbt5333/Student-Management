import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AcademicService } from '../../data-access/academic.service';
import type { Grade, Subject, Teacher } from '../../data-access/academic.model';
import { AuthFacade } from '../../../../core/auth/facades/auth.facade';

@Component({
  selector: 'app-subject-list',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './subject-list.html',
  styleUrl: '../catalog.css',
})
export class SubjectListComponent implements OnInit {
  private readonly service = inject(AcademicService);
  private readonly fb = inject(FormBuilder);
  readonly authFacade = inject(AuthFacade);

  readonly subjects = signal<Subject[]>([]);
  readonly teachers = signal<Teacher[]>([]);
  readonly grades = signal<Grade[]>([]);
  readonly searchTerm = signal('');
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly editingId = signal('');
  readonly showForm = signal(false);
  readonly filteredSubjects = computed(() => {
    const keyword = this.searchTerm().trim().toLocaleLowerCase('vi');
    return this.subjects().filter((subject) => [subject.code ?? subject.id, subject.name].some((value) => value.toLocaleLowerCase('vi').includes(keyword)));
  });
  readonly form = this.fb.nonNullable.group({
    id: ['', [Validators.required, Validators.pattern(/^MH\d{3,}$/)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    credits: [3, [Validators.required, Validators.min(1), Validators.max(10)]],
    teacherId: [''],
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.service.getSubjects().subscribe({
      next: (items) => { this.subjects.set(items); this.loading.set(false); },
      error: () => { this.errorMessage.set('Không thể tải môn học. Hãy kiểm tra Mock API.'); this.loading.set(false); },
    });
    this.service.getTeachers().subscribe({ next: (items) => this.teachers.set(items) });
    this.service.getGrades().subscribe({ next: (items) => this.grades.set(items) });
  }

  openAdd(): void { this.editingId.set(''); this.form.reset({ id: '', name: '', credits: 3, teacherId: '' }); this.form.controls.id.enable(); this.showForm.set(true); this.clearMessages(); }

  edit(subject: Subject): void {
    this.editingId.set(subject.id); this.form.reset({ ...subject, id: subject.code ?? subject.id, teacherId: subject.teacherId ?? '' }); this.form.controls.id.disable(); this.showForm.set(true); this.clearMessages();
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const values = this.form.getRawValue();
    const subject: Subject = { ...values, id: this.editingId() || values.id, code: values.id };
    if (!this.editingId() && this.subjects().some((item) => (item.code ?? item.id).toLowerCase() === values.id.toLowerCase())) { this.errorMessage.set('Mã môn học đã tồn tại.'); return; }
    this.loading.set(true);
    const request = this.editingId() ? this.service.updateSubject(subject) : this.service.createSubject(subject);
    request.subscribe({
      next: () => { this.successMessage.set(this.editingId() ? 'Đã cập nhật môn học.' : 'Đã thêm môn học.'); this.showForm.set(false); this.load(); },
      error: () => { this.errorMessage.set('Không thể lưu môn học.'); this.loading.set(false); },
    });
  }

  delete(subject: Subject): void {
    if (this.grades().some((grade) => grade.subjectId === subject.id)) { this.errorMessage.set('Không thể xóa môn học đã có điểm sinh viên.'); return; }
    if (!window.confirm(`Xóa môn học ${subject.name}?`)) return;
    this.loading.set(true);
    this.service.deleteSubject(subject.id).subscribe({
      next: () => { this.successMessage.set('Đã xóa môn học.'); this.load(); },
      error: () => { this.errorMessage.set('Không thể xóa môn học.'); this.loading.set(false); },
    });
  }

  teacherName(id?: string): string { return this.teachers().find((teacher) => teacher.id === id)?.name ?? 'Chưa phân công'; }
  setSearch(value: string): void { this.searchTerm.set(value); }
  closeForm(): void { this.showForm.set(false); this.form.controls.id.enable(); }
  private clearMessages(): void { this.errorMessage.set(''); this.successMessage.set(''); }
}
