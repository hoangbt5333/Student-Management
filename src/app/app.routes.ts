import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'students',
        loadComponent: () =>
            import('./features/students/components/student-list/student-list')
                .then(m => m.StudentListComponent)
    },
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'students'
    },
    {
        path: '**',
        redirectTo: 'students'
    }
];
