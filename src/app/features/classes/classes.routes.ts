import { Routes } from '@angular/router';
import { pendingChangesGuard } from '../../core/guards/pending-changes.guard';

export const CLASS_ROUTES: Routes = [
	{
		path: '',
		loadComponent: () => import('./components/class-list/class-list').then((m) => m.ClassList),
		canDeactivate: [pendingChangesGuard],
	},
	{
		path: ':id',
		loadComponent: () => import('./components/class-detail/class-detail').then((m) => m.ClassDetailComponent),
	},
];
