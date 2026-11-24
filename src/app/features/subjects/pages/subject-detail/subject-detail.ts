import { Component, computed, inject, input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SubjectFacade } from '../../facades/subject.facade';
import { TeacherFacade } from '../../../teachers/facades/teacher.facade';
import { GradeFacade } from '../../../grades/facades/grade.facade';

@Component({
  selector: 'app-subject-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './subject-detail.html',
  styleUrl: './subject-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubjectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute, { optional: true });
  readonly subjectFacade = inject(SubjectFacade);
  readonly teacherFacade = inject(TeacherFacade);
  readonly gradeFacade = inject(GradeFacade);

  readonly id = input<string>('');
  readonly subjectId = computed(() => this.id() || this.route?.snapshot.paramMap.get('id') || '');

  readonly subject = computed(() => {
    const id = this.subjectId();
    if (!id) return null;
    return this.subjectFacade.subjects().find((item) => item.id === id) ?? null;
  });

  readonly teacher = computed(() => {
    const sub = this.subject();
    if (!sub?.teacherId) return null;
    return this.teacherFacade.teachers().find((item) => item.id === sub.teacherId) ?? null;
  });

  readonly gradeCount = computed(() => {
    const id = this.subjectId();
    if (!id) return 0;
    return this.gradeFacade.grades().filter((grade) => grade.subjectId === id).length;
  });

  readonly loading = computed(() =>
    this.subjectFacade.loading() || this.teacherFacade.loading() || this.gradeFacade.loading()
  );

  readonly errorMessage = computed(() => {
    if (!this.subjectId()) return 'Không tìm thấy mã môn học.';
    if (!this.loading() && !this.subject()) return 'Không tìm thấy môn học.';
    return (
      this.subjectFacade.errorMessage() ||
      this.teacherFacade.errorMessage() ||
      this.gradeFacade.errorMessage()
    );
  });

  ngOnInit(): void {
    this.subjectFacade.loadSubjects();
    this.teacherFacade.loadTeachers();
    this.gradeFacade.loadGrades();
  }
}
