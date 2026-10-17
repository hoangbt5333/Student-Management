import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'dashboard',
        loadComponent: () =>
            import('./features/dashboard/components/dashboard/dashboard')
                .then((m) => m.DashboardComponent)
    },
    {
        path: 'students',
        loadChildren: () =>
            import('./features/students/students.routes')
                .then(m => m.STUDENT_ROUTES)
    },
    {
        path: 'classes',
        loadChildren: () =>
            import('./features/classes/classes.routes')
                .then((m) => m.CLASS_ROUTES)
    },
    {
        path: '',
        loadChildren: () =>
            import('./features/academics/academics.routes')
                .then((m) => m.ACADEMIC_ROUTES)
    },
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
    },
    {
        path: '**',
        redirectTo: 'dashboard'
    }
];
