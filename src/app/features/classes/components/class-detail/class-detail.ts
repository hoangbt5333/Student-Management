import { Component, computed, inject, input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClassFacade } from '../../facades/class.facade';
import { StudentFacade } from '../../../students/facades/student.facade';

@Component({
  selector: 'app-class-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './class-detail.html',
  styleUrl: './class-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute, { optional: true });
  readonly classFacade = inject(ClassFacade);
  readonly studentFacade = inject(StudentFacade);

  readonly id = input<string>('');

  readonly classId = computed(() => this.id() || this.route?.snapshot.paramMap.get('id') || '');

  readonly classItem = computed(() => {
    const id = this.classId();
    if (!id) return null;
    return this.classFacade.classes().find((item) => item.id === id) ?? null;
  });

  readonly students = computed(() => {
    const id = this.classId();
    const currentClass = this.classItem();
    if (!id) return [];
    return this.studentFacade.students().filter(
      (student) => student.classId === id || (!student.classId && student.className === currentClass?.name)
    );
  });

  readonly loading = computed(() => this.classFacade.loading() || this.studentFacade.loading());
  readonly errorMessage = computed(() => {
    if (!this.classId()) return 'Không tìm thấy mã lớp.';
    if (!this.loading() && !this.classItem()) return 'Không tìm thấy lớp học.';
    return this.classFacade.errorMessage() || this.studentFacade.errorMessage();
  });

  ngOnInit(): void {
    this.classFacade.loadClasses();
    this.studentFacade.loadStudents();
  }
}
