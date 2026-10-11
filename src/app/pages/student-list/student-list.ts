import { ChangeDetectorRef, Component, inject, OnInit, signal, computed, effect } from '@angular/core';

import { StudentService } from '../../services/student';
import type { Student } from '../../services/student';
import { StudentTable } from '../../components/student-table/student-table';
import { StudentForm } from '../../components/student-form/student-form';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [StudentForm, StudentTable],
  templateUrl: './student-list.html',
  styleUrl: './student-list.css'
})
export class StudentListComponent implements OnInit {
  private studentService = inject(StudentService);
  private changeDetector = inject(ChangeDetectorRef);

  editingStudentId: string | null = null;

  students = signal<Student[]>([]);
  loading = signal(false);
  errorMessage = signal('');
  selectedStudent = signal<Student | null>(null);

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

  studentCount = computed(() => this.students().length);
  searchTerm = signal('');

  ngOnInit(): void {
    this.loadStudents();
  }

  loadStudents(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.studentService.getStudents().subscribe({
      next: (data) => {
        this.students.set(data);
        this.loading.set(false);
        this.changeDetector.markForCheck();
      },
      error: (error) => {
        console.error('Lỗi tải danh sách:', error);
        this.errorMessage.set(
          'Không thể tải danh sách sinh viên. Hãy kiểm tra backend.');
        this.loading.set(false);
        this.changeDetector.markForCheck();
      }
    });
  }

  filteredStudents = computed(() => {
    const keyword = this.normalizeSearchText(this.searchTerm().trim());

    if (!keyword) {
      return this.students();
    }

    return this.students().filter(student =>
      this.normalizeSearchText(student.id).includes(keyword) ||
      this.normalizeSearchText(student.name).includes(keyword)
    );
  });

  private normalizeSearchText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');
  }
  

  editStudent(student: Student): void {
    this.selectedStudent.set(student);
  }

  cancelEdit(): void {
    this.selectedStudent.set(null);
  }
  
  saveStudent(student: Student): void {
    this.errorMessage.set('');

    if (this.selectedStudent()) {
      //Đang sửa: PUT
      this.studentService.updateStudent(student).subscribe({
        next: () => {
          this.selectedStudent.set(null);
          this.loadStudents();
        },
        error: (error) => {
          console.error('Lỗi cập nhập sinh viên: ', error);
          this.errorMessage.set('Không thể cập nhập sinh viên')
        }
      });
    } else {
      //Đang thêm: POST
      this.studentService.addStudent(student).subscribe({
        next: () => {
          this.selectedStudent.set(null);
          this.loadStudents();
        },
        error: (error) => {
          console.error('Lỗi thêm sinh viên: ', error);
          this.errorMessage.set('Không thể thêm sinh viên.');
        }
      });
    }
  }

  deleteStudent(id: string): void {
    this.errorMessage.set('');

    this.studentService.deleteStudent(id).subscribe({
      next: () => {
        this.loadStudents();
      },
      error: (error) => {
        console.error('Lỗi xóa sinh viên:', error);
        this.errorMessage.set('Không thể xóa sinh viên.');
        this.changeDetector.markForCheck();
      }
    });
  }
}