import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit, signal, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { GradeFacade } from '../../facades/grade.facade';
import { StudentFacade } from '../../../students/facades/student.facade';
import { SubjectFacade } from '../../../subjects/facades/subject.facade';
import { AuthFacade } from '../../../../core/auth/facades/auth.facade';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { confirmDiscardChanges, HasPendingChanges } from '../../../../core/guards/pending-changes.guard';
import type { Grade } from '../../models/grade.model';
import type { Student } from '../../../students/models/student.model';
import type { Subject } from '../../../subjects/models/subject.model';

@Component({
  selector: 'app-grade-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PaginationComponent],
  templateUrl: './grade-list.html',
  styleUrl: './grade-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GradeListComponent implements OnInit, HasPendingChanges {
  readonly gradeFacade = inject(GradeFacade);
  readonly studentFacade = inject(StudentFacade);
  readonly subjectFacade = inject(SubjectFacade);
  readonly authFacade = inject(AuthFacade, { optional: true });
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly grades = this.gradeFacade.grades;
  readonly filteredGrades = this.gradeFacade.filteredGrades;
  readonly gradeCount = this.gradeFacade.gradeCount;
  readonly filteredGradeCount = this.gradeFacade.filteredGradeCount;
  readonly pageGrades = this.gradeFacade.pageGrades;
  readonly currentPage = this.gradeFacade.currentPage;
  readonly totalPages = this.gradeFacade.totalPages;
  readonly pageSize = this.gradeFacade.pageSize;
  readonly averageScore = this.gradeFacade.averageScore;
  readonly loading = this.gradeFacade.loading;
  readonly errorMessage = this.gradeFacade.errorMessage;
  readonly successMessage = this.gradeFacade.successMessage;
  readonly studentFilter = this.gradeFacade.studentFilter;
  readonly subjectFilter = this.gradeFacade.subjectFilter;

  readonly students = signal<Student[]>([]);
  readonly subjects = signal<Subject[]>([]);

  readonly editingId = signal('');
  readonly showForm = signal(false);

  hasUnsavedChanges(): boolean {
    return this.showForm() && this.form.dirty;
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
    }
  }


  private waitingForSave = false;

  readonly form = this.fb.nonNullable.group({
    studentId: ['', Validators.required],
    subjectId: ['', Validators.required],
    score: [0, [Validators.required, Validators.min(0), Validators.max(10)]],
  });

  constructor() {
    effect(() => {
      this.students.set(this.studentFacade.students());
    });

    effect(() => {
      this.subjects.set(this.subjectFacade.subjects());
    });

    effect(() => {
      const success = this.gradeFacade.successMessage();
      if (!this.waitingForSave) return;
      if (success) {
        this.waitingForSave = false;
        this.closeForm(true);
      }
    });
  }

  ngOnInit(): void {
    const studentIdParam = this.route.snapshot.queryParamMap.get('studentId');
    if (studentIdParam) {
      this.gradeFacade.setStudentFilter(studentIdParam);
    }
    this.gradeFacade.loadGrades();
    this.studentFacade.loadStudents();
    this.subjectFacade.loadSubjects();
  }

  canManage(): boolean {
    return this.authFacade ? this.authFacade.can('manage-grades') : true;
  }

  add(): void {
    this.editingId.set('');
    this.form.reset({
      studentId: this.studentFilter(),
      subjectId: this.subjectFilter(),
      score: 0,
    });
    this.showForm.set(true);
    this.gradeFacade.clearMessages();
  }

  edit(grade: Grade): void {
    this.editingId.set(grade.id);
    this.form.reset({
      studentId: grade.studentId,
      subjectId: grade.subjectId,
      score: grade.score,
    });
    this.showForm.set(true);
    this.gradeFacade.clearMessages();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.waitingForSave = true;

    this.gradeFacade.saveGrade(
      {
        id: this.editingId() || undefined,
        ...value,
      },
      this.editingId() ? 'update' : 'add'
    );
  }

  studentName(id: string): string {
    return this.students().find((student) => student.id === id)?.name ?? 'Sinh viên không tồn tại';
  }

  subjectName(id: string): string {
    return this.subjects().find((subject) => subject.id === id)?.name ?? 'Môn học không tồn tại';
  }

  studentCode(id: string): string {
    const student = this.students().find((item) => item.id === id);
    return student?.code || student?.id || id;
  }

  subjectCode(id: string): string {
    const subject = this.subjects().find((item) => item.id === id);
    return subject?.code || subject?.id || id;
  }

  setStudentFilter(value: string): void {
    this.gradeFacade.setStudentFilter(value);
  }

  setSubjectFilter(value: string): void {
    this.gradeFacade.setSubjectFilter(value);
  }

  onPageChange(page: number): void {
    this.gradeFacade.setPage(page);
  }

  onPageSizeChange(pageSize: number): void {
    this.gradeFacade.setPageSize(pageSize);
  }

  closeForm(force = false): void {
    if (!force && this.hasUnsavedChanges()) {
      if (!confirmDiscardChanges()) {
        return;
      }
    }
    this.showForm.set(false);
    this.editingId.set('');
    this.form.reset({
      studentId: '',
      subjectId: '',
      score: 0,
    });
  }
}
