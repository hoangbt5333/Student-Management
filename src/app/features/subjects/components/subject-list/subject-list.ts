import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SubjectFacade } from '../../facades/subject.facade';
import { TeacherFacade } from '../../../teachers/facades/teacher.facade';
import type { Subject } from '../../models/subject.model';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { AuthFacade } from '../../../../core/auth/facades/auth.facade';

interface GradeRef {
  id: string;
  subjectId: string;
}

@Component({
  selector: 'app-subject-list',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ModalComponent],
  templateUrl: './subject-list.html',
  styleUrl: './subject-list.css',
})
export class SubjectListComponent implements OnInit {
  readonly facade = inject(SubjectFacade);
  readonly teacherFacade = inject(TeacherFacade);
  readonly authFacade = inject(AuthFacade);
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  readonly subjects = this.facade.subjects;
  readonly filteredSubjects = this.facade.filteredSubjects;
  readonly loading = this.facade.loading;
  readonly errorMessage = this.facade.errorMessage;
  readonly successMessage = this.facade.successMessage;

  readonly teachers = this.teacherFacade.teachers;

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
    id: ['', [Validators.required, Validators.pattern(/^MH\d{3,}$/)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    credits: [3, [Validators.required, Validators.min(1), Validators.max(10)]],
    teacherId: [''],
  });

  ngOnInit(): void {
    this.facade.loadSubjects();
    this.teacherFacade.loadTeachers();
  }

  openAdd(): void {
    this.editingId.set('');
    this.form.reset({ id: '', name: '', credits: 3, teacherId: '' });
    this.form.controls.id.enable();
    this.showForm.set(true);
    this.facade.clearMessages();
  }

  edit(subject: Subject): void {
    this.editingId.set(subject.id);
    this.form.reset({
      ...subject,
      id: subject.code ?? subject.id,
      teacherId: subject.teacherId ?? ''
    });
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
    const subject: Subject = {
      ...values,
      id: this.editingId() || values.id,
      code: values.id
    };

    this.waitingForSave = true;
    this.facade.saveSubject(subject, this.editingId() ? 'update' : 'add');
  }

  delete(subject: Subject): void {
    this.http.get<GradeRef[]>('http://localhost:3001/grades').subscribe({
      next: (grades) => {
        if (grades.some((grade) => grade.subjectId === subject.id)) {
          alert('Không thể xóa môn học đã có điểm sinh viên.');
          return;
        }
        if (!window.confirm(`Xóa môn học ${subject.name}?`)) return;
        this.facade.deleteSubject(subject.id);
      },
      error: () => {
        if (window.confirm(`Không thể kiểm tra điểm sinh viên. Vẫn muốn xóa môn học ${subject.name}?`)) {
          this.facade.deleteSubject(subject.id);
        }
      }
    });
  }

  teacherName(id?: string): string {
    return this.teachers().find((teacher) => teacher.id === id)?.name ?? 'Chưa phân công';
  }

  setSearch(value: string): void {
    this.facade.setSearchTerm(value);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.form.controls.id.enable();
  }
}
