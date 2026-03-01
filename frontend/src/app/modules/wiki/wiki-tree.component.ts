import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { TreeModule } from 'primeng/tree';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TreeNode } from 'primeng/api';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-wiki-tree',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    TreeModule,
    ButtonModule,
    ProgressSpinnerModule
  ],
  template: `
    <div class="wiki-layout">
      <!-- Sidebar -->
      <div class="wiki-sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">Wiki</span>
          <p-button icon="pi pi-plus" [rounded]="true" [text]="true" size="small"
            (onClick)="newPage()" title="New Page" />
        </div>

        @if (loading()) {
          <div class="flex justify-content-center p-3">
            <p-progressSpinner [style]="{width:'24px',height:'24px'}" strokeWidth="4" />
          </div>
        }

        @if (!loading()) {
          <p-tree [value]="pages()" selectionMode="single"
            [(selection)]="selectedNode"
            (onNodeSelect)="onSelect($event)"
            [filter]="true" filterPlaceholder="Search pages…"
            styleClass="wiki-tree" />
        }

        @if (!loading() && pages().length === 0) {
          <div class="tree-empty">
            <p>No pages yet.</p>
            <p-button label="Create first page" size="small" (onClick)="newPage()" />
          </div>
        }
      </div>

      <!-- Content outlet -->
      <div class="wiki-content-area">
        <router-outlet />
        @if (!hasRoute()) {
          <div class="wiki-welcome">
            <i class="pi pi-book"></i>
            <h3>Select a page or create a new one</h3>
            <p-button label="New Page" icon="pi pi-plus" (onClick)="newPage()" />
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .wiki-layout { display: flex; height: calc(100vh - 60px); overflow: hidden; }
    .wiki-sidebar { width: 260px; flex-shrink: 0; border-right: 1px solid var(--surface-border); background: var(--surface-section); display: flex; flex-direction: column; overflow: hidden; }
    .sidebar-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem; border-bottom: 1px solid var(--surface-border); }
    .sidebar-title { font-weight: 600; color: var(--text-color); }
    .wiki-content-area { flex: 1; overflow-y: auto; }
    ::ng-deep .wiki-tree { background: transparent; border: none; padding: 0.5rem; }
    ::ng-deep .wiki-tree .p-tree-filter-container { padding: 0.5rem; }
    ::ng-deep .wiki-tree .p-treenode-content { border-radius: 6px; }
    ::ng-deep .wiki-tree .p-treenode-content:hover { background: var(--surface-hover) !important; }
    ::ng-deep .wiki-tree .p-highlight { background: rgba(79,70,229,0.15) !important; }
    .tree-empty { padding: 1rem; text-align: center; color: var(--text-color-secondary); font-size: 0.875rem; }
    .wiki-welcome { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; color: var(--text-color-secondary); gap: 1rem; }
    .wiki-welcome i { font-size: 3rem; }
    .wiki-welcome h3 { margin: 0; color: var(--text-color); }
  `]
})
export class WikiTreeComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  loading = signal(true);
  pages = signal<TreeNode[]>([]);
  selectedNode: TreeNode | null = null;

  ngOnInit() {
    this.api.get<any[]>('/wiki/pages').subscribe({
      next: (data) => {
        this.pages.set(this.buildTree(data));
        this.loading.set(false);
      },
      error: () => { this.pages.set([]); this.loading.set(false); }
    });
  }

  private buildTree(pages: any[]): TreeNode[] {
    const map = new Map<number, TreeNode>();
    const roots: TreeNode[] = [];
    for (const p of pages) {
      map.set(p.id, { key: String(p.id), label: p.title, data: p, children: [], icon: 'pi pi-file', leaf: true });
    }
    for (const p of pages) {
      const node = map.get(p.id)!;
      if (p.parentId && map.has(p.parentId)) {
        const parent = map.get(p.parentId)!;
        parent.children = parent.children || [];
        parent.children.push(node);
        parent.leaf = false;
        parent.icon = 'pi pi-folder';
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  onSelect(event: any) {
    const node = event.node as TreeNode;
    if (node?.data?.id) {
      this.router.navigate(['/wiki', node.data.id]);
    }
  }

  newPage() {
    this.router.navigate(['/wiki/new']);
  }

  hasRoute(): boolean {
    const url = this.router.url;
    return url !== '/wiki' && url !== '/wiki/' && url.startsWith('/wiki/');
  }
}
