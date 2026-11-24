import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StudentFacade } from '../../facades/student.facade';
import { ClassFacade } from '../../../classes/facades/class.facade';
import { GradeFacade } from '../../../grades/facades/grade.facade';
import { SubjectFacade } from '../../../subjects/facades/subject.facade';

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './student-detail.html',
  styleUrl: './student-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute, { optional: true });
  readonly studentFacade = inject(StudentFacade);
  readonly classFacade = inject(ClassFacade);
  readonly gradeFacade = inject(GradeFacade);
  readonly subjectFacade = inject(SubjectFacade);

  readonly id = input<string>('');
  readonly studentId = computed(() => this.id() || this.route?.snapshot.paramMap.get('id') || '');

  readonly student = computed(() => {
    const id = this.studentId();
    if (!id) return null;
    return this.studentFacade.students().find((item) => item.id === id) ?? null;
  });

  readonly classItem = computed(() => {
    const st = this.student();
    if (!st) return null;
    return this.classFacade.classes().find((item) => item.id === st.classId || item.name === st.className) ?? null;
  });

  readonly grades = computed(() => {
    const id = this.studentId();
    if (!id) return [];
    return this.gradeFacade.grades().filter((grade) => grade.studentId === id);
  });

  readonly subjects = this.subjectFacade.subjects;

  readonly loading = computed(() =>
    this.studentFacade.loading() || this.classFacade.loading() || this.gradeFacade.loading() || this.subjectFacade.loading()
  );

  readonly errorMessage = computed(() => {
    if (!this.studentId()) return 'Không tìm thấy mã sinh viên.';
    if (!this.loading() && !this.student()) return 'Không tìm thấy sinh viên.';
    return (
      this.studentFacade.errorMessage() ||
      this.classFacade.errorMessage() ||
      this.gradeFacade.errorMessage() ||
      this.subjectFacade.errorMessage()
    );
  });

  readonly average = computed(() => {
    const scores = this.grades().map((grade) => grade.score).filter((score) => score >= 0 && score <= 10);
    return scores.length ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2) : 'Chưa có';
  });

  ngOnInit(): void {
    this.studentFacade.loadStudents();
    this.classFacade.loadClasses();
    this.gradeFacade.loadGrades();
    this.subjectFacade.loadSubjects();
  }

  subjectName(id: string): string {
    return this.subjects().find((subject) => subject.id === id)?.name ?? 'Môn học không tồn tại';
  }

  subjectCode(id: string): string {
    const subject = this.subjects().find((item) => item.id === id);
    return subject?.code || subject?.id || id;
  }
}
