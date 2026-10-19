import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { StudentService } from '../../data-access/student';
import { ClassService } from '../../../classes/data-access/class.service';
import { AcademicService } from '../../../academics/data-access/academic.service';
import type { Student } from '../../data-access/models/student.model';
import type { ClassModel } from '../../../classes/data-access/models/class.model';
import type { Grade, Subject } from '../../../academics/data-access/academic.model';

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './student-detail.html',
  styleUrl: './student-detail.css',
})
export class StudentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly studentService = inject(StudentService);
  private readonly classService = inject(ClassService);
  private readonly academicService = inject(AcademicService);

  readonly student = signal<Student | null>(null);
  readonly classItem = signal<ClassModel | null>(null);
  readonly grades = signal<Grade[]>([]);
  readonly subjects = signal<Subject[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly average = computed(() => {
    const scores = this.grades().map((grade) => grade.score).filter((score) => score >= 0 && score <= 10);
    return scores.length ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2) : 'Chưa có';
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Không tìm thấy mã sinh viên.');
      this.loading.set(false);
      return;
    }

    forkJoin({
      students: this.studentService.getStudents(),
      classes: this.classService.getAll(),
      grades: this.academicService.getGrades(),
      subjects: this.academicService.getSubjects(),
    }).subscribe({
      next: ({ students, classes, grades, subjects }) => {
        const student = students.find((item) => item.id === id) ?? null;
        this.student.set(student);
        this.classItem.set(classes.find((item) => item.id === student?.classId || item.name === student?.className) ?? null);
        this.grades.set(grades.filter((grade) => grade.studentId === id));
        this.subjects.set(subjects);
        if (!student) this.errorMessage.set('Không tìm thấy sinh viên.');
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Không thể tải hồ sơ sinh viên. Hãy kiểm tra Mock API.');
        this.loading.set(false);
      },
    });
  }

  subjectName(id: string): string {
    return this.subjects().find((subject) => subject.id === id)?.name ?? 'Môn học không tồn tại';
  }

  subjectCode(id: string): string {
    const subject = this.subjects().find((item) => item.id === id);
    return subject?.code || subject?.id || id;
  }
}
