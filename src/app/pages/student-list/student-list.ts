import { ChangeDetectorRef, Component, inject, OnInit, signal, computed, effect, ViewChild } from '@angular/core';

import { StudentService } from '../../services/student';
import type { Student } from '../../services/student';
import { StudentTable } from '../../components/student-table/student-table';
import { StudentForm } from '../../components/student-form/student-form';
import { StudentFacade } from '../../facades/student-facade';
import { StudentStore } from '../../stores/student.store';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [StudentForm, StudentTable],
  templateUrl: './student-list.html',
  styleUrl: './student-list.css'
})
export class StudentListComponent implements OnInit {
  @ViewChild(StudentForm) private studentForm!: StudentForm;

  private studentService = inject(StudentService);
  private changeDetector = inject(ChangeDetectorRef);
  private studentFacade = inject(StudentFacade);
  private studentStore = inject(StudentStore);

  editingStudentId: string | null = null;
  selectedStudent = signal<Student | null>(null);
  searchTerm = signal('');

  // readonly students = this.studentFacade.students;
  // readonly loading = this.studentFacade.loading;
  // readonly errorMessage = this.studentFacade.errorMessage;
  // readonly studentCount = this.studentFacade.studentCount;

  readonly students = this.studentStore.students;
  readonly loading = this.studentStore.loading;
  readonly errorMessage = this.studentStore.errorMessage;
  readonly studentCount = this.studentStore.studentCount;
  readonly filteredStudents = this.studentStore.filteredStudents;


  constructor(){
    effect(() => {
      const student = this.selectedStudent();

      if (student) {
        console.log('Đang sửa sinh viên: ', student.name);
      } else {
        console.log('Đang thêm sinh viên');
      }
    });

    effect(() => {
      console.log('Từ khoá tìm kiếm: ', this.searchTerm());
    });
  }


  ngOnInit(): void {
    this.studentStore.loadStudents();
  }

  // filteredStudents = computed(() => {
  //   const keyword = this.normalizeSearchText(this.searchTerm().trim());
  //   const students = this.studentFacade.students();

  //   if (!keyword) {
  //     return students;
  //   }

  //   return students.filter(student =>
  //     this.normalizeSearchText(student.id).includes(keyword) ||
  //     this.normalizeSearchText(student.name).includes(keyword)
  //   );
  // });

  // private normalizeSearchText(value: string): string {
  //   return value
  //     .toLowerCase()
  //     .normalize('NFD')
  //     .replace(/[\u0300-\u036f]/g, '')
  //     .replace(/đ/g, 'd');
  // }
  

  editStudent(student: Student): void {
    this.selectedStudent.set(student);
  }

  cancelEdit(): void {
    this.selectedStudent.set(null);
  }
  
  saveStudent(student: Student): void {
    // this.errorMessage.set('');
    if (this.selectedStudent()) {
      //Đang sửa: PUT
      this.studentStore.updateStudent(student);
      this.selectedStudent.set(null);
    } else {
      //Đang thêm: POST
      this.studentStore.addStudent(student);
    }
  }

  deleteStudent(id: string): void {
    this.studentStore.deleteStudent(id);
  }
}