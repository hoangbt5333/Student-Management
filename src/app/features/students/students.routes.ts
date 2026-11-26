import { Routes } from "@angular/router";
import { pendingChangesGuard } from '../../core/guards/pending-changes.guard';

export const STUDENT_ROUTES: Routes = [
    {
        path: ':id',
        loadComponent: () =>
            import('./pages/student-detail/student-detail')
                .then(m => m.StudentDetailComponent)
    },
    {
        path: '',
        loadComponent: () =>
            import('./pages/student-list/student-list')
                    .then(m => m.StudentListComponent),
        canDeactivate: [pendingChangesGuard]
    }
];
