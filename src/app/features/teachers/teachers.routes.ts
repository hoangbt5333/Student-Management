import { Routes } from '@angular/router';
import { pendingChangesGuard } from '../../core/guards/pending-changes.guard';

export const TEACHER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/teacher-list/teacher-list').then((m) => m.TeacherListComponent),
    canDeactivate: [pendingChangesGuard],
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/teacher-detail/teacher-detail').then((m) => m.TeacherDetailComponent),
  },
];
