import { ChangeDetectorRef, Component, inject, OnInit, signal, computed } from '@angular/core';

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
    const keyword = this.searchTerm().trim().toLowerCase();

    if (!keyword) {
      return this.students();
    }

    return this.students().filter(student =>
      student.id.toLowerCase().includes(keyword) ||
      student.name.toLowerCase().includes(keyword)
    );
  });
  

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