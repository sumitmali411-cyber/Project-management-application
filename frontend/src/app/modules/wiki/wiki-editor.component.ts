import { Component, inject, signal, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DividerModule } from 'primeng/divider';
import { MarkdownService } from './markdown.service';
import { MermaidService } from './mermaid.service';
import { WikiExportService } from './wiki-export.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-wiki-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    ProgressSpinnerModule,
    ToastModule,
    DividerModule
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="editor-page">
      <!-- Top bar -->
      <div class="editor-topbar">
        <input class="page-title-input" [(ngModel)]="pageTitle" placeholder="Page Title…" />
        <div class="flex gap-2 align-items-center">
          <p-button label="Save" icon="pi pi-save" (onClick)="save()"
            [loading]="saving()" size="small" />
          <p-button label="Export PDF" icon="pi pi-file-pdf" severity="secondary" size="small"
            (onClick)="exportPdf()" />
        </div>
      </div>

      <!-- Toolbar -->
      <div class="editor-toolbar">
        @for (btn of toolbarButtons; track btn.label) {
          <button class="toolbar-btn" (click)="insertMarkdown(btn.insert)" [title]="btn.label">
            <i [class]="btn.icon"></i>
            <span>{{ btn.label }}</span>
          </button>
        }
      </div>

      <!-- Split pane -->
      <div class="editor-body">
        <div class="editor-pane">
          <textarea #editorRef class="md-editor" [(ngModel)]="content"
            (ngModelChange)="onContentChange()" placeholder="Write Markdown here…"></textarea>
        </div>
        <div class="preview-pane">
          <div class="wiki-content preview-scroll" #previewRef [innerHTML]="previewHtml()"></div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './wiki.component.scss'
})
export class WikiEditorComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('editorRef') editorRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('previewRef') previewRef!: ElementRef<HTMLDivElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private mdSvc = inject(MarkdownService);
  private mermaidSvc = inject(MermaidService);
  private exportSvc = inject(WikiExportService);
  private api = inject(ApiService);
  private toast = inject(MessageService);

  pageId: number | null = null;
  pageTitle = signal('');
  content = signal('');
  previewHtml = signal('');
  saving = signal(false);

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  toolbarButtons = [
    { label: 'Bold', icon: 'pi pi-bold', insert: '**bold**' },
    { label: 'Italic', icon: 'pi pi-italic', insert: '_italic_' },
    { label: 'Code', icon: 'pi pi-code', insert: '`code`' },
    { label: 'Table', icon: 'pi pi-table', insert: '\n| Column 1 | Column 2 |\n|---|---|\n| Cell | Cell |\n' },
    { label: 'Mermaid', icon: 'pi pi-sitemap', insert: '\n```mermaid\ngraph TD\n  A --> B\n```\n' }
  ];

  ngOnInit() {
    const pid = this.route.snapshot.paramMap.get('pageId');
    if (pid) {
      this.pageId = Number(pid);
      this.loadPage(this.pageId);
    }
  }

  ngAfterViewInit() {
    this.updatePreview();
  }

  ngOnDestroy() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  onContentChange() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.updatePreview(), 300);
  }

  private updatePreview() {
    const html = this.mdSvc.render(this.content());
    this.previewHtml.set(html);
    setTimeout(() => {
      if (this.previewRef?.nativeElement) {
        this.mermaidSvc.renderAll(this.previewRef.nativeElement);
      }
    }, 50);
  }

  private loadPage(id: number) {
    this.api.get<any>(`/wiki/pages/${id}`).subscribe({
      next: (page) => {
        this.pageTitle.set(page.title || '');
        this.content.set(page.contentMd || '');
        this.updatePreview();
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load page' })
    });
  }

  save() {
    if (!this.pageTitle()) {
      this.toast.add({ severity: 'warn', summary: 'Warning', detail: 'Page title is required' });
      return;
    }
    this.saving.set(true);
    const payload = { title: this.pageTitle(), contentMd: this.content() };
    const req = this.pageId
      ? this.api.put<any>(`/wiki/pages/${this.pageId}`, payload)
      : this.api.post<any>('/wiki/pages', payload);
    req.subscribe({
      next: (page) => {
        this.pageId = page.id;
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Saved', detail: 'Page saved successfully' });
        this.router.navigate(['/wiki', page.id]);
      },
      error: () => {
        this.saving.set(false);
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save page' });
      }
    });
  }

  exportPdf() {
    this.exportSvc.exportToPdf(this.pageTitle());
  }

  insertMarkdown(text: string) {
    const el = this.editorRef?.nativeElement;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = this.content();
    const updated = current.slice(0, start) + text + current.slice(end);
    this.content.set(updated);
    this.updatePreview();
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    });
  }
}
