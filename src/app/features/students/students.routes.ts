import { Routes } from "@angular/router";

export const STUDENT_ROUTES: Routes = [
    {
        path: ':id',
        loadComponent: () =>
            import('./components/student-detail/student-detail')
                .then(m => m.StudentDetailComponent)
    },
    {
        path: '',
        loadComponent: () =>
            import('./components/student-list/student-list')
                    .then(m => m.StudentListComponent)
    }
];