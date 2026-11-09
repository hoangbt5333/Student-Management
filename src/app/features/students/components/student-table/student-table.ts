import { Component, inject, input, output, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Student } from '../../models/student.model';
import { AuthFacade } from '../../../../core/auth/facades/auth.facade';
import { TooltipDirective } from '../../../../shared/directives/tooltip/tooltip.directive';

@Component({
  imports: [RouterLink, TooltipDirective],
  selector: 'app-student-table',
  styleUrl: './student-table.css',
  templateUrl: './student-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentTable {
  readonly authFacade = inject(AuthFacade);

  //Nhận ds từ cha
  students = input.required<Student[]>();

  //Phát sự kiện lên cha
  edit = output<Student>();
  delete = output<string>();
}
