import { Routes } from '@angular/router';

export const COMMITS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./commits-list.component').then(m => m.CommitsListComponent)
  }
];
