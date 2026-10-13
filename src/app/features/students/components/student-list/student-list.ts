import { ChangeDetectorRef, Component, inject, OnInit, signal, computed, effect, ViewChild } from '@angular/core';

import { StudentService } from '../../data-access/student';
import type { Student } from '../../data-access/student';
import { StudentTable } from '../student-table/student-table';
import { StudentForm } from '../student-form/student-form';
import { StudentFacade } from '../../data-access/student.facade';
import { StudentStore } from '../../data-access/student.store';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [StudentForm, StudentTable],
  templateUrl: './student-list.html',
  styleUrl: './student-list.css'
})
export class StudentListComponent implements OnInit {
  // @ViewChild(StudentForm) private studentForm!: StudentForm;

  // private studentService = inject(StudentService);
  // private changeDetector = inject(ChangeDetectorRef);
  // private studentFacade = inject(StudentFacade);
  // private studentStore = inject(StudentStore);
  private facade = inject(StudentFacade);

  private clearSelectionOnSaveSuccess = effect(() => {
    const message = this.facade.successMessage();

    if (message) {
      this.selectedStudent.set(null);
    }
  });

  editingStudentId: string | null = null;
  selectedStudent = signal<Student | null>(null);
  searchTerm = signal('');

  // readonly students = this.studentFacade.students;
  // readonly loading = this.studentFacade.loading;
  // readonly errorMessage = this.studentFacade.errorMessage;
  // readonly studentCount = this.studentFacade.studentCount;

  students = this.facade.students;
  loading = this.facade.loading;
  errorMessage = this.facade.errorMessage;
  successMessage = this.facade.successMessage;
  studentCount = this.facade.studentCount;
  filteredStudents = this.facade.filteredStudents;


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
    this.facade.loadStudents();
  }

  search(keyword: string): void {
    this.facade.setSearchTerm(keyword);
  }


  editStudent(student: Student): void {
    this.selectedStudent.set(student);
  }

  cancelEdit(): void {
    this.selectedStudent.set(null);
  }
  
  saveStudent(student: Student): void {
    const mode = this.selectedStudent() ? 'update' : 'add';

    this.facade.saveStudent(student, mode);
  }

  deleteStudent(id: string): void {
    this.facade.deleteStudent(id);
  }
}