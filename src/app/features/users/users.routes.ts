import { Routes } from '@angular/router';
import { pendingChangesGuard } from '../../core/guards/pending-changes.guard';

export const USER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/user-list/user-list.component').then(
        m => m.UserListComponent
      ),
    canDeactivate: [pendingChangesGuard],
  }
];
