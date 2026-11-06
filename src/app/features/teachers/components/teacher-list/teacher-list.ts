import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TeacherFacade } from '../../facades/teacher.facade';
import type { Teacher } from '../../models/teacher.model';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { AuthFacade } from '../../../../core/auth/facades/auth.facade';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

interface SubjectRef {
  id: string;
  teacherId?: string;
}

@Component({
  selector: 'app-teacher-list',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ModalComponent, PaginationComponent],
  templateUrl: './teacher-list.html',
  styleUrl: './teacher-list.css',
})
export class TeacherListComponent implements OnInit {
  readonly facade = inject(TeacherFacade);
  readonly authFacade = inject(AuthFacade);
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  readonly teachers = this.facade.teachers;
  readonly pageTeachers = this.facade.pageTeachers;
  readonly currentPage = this.facade.currentPage;
  readonly filteredTeacherCount = this.facade.filteredTeacherCount;
  readonly pageSize = this.facade.pageSize;
  readonly loading = this.facade.loading;
  readonly errorMessage = this.facade.errorMessage;
  readonly successMessage = this.facade.successMessage;

  readonly editingId = signal('');
  readonly showForm = signal(false);

  private waitingForSave = false;
  private readonly saveEffect = effect(() => {
    const success = this.facade.successMessage();
    if (!this.waitingForSave) return;
    if (success) {
      this.waitingForSave = false;
      this.closeForm();
    }
  });

  readonly form = this.fb.nonNullable.group({
    id: ['', [Validators.required, Validators.pattern(/^GV\d{3,}$/)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    department: ['', [Validators.required, Validators.maxLength(100)]],
  });

  ngOnInit(): void {
    this.facade.loadTeachers();
  }

  openAdd(): void {
    this.editingId.set('');
    this.form.reset({ id: '', name: '', email: '', department: '' });
    this.form.controls.id.enable();
    this.showForm.set(true);
    this.facade.clearMessages();
  }

  edit(teacher: Teacher): void {
    this.editingId.set(teacher.id);
    this.form.reset({ ...teacher, id: teacher.code ?? teacher.id });
    this.form.controls.id.disable();
    this.showForm.set(true);
    this.facade.clearMessages();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const values = this.form.getRawValue();
    const teacher: Teacher = {
      ...values,
      id: this.editingId() || values.id,
      code: values.id
    };

    this.waitingForSave = true;
    this.facade.saveTeacher(teacher, this.editingId() ? 'update' : 'add');
  }

  delete(teacher: Teacher): void {
    this.http.get<SubjectRef[]>('http://localhost:3001/subjects').subscribe({
      next: (subjects) => {
        if (subjects.some((subject) => subject.teacherId === teacher.id)) {
          alert('Không thể xóa giảng viên đang phụ trách môn học.');
          return;
        }
        if (!window.confirm(`Xóa giảng viên ${teacher.name}?`)) return;
        this.facade.deleteTeacher(teacher.id);
      },
      error: () => {
        if (window.confirm(`Không thể kiểm tra môn học phụ trách. Vẫn muốn xóa giảng viên ${teacher.name}?`)) {
          this.facade.deleteTeacher(teacher.id);
        }
      }
    });
  }

  closeForm(): void {
    this.showForm.set(false);
    this.form.controls.id.enable();
  }

  setSearch(value: string): void {
    this.facade.setSearchTerm(value);
  }

  onPageChange(page: number): void {
    this.facade.setPage(page);
  }

  onPageSizeChange(pageSize: number): void {
    this.facade.setPageSize(pageSize);
  }
}
