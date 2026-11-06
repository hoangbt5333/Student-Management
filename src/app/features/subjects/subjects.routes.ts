import { Routes } from '@angular/router';
import { pendingChangesGuard } from '../../core/guards/pending-changes.guard';

export const SUBJECT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/subject-list/subject-list').then((m) => m.SubjectListComponent),
    canDeactivate: [pendingChangesGuard],
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./components/subject-detail/subject-detail').then((m) => m.SubjectDetailComponent),
  },
];
