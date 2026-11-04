import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { TeacherService } from '../../services/teacher.service';
import type { Teacher } from '../../models/teacher.model';

interface SubjectRef {
  id: string;
  code?: string;
  name: string;
  credits: number;
  teacherId?: string;
}

@Component({
  selector: 'app-teacher-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './teacher-detail.html',
  styleUrl: '../../../../shared/styles/catalog.css',
})
export class TeacherDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly teacherService = inject(TeacherService);
  private readonly http = inject(HttpClient);

  readonly teacher = signal<Teacher | null>(null);
  readonly subjects = signal<SubjectRef[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      this.errorMessage.set('Không tìm thấy mã giảng viên.');
      return;
    }

    forkJoin({
      teacher: this.teacherService.getTeacher(id),
      subjects: this.http.get<SubjectRef[]>('http://localhost:3001/subjects')
    }).subscribe({
      next: ({ teacher, subjects }) => {
        this.teacher.set(teacher);
        this.subjects.set(subjects.filter((subject) => subject.teacherId === id));
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Không thể tải hồ sơ giảng viên.');
        this.loading.set(false);
      },
    });
  }
}
