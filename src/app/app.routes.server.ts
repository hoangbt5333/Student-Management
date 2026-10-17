import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'students/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'classes/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'teachers/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'subjects/:id',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
