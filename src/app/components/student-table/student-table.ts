import { Component, input, output } from '@angular/core';
import type { Student } from '../../services/student';


@Component({
  imports: [],
  selector: 'app-student-table',
  styleUrl: './student-table.css',
  templateUrl: './student-table.html',
})
export class StudentTable {
  //Nhận ds từ cha
  students = input.required<Student[]>();

  //Phát sự kiện lên cha
  edit = output<Student>();
  delete = output<string>();
}
