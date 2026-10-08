import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  imports: [FormsModule],
  selector: 'app-student-list',
  styleUrl: './student-list.css',
  templateUrl: './student-list.html',
})
export class StudentList {
  title = 'Student List';
  editButtonDisabled = true;

  studentId = '';
  studentName = '';
  studentEmail = '';
  studentGender = '';

  students = [
    { id: 'SV01', name: 'John Doe', email: 'john.doe@abcuniversity.edu', gender: 'Male' },
    { id: 'SV02', name: 'Jane Smith', email: 'jane.smith@abcuniversity.edu', gender: 'Female' },
    { id: 'SV03', name: 'Michael Johnson', email: 'michael.johnson@abcuniversity.edu', gender: 'Male' }
  ];

  addStudent() {
    if (this.studentId && this.studentName && this.studentEmail && this.studentGender) {
      const newStudent = {
        id: this.studentId,
        name: this.studentName,
        email: this.studentEmail,
        gender: this.studentGender
      };
      this.students.push(newStudent);
      this.studentId = '';
      this.studentName = '';
      this.studentEmail = '';
      this.studentGender = '';
    } else {
      alert('Please fill in all fields before adding a student.');
    }
  }

  deleteStudent(studentId: string) {
    this.students = this.students.filter(student => student.id !== studentId);
  }

  editStudent(studentId: string) {
    const student = this.students.find(student => student.id === studentId);
    if (student) {
      this.studentId = student.id;
      this.studentName = student.name;
      this.studentEmail = student.email;
      this.studentGender = student.gender;
      this.editButtonDisabled = false;
    }
  }

  updateStudent() {
    const index = this.students.findIndex(student => student.id === this.studentId);
    
    if (index !== -1) {
      this.students[index] = {
        id: this.studentId,
        name: this.studentName,
        email: this.studentEmail,
        gender: this.studentGender
      };
      this.studentId = '';
      this.studentName = '';
      this.studentEmail = '';
      this.studentGender = '';
      this.editButtonDisabled = true;
    } else {
      alert('Student not found.');
    }
  }
}
