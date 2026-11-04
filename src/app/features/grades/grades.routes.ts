import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/guards/role.guard';

export const GRADE_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard],
    data: { roles: ['admin', 'teacher'] },
    loadComponent: () =>
      import('./components/grade-list/grade-list').then((m) => m.GradeListComponent),
  },
];
