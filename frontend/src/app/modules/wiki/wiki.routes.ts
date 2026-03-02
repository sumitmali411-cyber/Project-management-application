import { Routes } from '@angular/router';

export const WIKI_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./wiki-tree.component').then(m => m.WikiTreeComponent),
    children: [
      // 'new' must come before ':pageId' to avoid being swallowed by the param route
      {
        path: 'new',
        loadComponent: () => import('./wiki-editor.component').then(m => m.WikiEditorComponent)
      },
      {
        path: ':pageId',
        loadComponent: () => import('./wiki-page-view.component').then(m => m.WikiPageViewComponent)
      },
      {
        path: ':pageId/edit',
        loadComponent: () => import('./wiki-editor.component').then(m => m.WikiEditorComponent)
      }
    ]
  }
];
