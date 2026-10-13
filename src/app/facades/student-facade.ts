import { Service, computed, inject, Injectable, signal } from '@angular/core';
import { StudentService } from '../features/students/data-access/student';
import type { Student } from '../features/students/data-access/student';

// @Service()

@Injectable({
    providedIn: 'root'
})

export class StudentFacade {
    private studentService = inject(StudentService);

    readonly students = signal<Student[]>([]);
    readonly loading = signal(false);
    readonly errorMessage = signal('');

    readonly studentCount = computed(
        () => this.students().length
    );

    loadStudents(): void {
        this.loading.set(true);
        this.errorMessage.set('');

        this.studentService.getStudents().subscribe({
            next: (students) => {
                this.students.set(students);
                this.loading.set(false);
            },
            error: (error) => {
                console.log('Lỗi tải sinh viên: ', error);
                this.errorMessage.set('Không thể tải danh sách sinh viên.');
                this.loading.set(false);
            }
        });
    }

    
    addStudent(student: Student, onSuccess: () => void): void {
        this.loading.set(true);
        this.errorMessage.set('');

        this.studentService.addStudent(student).subscribe({
            next: () => {
                onSuccess();
                this.loadStudents();
            },
            error: (error) => {
                console.error('Lỗi thêm sinh viên:', error);
                this.errorMessage.set('Không thể thêm sinh viên.');
                this.loading.set(false);
            }
        });
    }

    updateStudent(student: Student): void {
        this.loading.set(true);
        this.errorMessage.set('');

        this.studentService.updateStudent(student).subscribe({
            next: () => {
                this.loadStudents();
            },
            error: (error) => {
                console.error('Lỗi cập nhật sinh viên:', error);
                this.errorMessage.set('Không thể cập nhật sinh viên.');
                this.loading.set(false);
            }
        });
    }

    deleteStudent(id: string): void {
        this.loading.set(true);
        this.errorMessage.set('');

        this.studentService.deleteStudent(id).subscribe({
            next: () => {
                this.loadStudents();
            },
            error: (error) => {
                console.error('Lỗi xóa sinh viên:', error);
                this.errorMessage.set('Không thể xóa sinh viên.');
                this.loading.set(false);
            }
        });
    }

}
