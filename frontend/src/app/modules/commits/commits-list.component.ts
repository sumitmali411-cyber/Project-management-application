import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Select } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { ApiService } from '../../core/services/api.service';
import { ProjectService, Project } from '../../core/services/project.service';

@Component({
  selector: 'app-commits-list',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    TableModule,
    Select,
    ButtonModule,
    DatePicker,
    InputTextModule,
    InputNumberModule,
    ProgressSpinnerModule,
    ToastModule,
    DialogModule,
    TagModule
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="p-4">

      <!-- Header -->
      <div class="flex align-items-center justify-content-between mb-3">
        <h2 style="margin:0;color:var(--text-color)">Commits</h2>
      </div>

      <!-- GitHub webhook setup banner (shown when no commits yet) -->
      @if (!loading() && selectedProjectId && commits().length === 0) {
        <div class="webhook-tip mb-3 p-3 border-round"
             style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.25)">
          <div class="flex align-items-start gap-3">
            <i class="pi pi-github" style="font-size:1.5rem;color:var(--primary-color);margin-top:2px"></i>
            <div>
              <div style="font-weight:600;color:var(--text-color);margin-bottom:4px">Connect GitHub Repository</div>
              <div style="font-size:0.85rem;color:var(--text-color-secondary);line-height:1.6">
                No commits yet. To auto-import commits:<br>
                1. Go to your GitHub repo → <strong>Settings → Webhooks → Add webhook</strong><br>
                2. Set <strong>Payload URL</strong> to:
                <code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;font-family:monospace">
                  {{ backendUrl }}/api/v1/webhooks/commits
                </code><br>
                3. Set <strong>Content type</strong> to <code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;font-family:monospace">application/json</code><br>
                4. Set a <strong>Secret</strong> and configure <code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;font-family:monospace">GITHUB_WEBHOOK_SECRET</code> env var on the backend<br>
                5. Select <strong>Just the push event</strong>, click <strong>Add webhook</strong><br>
                6. Also paste the repo URL in <strong>Project Settings → Repository URL</strong> so pushes are routed to this project
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Toolbar -->
      <div class="flex gap-2 flex-wrap mb-3 align-items-center">
        <p-select [options]="projects()" optionLabel="name" optionValue="id"
          placeholder="Select Project" [(ngModel)]="selectedProjectId"
          (onChange)="onProjectChange()" style="min-width:200px" />
        <input pInputText placeholder="Filter by branch…" [(ngModel)]="branchFilter"
          (ngModelChange)="applyFilters()" style="width:155px" />
        <input pInputText placeholder="Filter by author…" [(ngModel)]="authorFilter"
          (ngModelChange)="applyFilters()" style="width:155px" />
        <p-datepicker [(ngModel)]="dateFrom" placeholder="From" dateFormat="yy-mm-dd"
          (onSelect)="applyFilters()" [showButtonBar]="true" />
        <p-datepicker [(ngModel)]="dateTo"   placeholder="To"   dateFormat="yy-mm-dd"
          (onSelect)="applyFilters()" [showButtonBar]="true" />
      </div>

      @if (loading()) {
        <div class="flex justify-content-center" style="padding:4rem">
          <p-progressSpinner strokeWidth="4" />
        </div>
      }

      @if (!loading() && !selectedProjectId) {
        <div class="empty-state">
          <i class="pi pi-git-merge"></i>
          <p>Select a project to view commits</p>
        </div>
      }

      @if (!loading() && selectedProjectId) {
        <p-table [value]="filtered()" [paginator]="true" [rows]="20"
          [virtualScroll]="true" [virtualScrollItemSize]="52"
          styleClass="p-datatable-sm" [scrollable]="true" scrollHeight="580px">
          <ng-template pTemplate="header">
            <tr>
              <th style="width:100px">Hash</th>
              <th>Message</th>
              <th style="width:145px">Author</th>
              <th style="width:105px">Date</th>
              <th style="width:110px">Branch</th>
              <th style="width:120px">Linked Task</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-commit>
            <tr>
              <td>
                <span class="commit-hash">{{ commit.commitHash?.slice(0, 7) }}</span>
              </td>
              <td>
                <span style="font-size:0.875rem;color:var(--text-color)" [title]="commit.message">
                  {{ commit.message?.length > 65
                     ? (commit.message | slice:0:65) + '…'
                     : commit.message }}
                </span>
              </td>
              <td style="font-size:0.83rem">{{ commit.authorName }}</td>
              <td style="font-size:0.8rem;color:var(--text-color-secondary)">
                {{ commit.committedAt | date:'MMM d, y' }}
              </td>
              <td>
                <span class="branch-badge">{{ commit.branch || 'main' }}</span>
              </td>
              <td>
                @if (commit.linkedTaskId) {
                  <span class="task-link" [title]="commit.linkedTaskTitle || ''">
                    #{{ commit.linkedTaskId }}
                  </span>
                } @else {
                  <p-button label="Link" icon="pi pi-link" styleClass="p-button-text p-button-sm"
                    (onClick)="openLinkDialog(commit)"
                    [style]="{'font-size':'0.75rem'}" />
                }
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="6" style="text-align:center;padding:3rem;color:var(--text-color-secondary)">
                No commits found
              </td>
            </tr>
          </ng-template>
        </p-table>
      }
    </div>

    <!-- Link Task Dialog -->
    <p-dialog header="Link Commit to Task" [(visible)]="showLinkDialog" [modal]="true"
      [style]="{width:'380px'}" [draggable]="false" (onHide)="cancelLink()">
      <div style="padding:0.5rem 0">
        @if (linkingCommit) {
          <div class="mb-3" style="font-size:0.85rem;color:var(--text-color-secondary)">
            Commit: <span class="commit-hash">{{ linkingCommit.commitHash?.slice(0, 7) }}</span>
            <span style="margin-left:8px">{{ linkingCommit.message | slice:0:50 }}</span>
          </div>
        }
        <label style="display:block;margin-bottom:6px;font-size:0.875rem;color:var(--text-color-secondary)">
          Task ID *
        </label>
        <p-inputNumber [(ngModel)]="linkTaskId" placeholder="e.g. 42"
          [min]="1" [useGrouping]="false" styleClass="w-full" />
        <div style="font-size:0.78rem;color:var(--text-color-secondary);margin-top:6px">
          Enter the numeric task ID to associate with this commit.
          Tip: use <code style="opacity:0.8">#&lt;id&gt;</code> in future commit messages to auto-link on push.
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" (onClick)="cancelLink()" />
        <p-button label="Link Task" icon="pi pi-check" (onClick)="confirmLink()"
          [loading]="linking()" [disabled]="!linkTaskId || linking()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .commit-hash {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.8rem;
      color: #22D3EE;
      background: rgba(34,211,238,0.08);
      border-radius: 4px;
      padding: 2px 6px;
    }
    .branch-badge {
      background: rgba(139,92,246,0.15);
      color: #8B5CF6;
      border-radius: 4px;
      padding: 2px 8px;
      font-size: 0.75rem;
      font-family: 'IBM Plex Mono', monospace;
    }
    .task-link {
      background: rgba(79,70,229,0.15);
      color: var(--primary-color);
      border-radius: 4px;
      padding: 2px 8px;
      font-size: 0.8rem;
      cursor: pointer;
      font-family: 'IBM Plex Mono', monospace;
    }
    .empty-state { text-align: center; padding: 4rem 2rem; color: var(--text-color-secondary); }
    .empty-state i { font-size: 3rem; margin-bottom: 1rem; display: block; }
  `]
})
export class CommitsListComponent implements OnInit {
  private api = inject(ApiService);
  private projectSvc = inject(ProjectService);
  private toast = inject(MessageService);

  readonly backendUrl = 'http://localhost:9090';

  loading  = signal(false);
  linking  = signal(false);
  projects = signal<Project[]>([]);
  commits  = signal<any[]>([]);
  filtered = signal<any[]>([]);

  selectedProjectId: number | null = null;
  branchFilter = '';
  authorFilter = '';
  dateFrom: Date | null = null;
  dateTo:   Date | null = null;

  showLinkDialog = false;
  linkingCommit: any = null;
  linkTaskId: number | null = null;

  ngOnInit() {
    this.projectSvc.getAll().subscribe({
      next: (data) => this.projects.set(Array.isArray(data) ? data : (data as any)?.content ?? []),
      error: () => this.projects.set([])
    });
  }

  onProjectChange() {
    if (!this.selectedProjectId) return;
    this.loading.set(true);
    this.api.get<any[]>(`/projects/${this.selectedProjectId}/commits`).subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : (data as any)?.content ?? [];
        this.commits.set(list);
        this.applyFilters();
        this.loading.set(false);
      },
      error: () => { this.commits.set([]); this.filtered.set([]); this.loading.set(false); }
    });
  }

  applyFilters() {
    let result = this.commits();
    if (this.branchFilter) {
      result = result.filter(c => c.branch?.toLowerCase().includes(this.branchFilter.toLowerCase()));
    }
    if (this.authorFilter) {
      result = result.filter(c => c.authorName?.toLowerCase().includes(this.authorFilter.toLowerCase()));
    }
    if (this.dateFrom) {
      result = result.filter(c => c.committedAt && new Date(c.committedAt) >= this.dateFrom!);
    }
    if (this.dateTo) {
      result = result.filter(c => c.committedAt && new Date(c.committedAt) <= this.dateTo!);
    }
    this.filtered.set(result);
  }

  openLinkDialog(commit: any) {
    this.linkingCommit = commit;
    this.linkTaskId = null;
    this.showLinkDialog = true;
  }

  cancelLink() {
    this.showLinkDialog = false;
    this.linkingCommit = null;
    this.linkTaskId = null;
  }

  confirmLink() {
    if (!this.linkingCommit || !this.linkTaskId) return;
    this.linking.set(true);
    this.api.patch<any>(`/commits/${this.linkingCommit.id}/link`, { taskId: this.linkTaskId }).subscribe({
      next: (updated) => {
        // Patch the commit in local state so UI updates without a full reload
        this.commits.update(list =>
          list.map(c => c.id === updated.id ? { ...c, ...updated } : c)
        );
        this.applyFilters();
        this.toast.add({ severity: 'success', summary: 'Linked',
          detail: `Commit linked to task #${this.linkTaskId}` });
        this.cancelLink();
        this.linking.set(false);
      },
      error: (err) => {
        this.toast.add({ severity: 'error', summary: 'Error',
          detail: err?.error?.message || 'Could not link commit' });
        this.linking.set(false);
      }
    });
  }
}
