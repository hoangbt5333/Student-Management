import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth.guard';
import { roleGuard } from './core/auth/guards/role.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () =>
            import('./features/auth/components/login/login.component')
                .then(m => m.LoginComponent)
    },
    {
        path: 'forbidden',
        loadComponent: () =>
            import('./features/auth/components/forbidden/forbidden.component')
                .then(m => m.ForbiddenComponent)
    },
    {
        path: 'dashboard',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./features/dashboard/components/dashboard/dashboard')
                .then((m) => m.DashboardComponent)
    },
    {
        path: 'users',
        canActivate: [authGuard, roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () =>
            import('./features/auth/components/users/users.component')
                .then(m => m.UsersComponent)
    },
    {
        path: 'students',
        canActivate: [authGuard],
        loadChildren: () =>
            import('./features/students/students.routes')
                .then(m => m.STUDENT_ROUTES)
    },
    {
        path: 'classes',
        canActivate: [authGuard],
        loadChildren: () =>
            import('./features/classes/classes.routes')
                .then((m) => m.CLASS_ROUTES)
    },
    {
        path: '',
        canActivate: [authGuard],
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
