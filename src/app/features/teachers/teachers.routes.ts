import { Routes } from '@angular/router';
import { pendingChangesGuard } from '../../core/guards/pending-changes.guard';

export const TEACHER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/teacher-list/teacher-list').then((m) => m.TeacherListComponent),
    canDeactivate: [pendingChangesGuard],
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./components/teacher-detail/teacher-detail').then((m) => m.TeacherDetailComponent),
  },
];
