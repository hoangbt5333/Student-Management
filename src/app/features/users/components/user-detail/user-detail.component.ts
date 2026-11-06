import { DatePipe } from '@angular/common';
import { Component, inject, input, output, ChangeDetectionStrategy } from '@angular/core';

import { UserFacade } from '../../facades/user.facade';
import type { User } from '../../models/user.model';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetailComponent {
  readonly userFacade = inject(UserFacade);

  user = input<User | null>(null);
  close = output<void>();

  onClose(): void {
    this.close.emit();
  }
}
