import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { ClassFacade } from '../../../classes/data-access/class.facade';
import { StudentFacade } from '../../../students/data-access/student.facade';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  readonly studentFacade = inject(StudentFacade);
  readonly classFacade = inject(ClassFacade);

  readonly stats = computed(() => {
    const students = this.studentFacade.students();
    const classes = this.classFacade.classes();

    const classStats = classes
      .map((classItem) => ({
        id: classItem.id,
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
    const averageStudentsPerClass = totalClasses === 0 ? 0 : (totalStudents / totalClasses).toFixed(1);

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
    this.studentFacade.loadStudents();
    this.classFacade.loadClasses();
  }
}
