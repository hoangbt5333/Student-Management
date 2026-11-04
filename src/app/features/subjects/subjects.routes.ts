import { Routes } from '@angular/router';

export const SUBJECT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/subject-list/subject-list').then((m) => m.SubjectListComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./components/subject-detail/subject-detail').then((m) => m.SubjectDetailComponent),
  },
];
