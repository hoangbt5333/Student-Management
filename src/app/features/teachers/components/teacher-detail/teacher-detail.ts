import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TeacherFacade } from '../../facades/teacher.facade';
import { SubjectFacade } from '../../../subjects/facades/subject.facade';

@Component({
  selector: 'app-teacher-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './teacher-detail.html',
  styleUrl: './teacher-detail.css',
})
export class TeacherDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly teacherFacade = inject(TeacherFacade);
  readonly subjectFacade = inject(SubjectFacade);

  readonly teacherId = signal('');

  readonly teacher = computed(() => {
    const id = this.teacherId();
    if (!id) return null;
    return this.teacherFacade.teachers().find((item) => item.id === id) ?? null;
  });

  readonly subjects = computed(() => {
    const id = this.teacherId();
    if (!id) return [];
    return this.subjectFacade.subjects().filter((subject) => subject.teacherId === id);
  });

  readonly loading = computed(() => this.teacherFacade.loading() || this.subjectFacade.loading());
  readonly errorMessage = computed(() => {
    if (!this.teacherId()) return 'Không tìm thấy mã giảng viên.';
    if (!this.loading() && !this.teacher()) return 'Không tìm thấy giảng viên.';
    return this.teacherFacade.errorMessage() || this.subjectFacade.errorMessage();
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.teacherId.set(id);
    this.teacherFacade.loadTeachers();
    this.subjectFacade.loadSubjects();
  }
}
