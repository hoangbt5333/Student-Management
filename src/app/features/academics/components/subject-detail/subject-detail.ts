import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AcademicService } from '../../data-access/academic.service';
import type { Grade, Subject, Teacher } from '../../data-access/academic.model';

@Component({
  selector: 'app-subject-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './subject-detail.html',
  styleUrl: '../catalog.css',
})
export class SubjectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(AcademicService);
  readonly subject = signal<Subject | null>(null);
  readonly teacher = signal<Teacher | null>(null);
  readonly gradeCount = signal(0);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.loading.set(false); this.errorMessage.set('Không tìm thấy mã môn học.'); return; }
    forkJoin({ subjects: this.service.getSubjects(), teachers: this.service.getTeachers(), grades: this.service.getGrades() }).subscribe({
      next: ({ subjects, teachers, grades }) => {
        const subject = subjects.find((item) => item.id === id) ?? null;
        this.subject.set(subject);
        this.teacher.set(teachers.find((item) => item.id === subject?.teacherId) ?? null);
        this.gradeCount.set(grades.filter((grade) => grade.subjectId === id).length);
        if (!subject) this.errorMessage.set('Không tìm thấy môn học.');
        this.loading.set(false);
      },
      error: () => { this.errorMessage.set('Không thể tải thông tin môn học.'); this.loading.set(false); },
    });
  }
}
