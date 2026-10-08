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

  schoolName = 'ABC University';
  studentName = '';
  studentId = '';
  email = '';
  phone = '123-456-7890';

  studentAvatar = 'https://example.com/avatar.jpg';

  studentCount = 0;
  isDisabled = false;



  addStudent() {
    this.studentCount++;

    if (this.studentCount >= 10) {
      this.isDisabled = true;
    } 

    console.log('Mã sinh viên:', this.studentId);
    console.log('Tên sinh viên:', this.studentName);
    console.log('Email:', this.email);
  }

  resetCount() {
    this.studentCount = 0;
    this.isDisabled = false;
  }

  deleteStudent() {
    this.studentCount--;
    if (this.studentCount < 10) {
      this.isDisabled = false;
    }
  }
}
