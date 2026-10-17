import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AcademicService } from '../../data-access/academic.service';
import type { Subject, Teacher } from '../../data-access/academic.model';

@Component({
  selector: 'app-teacher-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './teacher-detail.html',
  styleUrl: '../catalog.css',
})
export class TeacherDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(AcademicService);
  readonly teacher = signal<Teacher | null>(null);
  readonly subjects = signal<Subject[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.loading.set(false); this.errorMessage.set('Không tìm thấy mã giảng viên.'); return; }
    forkJoin({ teacher: this.service.getTeacher(id), subjects: this.service.getSubjects() }).subscribe({
      next: ({ teacher, subjects }) => { this.teacher.set(teacher); this.subjects.set(subjects.filter((subject) => subject.teacherId === id)); this.loading.set(false); },
      error: () => { this.errorMessage.set('Không thể tải hồ sơ giảng viên.'); this.loading.set(false); },
    });
  }
}
