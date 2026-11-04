import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { SubjectService } from '../../services/subject.service';
import { TeacherService } from '../../../teachers/services/teacher.service';
import type { Subject } from '../../models/subject.model';
import type { Teacher } from '../../../teachers/models/teacher.model';

interface GradeRef {
  id: string;
  subjectId: string;
}

@Component({
  selector: 'app-subject-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './subject-detail.html',
  styleUrl: '../../../../shared/styles/catalog.css',
})
export class SubjectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly subjectService = inject(SubjectService);
  private readonly teacherService = inject(TeacherService);
  private readonly http = inject(HttpClient);

  readonly subject = signal<Subject | null>(null);
  readonly teacher = signal<Teacher | null>(null);
  readonly gradeCount = signal(0);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      this.errorMessage.set('Không tìm thấy mã môn học.');
      return;
    }

    forkJoin({
      subject: this.subjectService.getSubject(id),
      teachers: this.teacherService.getTeachers(),
      grades: this.http.get<GradeRef[]>('http://localhost:3001/grades')
    }).subscribe({
      next: ({ subject, teachers, grades }) => {
        this.subject.set(subject);
        this.teacher.set(teachers.find((item) => item.id === subject.teacherId) ?? null);
        this.gradeCount.set(grades.filter((grade) => grade.subjectId === id).length);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Không thể tải thông tin môn học.');
        this.loading.set(false);
      },
    });
  }
}
