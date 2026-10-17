import { Routes } from '@angular/router';

export const CLASS_ROUTES: Routes = [
	{
		path: '',
		loadComponent: () => import('./components/class-list/class-list').then((m) => m.ClassList),
	},
	{
		path: ':id',
		loadComponent: () => import('./components/class-detail/class-detail').then((m) => m.ClassDetailComponent),
	},
];
