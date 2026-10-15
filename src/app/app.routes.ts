import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'students',
        loadChildren: () =>
            import('./features/students/students.routes')
                .then(m => m.STUDENT_ROUTES)
    },
    {
        path: 'classes',
        loadComponent: () =>
            import('./features/classes/components/class-list/class-list')
                .then((m) => m.ClassList)
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
