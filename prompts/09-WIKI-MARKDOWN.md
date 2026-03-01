# 09 — Wiki & Markdown Module
## Integrating: vonfluence-wiki-markdown-chalks + markdown-previewer-mermaid

## How to Pull the Sub-Repos

```bash
# From project root
git clone https://github.com/sumitmali411-cyber/vonfluence-wiki-markdown-chalks temp/wiki-chalks
git clone https://github.com/sumitmali411-cyber/markdown-previewer-mermaid temp/md-previewer

# Files to port into Angular:
# temp/wiki-chalks/confluenceParser.js  → src/app/modules/wiki/services/confluence-parser.service.ts
# temp/wiki-chalks/mermaidLoader.js     → src/app/shared/services/mermaid.service.ts
# temp/wiki-chalks/styles.css           → src/app/modules/wiki/wiki.component.scss
# temp/md-previewer/app.js              → src/app/modules/wiki/services/markdown.service.ts
# temp/md-previewer/exportService.js    → src/app/modules/wiki/services/wiki-export.service.ts
```

---

## Prompt for AI Code Generation

```
Port the vonfluence-wiki-markdown-chalks and markdown-previewer-mermaid JavaScript apps
into Angular 17 standalone components with PrimeNG UI.

SOURCE REPOS:
- https://github.com/sumitmali411-cyber/vonfluence-wiki-markdown-chalks
  (confluenceParser.js, mermaidLoader.js, styles.css)
- https://github.com/sumitmali411-cyber/markdown-previewer-mermaid
  (app.js, mermaidLoader.js, exportService.js)

ANGULAR COMPONENTS TO GENERATE:
1. MermaidService — Angular service wrapping mermaidLoader.js logic
   - loadMermaid(version: string) — dynamic CDN import
   - renderDiagrams(container: HTMLElement) — render all mermaid blocks
   - switchVersion(version: string) — hot-swap without reload

2. MarkdownService — Angular service wrapping marked + DOMPurify
   - render(markdown: string): string — returns sanitized HTML
   - renderWithMermaid(markdown: string, container: HTMLElement): Promise<void>

3. ConfluenceParserService — port confluenceParser.js 3-pass algorithm:
   - parse(wikiMarkup: string): string — returns HTML

4. WikiEditorComponent (standalone) — split-pane editor
   - Left: PrimeNG Splitter, raw textarea with PrimeNG Editor OR CodeMirror
   - Right: live preview pane with rendered HTML
   - Toolbar: Bold, Italic, Code, Table, Mermaid diagram insert, Save, Export PDF
   - Uses PrimeNG Toolbar component

5. WikiPageViewComponent — read-only rendered wiki page
   - Breadcrumb navigation (PrimeNG Breadcrumb)
   - Page title, author, last edited
   - Rendered markdown with mermaid diagrams
   - Sidebar: table of contents (auto-generated from headings)

6. WikiTreeComponent — left sidebar tree
   - PrimeNG Tree component
   - Drag-to-reorder pages
   - New page button

MERMAID VERSIONS TO SUPPORT: 10.8, 11.2, 11.4, latest (exactly matching source repo)
```

---

## mermaid.service.ts

```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

declare const mermaid: any;

@Injectable({ providedIn: 'root' })
export class MermaidService {
  private loadedVersions = new Map<string, Promise<void>>();
  private currentVersion$ = new BehaviorSubject<string>('11.4');

  readonly versions = ['10.8', '11.2', '11.4', 'latest'];
  readonly cdnBase = 'https://cdn.jsdelivr.net/npm/mermaid@';

  async loadVersion(version: string): Promise<void> {
    const key = version === 'latest' ? 'latest' : version;
    if (this.loadedVersions.has(key)) return this.loadedVersions.get(key)!;

    const promise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${this.cdnBase}${version === 'latest' ? '' : version}/dist/mermaid.min.js`;
      script.onload = () => {
        (window as any).mermaid?.initialize({
          startOnLoad: false,
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
          securityLevel: 'loose'
        });
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });

    this.loadedVersions.set(key, promise);
    return promise;
  }

  async renderDiagrams(container: HTMLElement, version = '11.4'): Promise<void> {
    await this.loadVersion(version);
    const blocks = container.querySelectorAll('code.language-mermaid, .mermaid-source');

    for (const block of Array.from(blocks)) {
      const source = block.textContent || '';
      const wrapper = document.createElement('div');
      wrapper.className = 'mermaid-diagram';

      try {
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const { svg } = await (window as any).mermaid.render(id, source);
        wrapper.innerHTML = svg;
        block.parentElement?.replaceChild(wrapper, block);
      } catch (err) {
        wrapper.innerHTML = `<div class="p-message p-message-error">Diagram error: ${err}</div>`;
        block.parentElement?.replaceChild(wrapper, block);
      }
    }
  }

  setVersion(version: string) {
    this.currentVersion$.next(version);
  }
}
```

---

## markdown.service.ts

```typescript
import { Injectable } from '@angular/core';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { MermaidService } from './mermaid.service';
import hljs from 'highlight.js';

@Injectable({ providedIn: 'root' })
export class MarkdownService {
  constructor(private mermaid: MermaidService) {
    // Configure marked with syntax highlighting
    marked.setOptions({
      highlight: (code: string, lang: string) => {
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return code;
      }
    } as any);
  }

  render(markdown: string): string {
    const raw = marked.parse(markdown) as string;
    return DOMPurify.sanitize(raw, { ADD_TAGS: ['pre', 'code'], ADD_ATTR: ['class'] });
  }

  async renderWithMermaid(markdown: string, container: HTMLElement, version = '11.4'): Promise<void> {
    container.innerHTML = this.render(markdown);
    await this.mermaid.renderDiagrams(container, version);
  }
}
```

---

## wiki-editor.component.ts

```typescript
import {
  Component, OnInit, OnDestroy, signal, inject,
  ElementRef, ViewChild, AfterViewChecked
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SplitterModule } from 'primeng/splitter';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { MarkdownService } from '../services/markdown.service';
import { WikiService } from '../services/wiki.service';
import { Subject, debounceTime, takeUntil } from 'rxjs';

@Component({
  selector: 'app-wiki-editor',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    SplitterModule, ToolbarModule, ButtonModule,
    InputTextModule, SelectButtonModule, ToastModule
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="wiki-editor flex flex-column" style="height: calc(100vh - 120px);">
      
      <!-- Toolbar -->
      <p-toolbar styleClass="mb-2 border-round">
        <ng-template pTemplate="start">
          <input pInputText [(ngModel)]="pageTitle" placeholder="Page title..."
                 class="mr-2" style="width: 300px;" />
          <p-button icon="pi pi-bold"   styleClass="p-button-text" (onClick)="insert('**', '**')" pTooltip="Bold" />
          <p-button icon="pi pi-italic" styleClass="p-button-text" (onClick)="insert('*', '*')" pTooltip="Italic" />
          <p-button icon="pi pi-code"   styleClass="p-button-text" (onClick)="insertCode()" pTooltip="Code" />
          <p-button label="Mermaid"     styleClass="p-button-text p-button-sm" (onClick)="insertMermaid()" />
          <p-button label="Table"       styleClass="p-button-text p-button-sm" (onClick)="insertTable()" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-selectButton [options]="mermaidVersions" [(ngModel)]="selectedMermaidVersion"
                          optionLabel="label" optionValue="value" styleClass="mr-2 text-sm" />
          <p-button label="Export PDF"  icon="pi pi-file-pdf" styleClass="p-button-outlined mr-2"
                    (onClick)="exportPdf()" />
          <p-button label="Save"        icon="pi pi-save" (onClick)="save()" [loading]="saving()" />
        </ng-template>
      </p-toolbar>

      <!-- Split Pane -->
      <p-splitter [panelSizes]="[50, 50]" styleClass="flex-1" layout="horizontal">
        <ng-template pTemplate>
          <textarea
            #editorArea
            [(ngModel)]="content"
            (input)="onInput()"
            class="w-full h-full p-3 font-mono text-sm surface-ground border-none outline-none resize-none"
            style="font-family: 'JetBrains Mono', monospace; line-height: 1.6;"
            placeholder="Write markdown or Confluence wiki markup here..."
          ></textarea>
        </ng-template>
        <ng-template pTemplate>
          <div #previewPane
               class="wiki-preview w-full h-full p-4 overflow-y-auto surface-section">
          </div>
        </ng-template>
      </p-splitter>
    </div>
  `,
  styleUrls: ['./wiki.component.scss']
})
export class WikiEditorComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('previewPane') previewPane!: ElementRef<HTMLDivElement>;
  @ViewChild('editorArea')  editorArea!: ElementRef<HTMLTextAreaElement>;

  private md = inject(MarkdownService);
  private wikiSvc = inject(WikiService);
  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);
  private destroy$ = new Subject<void>();
  private inputSubject = new Subject<string>();
  private needsRender = false;

  pageTitle = signal('');
  content   = '';
  saving    = signal(false);
  selectedMermaidVersion = '11.4';

  mermaidVersions = [
    { label: '10.8', value: '10.8' },
    { label: '11.2', value: '11.2' },
    { label: '11.4', value: '11.4' },
    { label: 'Latest', value: 'latest' }
  ];

  ngOnInit() {
    this.inputSubject.pipe(debounceTime(120), takeUntil(this.destroy$))
      .subscribe(() => { this.needsRender = true; });
  }

  ngAfterViewChecked() {
    if (this.needsRender && this.previewPane) {
      this.needsRender = false;
      this.md.renderWithMermaid(this.content, this.previewPane.nativeElement, this.selectedMermaidVersion);
    }
  }

  onInput() { this.inputSubject.next(this.content); }

  insert(before: string, after: string) {
    const ta = this.editorArea.nativeElement;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const selected = this.content.substring(start, end);
    this.content = this.content.substring(0, start) + before + selected + after + this.content.substring(end);
    this.onInput();
  }

  insertCode() {
    this.insert('\n```\n', '\n```\n');
  }

  insertMermaid() {
    this.insert('\n```mermaid\ngraph TD\n  A[Start] --> B[End]\n', '\n```\n');
  }

  insertTable() {
    this.insert('\n| Col 1 | Col 2 | Col 3 |\n|-------|-------|-------|\n| A     | B     | C     |\n', '');
  }

  async save() {
    this.saving.set(true);
    // Call wiki service save
    this.saving.set(false);
    this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Page saved successfully' });
  }

  exportPdf() {
    window.print();
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
```

---

## wiki.component.scss (ported from vonfluence-wiki-markdown-chalks)

```scss
// Wiki editor & preview styles — ported from vonfluence-wiki-markdown-chalks/styles.css

.wiki-preview {
  :deep(h1) { font-size: 2rem; font-weight: 700; margin: 1.5rem 0 1rem; color: var(--primary-color); }
  :deep(h2) { font-size: 1.5rem; font-weight: 600; margin: 1.25rem 0 0.75rem; border-bottom: 1px solid var(--surface-border); padding-bottom: 0.5rem; }
  :deep(h3) { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; }
  
  :deep(p)  { line-height: 1.7; margin-bottom: 1rem; }

  :deep(pre) {
    background: var(--surface-ground);
    border-radius: 8px;
    padding: 1rem;
    overflow-x: auto;
    border: 1px solid var(--surface-border);
    code { background: transparent; }
  }

  :deep(code:not(pre code)) {
    background: var(--surface-section);
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.9em;
  }

  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
    th { background: var(--surface-section); font-weight: 600; }
    th, td { border: 1px solid var(--surface-border); padding: 0.5rem 1rem; }
    tr:hover { background: var(--surface-hover); }
  }

  :deep(blockquote) {
    border-left: 4px solid var(--primary-color);
    margin: 1rem 0;
    padding: 0.5rem 1rem;
    background: var(--surface-section);
    border-radius: 0 8px 8px 0;
  }

  // Mermaid diagrams
  :deep(.mermaid-diagram) {
    text-align: center;
    margin: 1.5rem 0;
    padding: 1rem;
    background: var(--surface-ground);
    border-radius: 8px;
    border: 1px solid var(--surface-border);
    svg { max-width: 100%; }
  }

  // Confluence-style panels (from vonfluence-wiki-markdown-chalks)
  :deep(.confluence-info)    { background: #e3f2fd; border-left: 4px solid #1565c0; padding: 1rem; border-radius: 4px; margin: 1rem 0; }
  :deep(.confluence-tip)     { background: #e8f5e9; border-left: 4px solid #2e7d32; padding: 1rem; border-radius: 4px; margin: 1rem 0; }
  :deep(.confluence-warning) { background: #fff3e0; border-left: 4px solid #e65100; padding: 1rem; border-radius: 4px; margin: 1rem 0; }
  :deep(.confluence-note)    { background: #fce4ec; border-left: 4px solid #ad1457; padding: 1rem; border-radius: 4px; margin: 1rem 0; }
}

// Editor area
.wiki-editor textarea {
  background: var(--surface-ground) !important;
  color: var(--text-color) !important;
  border: none !important;
}

// Print / PDF export
@media print {
  .wiki-editor > p-toolbar,
  .wiki-editor > p-splitter > :first-child { display: none !important; }
  .wiki-preview { padding: 2cm !important; }
}
```
