import { Routes } from '@angular/router';
import { pendingChangesGuard } from '../../core/guards/pending-changes.guard';

export const SUBJECT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/subject-list/subject-list').then((m) => m.SubjectListComponent),
    canDeactivate: [pendingChangesGuard],
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/subject-detail/subject-detail').then((m) => m.SubjectDetailComponent),
  },
];
