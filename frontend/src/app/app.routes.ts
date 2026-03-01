import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./modules/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES)
      },
      {
        path: 'projects',
        loadChildren: () =>
          import('./modules/projects/projects.routes').then(m => m.PROJECTS_ROUTES)
      },
      {
        path: 'tasks',
        loadChildren: () =>
          import('./modules/tasks/tasks.routes').then(m => m.TASKS_ROUTES)
      },
      {
        path: 'wiki',
        loadChildren: () =>
          import('./modules/wiki/wiki.routes').then(m => m.WIKI_ROUTES)
      },
      {
        path: 'commits',
        loadChildren: () =>
          import('./modules/commits/commits.routes').then(m => m.COMMITS_ROUTES)
      },
      {
        path: 'team',
        loadChildren: () =>
          import('./modules/team/team.routes').then(m => m.TEAM_ROUTES)
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./modules/settings/settings.routes').then(m => m.SETTINGS_ROUTES)
      }
    ]
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./modules/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  { path: '**', redirectTo: 'dashboard' }
];
