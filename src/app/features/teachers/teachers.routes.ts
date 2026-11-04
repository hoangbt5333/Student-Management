import { Routes } from '@angular/router';

export const TEACHER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/teacher-list/teacher-list').then((m) => m.TeacherListComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./components/teacher-detail/teacher-detail').then((m) => m.TeacherDetailComponent),
  },
];
