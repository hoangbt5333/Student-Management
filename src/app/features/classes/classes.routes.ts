import { Routes } from '@angular/router';
import { pendingChangesGuard } from '../../core/guards/pending-changes.guard';

export const CLASS_ROUTES: Routes = [
	{
		path: '',
		loadComponent: () => import('./pages/class-list/class-list').then((m) => m.ClassList),
		canDeactivate: [pendingChangesGuard],
	},
	{
		path: ':id',
		loadComponent: () => import('./pages/class-detail/class-detail').then((m) => m.ClassDetailComponent),
	},
];
