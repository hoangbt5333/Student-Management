import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TooltipDirective } from '../../../../shared/directives/tooltip/tooltip.directive';
import { ClassFacade } from '../../../classes/facades/class.facade';
import { StudentFacade } from '../../../students/facades/student.facade';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TooltipDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  readonly studentFacade = inject(StudentFacade);
  readonly classFacade = inject(ClassFacade);

  readonly loading = computed(() => this.studentFacade.loading() || this.classFacade.loading());
  readonly errorMessage = computed(() => this.studentFacade.errorMessage() || this.classFacade.errorMessage());

  readonly stats = computed(() => {
    const students = this.studentFacade.students();
    const classes = this.classFacade.classes();

    const classStats = classes
      .map((classItem) => ({
        id: classItem.id,
        code: classItem.code || classItem.id,
        name: classItem.name,
        department: classItem.department,
        studentCount: students.filter((student) => {
          if (student.classId) {
            return student.classId === classItem.id;
          }

          return student.className?.trim() === classItem.name.trim();
        }).length,
      }))
      .sort((first, second) => second.studentCount - first.studentCount);

    const totalStudents = students.length;
    const totalClasses = classes.length;
    const averageStudentsPerClass = totalClasses === 0 ? '0.0' : (totalStudents / totalClasses).toFixed(1);

    return {
      totalStudents,
      totalClasses,
      averageStudentsPerClass,
      classStats,
      topClass: classStats[0],
      inactiveClasses: classStats.filter((item) => item.studentCount === 0),
    };
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.studentFacade.loadStudents();
    this.classFacade.loadClasses();
  }
}
