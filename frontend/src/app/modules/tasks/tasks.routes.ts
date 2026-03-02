import { Routes } from '@angular/router';

export const TASKS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./kanban-board.component').then(m => m.KanbanBoardComponent)
  }
];
