import { Component, inject, signal, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MenuItem } from 'primeng/api';
import { MarkdownService } from './markdown.service';
import { MermaidService } from './mermaid.service';
import { WikiExportService } from './wiki-export.service';
import { ApiService } from '../../core/services/api.service';

interface TocItem { id: string; text: string; level: number; }

@Component({
  selector: 'app-wiki-page-view',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    ButtonModule,
    BreadcrumbModule,
    ProgressSpinnerModule
  ],
  template: `
    <div class="page-view-layout">
      <!-- TOC Sidebar -->
      <div class="toc-sidebar" [class.hidden]="toc().length === 0">
        <div class="toc-title">On this page</div>
        @for (item of toc(); track item.id) {
          <a class="toc-link" [class]="'toc-h' + item.level"
            (click)="scrollToHeading(item.id)">{{ item.text }}</a>
        }
      </div>

      <!-- Main Content -->
      <div class="page-content">
        @if (loading()) {
          <div class="flex justify-content-center" style="padding:4rem">
            <p-progressSpinner strokeWidth="4" />
          </div>
        }

        @if (!loading() && page()) {
          <div class="page-header">
            <p-breadcrumb [model]="breadcrumbs()" [home]="{icon:'pi pi-home', routerLink:'/wiki'}" />
            <div class="flex align-items-center justify-content-between mt-3">
              <h1 class="page-title">{{ page()!.title }}</h1>
              <div class="flex gap-2">
                <p-button icon="pi pi-pencil" label="Edit" size="small"
                  [routerLink]="['/wiki', page()!.id, 'edit']" />
                <p-button icon="pi pi-file-pdf" severity="secondary" size="small"
                  (onClick)="exportPdf()" />
              </div>
            </div>
            <div class="page-meta">
              <span>Last updated {{ page()!.updatedAt | date:'MMM d, yyyy' }}</span>
              @if (page()!.lastEditor) {
                <span> · by {{ page()!.lastEditor }}</span>
              }
            </div>
          </div>

          <div class="wiki-content" #contentRef [innerHTML]="renderedHtml()"></div>
        }

        @if (!loading() && !page()) {
          <div class="empty-state">
            <i class="pi pi-file"></i>
            <p>Page not found.</p>
            <p-button label="Back to Wiki" routerLink="/wiki" />
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page-view-layout { display: flex; gap: 1.5rem; padding: 1.5rem; }
    .toc-sidebar { width: 220px; flex-shrink: 0; position: sticky; top: 1rem; align-self: flex-start; }
    .toc-sidebar.hidden { display: none; }
    .toc-title { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--text-color-secondary); margin-bottom: 0.75rem; }
    .toc-link { display: block; font-size: 0.8rem; color: var(--text-color-secondary); cursor: pointer; padding: 3px 0; border-left: 2px solid var(--surface-border); padding-left: 0.75rem; margin-bottom: 4px; transition: all 0.15s; text-decoration: none; }
    .toc-link:hover { color: var(--primary-color); border-left-color: var(--primary-color); }
    .toc-h2 { padding-left: 0.75rem; }
    .toc-h3 { padding-left: 1.5rem; font-size: 0.75rem; }
    .page-content { flex: 1; min-width: 0; }
    .page-header { margin-bottom: 2rem; }
    .page-title { margin: 0; font-size: 2rem; font-weight: 700; color: var(--text-color); }
    .page-meta { margin-top: 0.5rem; font-size: 0.8rem; color: var(--text-color-secondary); }
    .empty-state { text-align: center; padding: 4rem 2rem; color: var(--text-color-secondary); }
    .empty-state i { font-size: 3rem; margin-bottom: 1rem; display: block; }
  `]
})
export class WikiPageViewComponent implements OnInit, AfterViewInit {
  @ViewChild('contentRef') contentRef!: ElementRef<HTMLDivElement>;

  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private mdSvc = inject(MarkdownService);
  private mermaidSvc = inject(MermaidService);
  private exportSvc = inject(WikiExportService);

  loading = signal(true);
  page = signal<any>(null);
  renderedHtml = signal('');
  toc = signal<TocItem[]>([]);
  breadcrumbs = signal<MenuItem[]>([]);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('pageId'));
      if (id) this.loadPage(id);
    });
  }

  ngAfterViewInit() {}

  private loadPage(id: number) {
    this.loading.set(true);
    this.api.get<any>(`/wiki/pages/${id}`).subscribe({
      next: (page) => {
        this.page.set(page);
        const html = this.mdSvc.render(page.contentMd || '');
        this.renderedHtml.set(html);
        this.buildToc(html);
        this.breadcrumbs.set([{ label: 'Wiki', routerLink: '/wiki' }, { label: page.title }]);
        this.loading.set(false);
        setTimeout(() => {
          if (this.contentRef?.nativeElement) {
            this.mermaidSvc.renderAll(this.contentRef.nativeElement);
          }
        }, 100);
      },
      error: () => { this.page.set(null); this.loading.set(false); }
    });
  }

  private buildToc(html: string) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const items: TocItem[] = [];
    doc.querySelectorAll('h2,h3').forEach(el => {
      const text = el.textContent || '';
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      items.push({ id, text, level: el.tagName === 'H2' ? 2 : 3 });
    });
    this.toc.set(items);
  }

  scrollToHeading(id: string) {
    const el = document.getElementById(id) || this.contentRef?.nativeElement?.querySelector(`[id="${id}"]`);
    el?.scrollIntoView({ behavior: 'smooth' });
  }

  exportPdf() {
    this.exportSvc.exportToPdf(this.page()?.title || 'Wiki Page');
  }
}
