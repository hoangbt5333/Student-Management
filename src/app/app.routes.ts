import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'students',
        loadChildren: () =>
            import('./features/students/students.routes')
                .then(m => m.STUDENT_ROUTES)
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
