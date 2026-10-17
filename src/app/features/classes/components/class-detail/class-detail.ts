import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ClassService } from '../../data-access/class.service';
import { StudentService } from '../../../students/data-access/student';
import type { ClassModel } from '../../data-access/models/class.model';
import type { Student } from '../../../students/data-access/models/student.model';

@Component({
  selector: 'app-class-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './class-detail.html',
  styleUrl: './class-detail.css',
})
export class ClassDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly classService = inject(ClassService);
  private readonly studentService = inject(StudentService);

  readonly classItem = signal<ClassModel | null>(null);
  readonly students = signal<Student[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Không tìm thấy mã lớp.');
      this.loading.set(false);
      return;
    }

    forkJoin({ classes: this.classService.getAll(), students: this.studentService.getStudents() }).subscribe({
      next: ({ classes, students }) => {
        const classItem = classes.find((item) => item.id === id) ?? null;
        this.classItem.set(classItem);
        this.students.set(students.filter((student) => student.classId === id || (!student.classId && student.className === classItem?.name)));
        if (!classItem) this.errorMessage.set('Không tìm thấy lớp học.');
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Không thể tải thông tin lớp học. Hãy kiểm tra Mock API.');
        this.loading.set(false);
      },
    });
  }
}
