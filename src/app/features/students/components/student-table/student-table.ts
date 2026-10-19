import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Student } from '../../data-access/models/student.model';
import { AuthFacade } from '../../../../core/auth/facades/auth.facade';


@Component({
  imports: [RouterLink],
  selector: 'app-student-table',
  styleUrl: './student-table.css',
  templateUrl: './student-table.html',
})
export class StudentTable {
  readonly authFacade = inject(AuthFacade);

  //Nhận ds từ cha
  students = input.required<Student[]>();

  //Phát sự kiện lên cha
  edit = output<Student>();
  delete = output<string>();
}
