import { Routes } from '@angular/router';

export const ACADEMIC_ROUTES: Routes = [
  {
    path: 'teachers',
    children: [
      {
        path: '',
        loadComponent: () => import('./components/teacher-list/teacher-list').then((m) => m.TeacherListComponent),
      },
      {
        path: ':id',
        loadComponent: () => import('./components/teacher-detail/teacher-detail').then((m) => m.TeacherDetailComponent),
      },
    ],
  },
  {
    path: 'subjects',
    children: [
      {
        path: '',
        loadComponent: () => import('./components/subject-list/subject-list').then((m) => m.SubjectListComponent),
      },
      {
        path: ':id',
        loadComponent: () => import('./components/subject-detail/subject-detail').then((m) => m.SubjectDetailComponent),
      },
    ],
  },
  {
    path: 'grades',
    loadComponent: () => import('./components/grade-list/grade-list').then((m) => m.GradeListComponent),
  },
];