import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AcademicService } from '../../data-access/academic.service';
import { StudentService } from '../../../students/data-access/student';
import type { Grade, Subject } from '../../data-access/academic.model';
import type { Student } from '../../../students/data-access/models/student.model';

@Component({
  selector: 'app-grade-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './grade-list.html',
  styleUrl: '../catalog.css',
})
export class GradeListComponent implements OnInit {
  private readonly service = inject(AcademicService);
  private readonly studentService = inject(StudentService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  readonly grades = signal<Grade[]>([]);
  readonly students = signal<Student[]>([]);
  readonly subjects = signal<Subject[]>([]);
  readonly studentFilter = signal('');
  readonly subjectFilter = signal('');
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly editingId = signal('');
  readonly showForm = signal(false);
  readonly filteredGrades = computed(() => this.grades().filter((grade) =>
    (!this.studentFilter() || grade.studentId === this.studentFilter()) &&
    (!this.subjectFilter() || grade.subjectId === this.subjectFilter())
  ));
  readonly averageScore = computed(() => {
    const validScores = this.filteredGrades().map((grade) => grade.score).filter((score) => score >= 0 && score <= 10);
    return validScores.length ? (validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(2) : '—';
  });
  readonly form = this.fb.nonNullable.group({
    studentId: ['', Validators.required],
    subjectId: ['', Validators.required],
    score: [0, [Validators.required, Validators.min(0), Validators.max(10)]],
  });

  ngOnInit(): void {
    this.studentFilter.set(this.route.snapshot.queryParamMap.get('studentId') ?? '');
    this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({ grades: this.service.getGrades(), students: this.studentService.getStudents(), subjects: this.service.getSubjects() }).subscribe({
      next: ({ grades, students, subjects }) => { this.grades.set(grades); this.students.set(students); this.subjects.set(subjects); this.loading.set(false); },
      error: () => { this.errorMessage.set('Không thể tải bảng điểm. Hãy kiểm tra Mock API.'); this.loading.set(false); },
    });
  }

  add(): void { this.editingId.set(''); this.form.reset({ studentId: this.studentFilter(), subjectId: this.subjectFilter(), score: 0 }); this.showForm.set(true); this.clearMessages(); }
  edit(grade: Grade): void { this.editingId.set(grade.id); this.form.reset({ studentId: grade.studentId, subjectId: grade.subjectId, score: grade.score }); this.showForm.set(true); this.clearMessages(); }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    const duplicate = this.grades().some((grade) => grade.studentId === value.studentId && grade.subjectId === value.subjectId && grade.id !== this.editingId());
    if (duplicate) { this.errorMessage.set('Sinh viên đã có điểm cho môn học này. Hãy sửa điểm hiện tại.'); return; }
    this.loading.set(true);
    const request = this.editingId()
      ? this.service.updateGrade({ id: this.editingId(), ...value })
      : this.service.createGrade(value);
    request.subscribe({
      next: () => { this.successMessage.set(this.editingId() ? 'Đã cập nhật điểm.' : 'Đã thêm điểm.'); this.showForm.set(false); this.load(); },
      error: () => { this.errorMessage.set('Không thể lưu điểm.'); this.loading.set(false); },
    });
  }

  studentName(id: string): string { return this.students().find((student) => student.id === id)?.name ?? 'Sinh viên không tồn tại'; }
  subjectName(id: string): string { return this.subjects().find((subject) => subject.id === id)?.name ?? 'Môn học không tồn tại'; }
  studentCode(id: string): string { const student = this.students().find((item) => item.id === id); return student?.code || student?.id || id; }
  subjectCode(id: string): string { const subject = this.subjects().find((item) => item.id === id); return subject?.code || subject?.id || id; }
  setStudentFilter(value: string): void { this.studentFilter.set(value); }
  setSubjectFilter(value: string): void { this.subjectFilter.set(value); }
  closeForm(): void { this.showForm.set(false); }
  private clearMessages(): void { this.errorMessage.set(''); this.successMessage.set(''); }
}
