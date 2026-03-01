# 07 — Dashboard Module (PrimeNG + Charts)

## Prompt for AI Code Generation

```
Generate Angular 17 Dashboard module for DevSync using PrimeNG components.

DESIGN INSPIRATION: https://task-commit-hub--sumitmali411.replit.app (DevSync Unified Tracker)

COMPONENTS:
1. DashboardComponent — main layout with PrimeNG Grid
2. StatsCardComponent — 4 stat cards (Open Tasks, Closed Today, Active Sprints, Team Members)
3. BurndownChartComponent — PrimeNG Chart.js line chart
4. VelocityChartComponent — PrimeNG Chart.js bar chart
5. RecentActivityComponent — PrimeNG Timeline component
6. MyTasksWidget — PrimeNG DataView with task cards

STAT CARDS DESIGN:
- Use PrimeNG Card with colorful left-border accent
- Show trend indicator (up/down arrow with % change)
- Icons from PrimeIcons
- Colors: tasks=blue, done=green, sprints=purple, members=orange

CHARTS:
- Burndown: days on X-axis, remaining story points on Y-axis, dual line (ideal vs actual)
- Velocity: sprints on X-axis, story points completed on Y-axis, bar chart

DATA: Fetch from GET /api/v1/dashboard/stats and GET /api/v1/dashboard/burndown
```

---

## dashboard.component.ts

```typescript
import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TimelineModule } from 'primeng/timeline';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { SkeletonModule } from 'primeng/skeleton';
import { DashboardService } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CardModule, ChartModule, TimelineModule, TagModule, AvatarModule, SkeletonModule],
  template: `
    <div class="dashboard p-3">
      <h2 class="text-2xl font-bold mb-4">Dashboard</h2>

      <!-- Stats Cards Row -->
      <div class="grid mb-4">
        @for (card of statsCards(); track card.label) {
          <div class="col-12 md:col-6 lg:col-3">
            <p-card styleClass="h-full border-left-3" [style]="{'border-left-color': card.color}">
              <div class="flex justify-content-between align-items-start">
                <div>
                  <div class="text-500 font-medium mb-2">{{ card.label }}</div>
                  @if (loading()) {
                    <p-skeleton width="5rem" height="2rem" />
                  } @else {
                    <div class="text-4xl font-bold text-900">{{ card.value }}</div>
                  }
                  <div class="flex align-items-center mt-2">
                    <i [class]="card.trend > 0 ? 'pi pi-arrow-up text-green-500' : 'pi pi-arrow-down text-red-500'"></i>
                    <span class="ml-1 text-sm text-500">{{ card.trend }}% vs last week</span>
                  </div>
                </div>
                <div class="border-circle p-3" [style]="{'background': card.color + '20'}">
                  <i [class]="card.icon + ' text-2xl'" [style]="{'color': card.color}"></i>
                </div>
              </div>
            </p-card>
          </div>
        }
      </div>

      <!-- Charts Row -->
      <div class="grid mb-4">
        <div class="col-12 lg:col-8">
          <p-card header="Sprint Burndown">
            <p-chart type="line" [data]="burndownData()" [options]="chartOptions" height="280px" />
          </p-card>
        </div>
        <div class="col-12 lg:col-4">
          <p-card header="Team Velocity">
            <p-chart type="bar" [data]="velocityData()" [options]="chartOptions" height="280px" />
          </p-card>
        </div>
      </div>

      <!-- Activity Timeline -->
      <div class="grid">
        <div class="col-12 lg:col-6">
          <p-card header="Recent Activity">
            <p-timeline [value]="activities()" styleClass="mt-2">
              <ng-template pTemplate="content" let-event>
                <div class="flex align-items-center gap-2">
                  <p-avatar [label]="event.user.charAt(0)" shape="circle" size="small" />
                  <div>
                    <span class="text-900 font-medium">{{ event.user }}</span>
                    <span class="text-500 text-sm ml-1">{{ event.action }}</span>
                    <div class="text-400 text-xs">{{ event.time }}</div>
                  </div>
                </div>
              </ng-template>
            </p-timeline>
          </p-card>
        </div>
        <div class="col-12 lg:col-6">
          <p-card header="My Open Tasks">
            <!-- MyTasksWidget embedded here -->
          </p-card>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private svc = inject(DashboardService);

  loading = signal(true);
  statsCards = signal([
    { label: 'Open Tasks',     value: 0,  icon: 'pi pi-check-square', color: '#4F46E5', trend: 12 },
    { label: 'Closed Today',   value: 0,  icon: 'pi pi-check',        color: '#10B981', trend: 5  },
    { label: 'Active Sprints', value: 0,  icon: 'pi pi-bolt',         color: '#8B5CF6', trend: 0  },
    { label: 'Team Members',   value: 0,  icon: 'pi pi-users',        color: '#F59E0B', trend: 2  }
  ]);

  burndownData  = signal<any>({ labels: [], datasets: [] });
  velocityData  = signal<any>({ labels: [], datasets: [] });
  activities    = signal<any[]>([]);

  chartOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: '#ccc' } } },
    scales: {
      x: { ticks: { color: '#999' }, grid: { color: '#333' } },
      y: { ticks: { color: '#999' }, grid: { color: '#333' } }
    }
  };

  ngOnInit() {
    this.svc.getStats().subscribe(stats => {
      // update statsCards with real data
      this.loading.set(false);
    });
  }
}
```

---

# 08 — Task Management (Kanban Board)

## Prompt for AI Code Generation

```
Generate Angular 17 Kanban Board using PrimeNG for DevSync task management.

REQUIREMENTS:
- Use PrimeNG DragDrop (cdkDragDrop) for column-to-column card movement
- Columns: BACKLOG | TODO | IN_PROGRESS | IN_REVIEW | DONE
- Each column: header with count badge, scrollable card list, "Add task" button
- Task Card: title, priority badge, assignee avatar, due date, story points, tag chips
- Toolbar: filter by assignee/priority/sprint, toggle List view / Kanban view

PRIORITY COLORS (PrimeNG severity):
- CRITICAL: danger, HIGH: warning, MEDIUM: info, LOW: success, NONE: secondary

API: GET /api/v1/projects/{pid}/tasks/kanban
PATCH status: PATCH /api/v1/projects/{pid}/tasks/{tid}/status

DIALOGS:
- Create Task: p-dialog with full form (title, type, priority, assignee, sprint, description editor)
- Task Detail: p-sidebar (right panel) with full task view including comments
```

---

## kanban-board.component.ts (Structure)

```typescript
import { Component, Input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { ChipModule } from 'primeng/chip';
import { DialogModule } from 'primeng/dialog';
import { SidebarModule } from 'primeng/sidebar';
import { TaskService } from '../services/task.service';

export interface KanbanTask {
  id: number; title: string; priority: string; status: string;
  assignee?: { fullName: string; avatarUrl?: string };
  dueDate?: string; storyPoints?: number; tags: string[];
  taskType: string;
}

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [
    CommonModule, DragDropModule, ButtonModule, BadgeModule,
    TagModule, AvatarModule, ChipModule, DialogModule, SidebarModule
  ],
  template: `
    <div class="kanban-board flex gap-3 overflow-x-auto pb-4" style="min-height: 600px;">
      @for (column of columns; track column.status) {
        <div class="kanban-column flex-shrink-0"
             style="width: 280px; background: var(--surface-section); border-radius: 12px; padding: 1rem;">

          <!-- Column Header -->
          <div class="flex align-items-center justify-content-between mb-3">
            <div class="flex align-items-center gap-2">
              <div class="border-circle w-3 h-3" [style.background]="column.color"></div>
              <span class="font-semibold text-900">{{ column.label }}</span>
              <p-badge [value]="getColumnTasks(column.status).length.toString()" severity="secondary" />
            </div>
            <p-button icon="pi pi-plus" styleClass="p-button-text p-button-sm p-button-rounded"
                      (onClick)="openCreateDialog(column.status)" />
          </div>

          <!-- Drop Zone -->
          <div cdkDropList
               [id]="column.status"
               [cdkDropListData]="getColumnTasks(column.status)"
               [cdkDropListConnectedTo]="columnIds"
               (cdkDropListDropped)="onDrop($event)"
               class="kanban-drop-zone min-h-20">

            @for (task of getColumnTasks(column.status); track task.id) {
              <div cdkDrag
                   class="kanban-card mb-2 p-3 border-round-lg cursor-pointer bg-surface-overlay
                          border-1 surface-border hover:border-primary-300 transition-all"
                   (click)="openTaskDetail(task)">

                <!-- Task Type + Priority -->
                <div class="flex justify-content-between align-items-center mb-2">
                  <p-tag [value]="task.taskType" severity="secondary" styleClass="text-xs" />
                  <p-tag [value]="task.priority"
                         [severity]="getPrioritySeverity(task.priority)"
                         styleClass="text-xs" />
                </div>

                <!-- Title -->
                <div class="text-900 font-medium text-sm mb-2 line-clamp-2">{{ task.title }}</div>

                <!-- Tags -->
                @if (task.tags?.length) {
                  <div class="flex flex-wrap gap-1 mb-2">
                    @for (tag of task.tags.slice(0, 3); track tag) {
                      <p-chip [label]="tag" styleClass="text-xs" />
                    }
                  </div>
                }

                <!-- Footer -->
                <div class="flex justify-content-between align-items-center mt-2">
                  @if (task.assignee) {
                    <p-avatar
                      [label]="task.assignee.fullName.charAt(0)"
                      shape="circle" size="small"
                      [image]="task.assignee.avatarUrl"
                    />
                  } @else {
                    <span></span>
                  }
                  <div class="flex align-items-center gap-2 text-500 text-xs">
                    @if (task.storyPoints) {
                      <span><i class="pi pi-star-fill mr-1"></i>{{ task.storyPoints }}</span>
                    }
                    @if (task.dueDate) {
                      <span [class]="isOverdue(task.dueDate) ? 'text-red-400' : ''">
                        <i class="pi pi-calendar mr-1"></i>{{ task.dueDate | date:'MMM d' }}
                      </span>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class KanbanBoardComponent {
  @Input() projectId!: number;
  private taskSvc = inject(TaskService);

  tasks = signal<KanbanTask[]>([]);

  columns = [
    { status: 'BACKLOG',     label: 'Backlog',     color: '#6B7280' },
    { status: 'TODO',        label: 'To Do',       color: '#3B82F6' },
    { status: 'IN_PROGRESS', label: 'In Progress', color: '#F59E0B' },
    { status: 'IN_REVIEW',   label: 'In Review',   color: '#8B5CF6' },
    { status: 'DONE',        label: 'Done',        color: '#10B981' }
  ];

  columnIds = this.columns.map(c => c.status);

  getColumnTasks(status: string) {
    return this.tasks().filter(t => t.status === status);
  }

  getPrioritySeverity(priority: string): any {
    const map: any = { CRITICAL: 'danger', HIGH: 'warning', MEDIUM: 'info', LOW: 'success', NONE: 'secondary' };
    return map[priority] || 'secondary';
  }

  isOverdue(dueDate: string) {
    return new Date(dueDate) < new Date();
  }

  onDrop(event: CdkDragDrop<KanbanTask[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data,
                        event.previousIndex, event.currentIndex);
      const task = event.container.data[event.currentIndex];
      const newStatus = event.container.id;
      this.taskSvc.updateStatus(this.projectId, task.id, newStatus).subscribe();
    }
  }

  openCreateDialog(status: string) { /* open p-dialog */ }
  openTaskDetail(task: KanbanTask) { /* open p-sidebar */ }
}
```

---

# 10 — Git Commit Tracker Module

## Prompt for AI Code Generation

```
Generate Angular 17 Git Commit Tracker module for DevSync inspired by 
task-commit-hub--sumitmali411.replit.app design.

FEATURES:
1. CommitsListComponent — paginated table/timeline of commits with filters
   - Filter by branch, date range, author, linked/unlinked tasks
   - Each row: commit hash (7 chars), message (truncated), author, date, branch badge, 
     linked task (or "Link" button if unlinked)
   - PrimeNG DataTable with virtual scrolling

2. CommitDetailComponent — panel showing full commit info + diff summary
   
3. LinkTaskDialogComponent — p-dialog to search and link a commit to a task

4. WebhookSetupComponent — instructions page + API endpoint display for 
   GitHub/GitLab webhook configuration

WEBHOOK ENDPOINT: POST /api/v1/webhooks/commits
Auto-links commits with messages matching: 
  - "fixes #123", "closes #123", "resolves TASK-123"

API ENDPOINTS:
  GET  /api/v1/projects/{pid}/commits?page=0&branch=&author=&linked=
  PATCH /api/v1/commits/{id}/link { taskId }
```

---

## commits-list.component.ts

```typescript
import { Component, Input, OnInit, signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { CommitService } from '../services/commit.service';

@Component({
  selector: 'app-commits-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, TagModule,
    InputTextModule, DropdownModule, TooltipModule, DialogModule, DatePipe
  ],
  template: `
    <p-table
      [value]="commits()"
      [lazy]="true"
      [paginator]="true"
      [rows]="20"
      [totalRecords]="totalRecords()"
      (onLazyLoad)="loadCommits($event)"
      styleClass="p-datatable-sm p-datatable-striped"
      [loading]="loading()"
    >
      <ng-template pTemplate="caption">
        <div class="flex align-items-center gap-2">
          <input pInputText [(ngModel)]="filters.author" placeholder="Author..." 
                 (input)="onFilterChange()" class="p-inputtext-sm" />
          <p-dropdown [options]="branches()" [(ngModel)]="filters.branch" 
                      placeholder="Branch" (onChange)="onFilterChange()"
                      styleClass="p-inputtext-sm" />
          <p-button label="Webhook Setup" icon="pi pi-link" styleClass="p-button-outlined ml-auto"
                    (onClick)="showWebhookSetup = true" />
        </div>
      </ng-template>

      <ng-template pTemplate="header">
        <tr>
          <th>Hash</th>
          <th>Message</th>
          <th>Author</th>
          <th>Branch</th>
          <th>Date</th>
          <th>Linked Task</th>
          <th></th>
        </tr>
      </ng-template>

      <ng-template pTemplate="body" let-commit>
        <tr>
          <td>
            <code class="text-primary font-mono text-sm">{{ commit.commitHash.substring(0, 7) }}</code>
          </td>
          <td class="max-w-xs">
            <span class="text-900 text-sm" [pTooltip]="commit.message">
              {{ commit.message | slice:0:60 }}{{ commit.message.length > 60 ? '...' : '' }}
            </span>
          </td>
          <td>
            <div class="flex align-items-center gap-2">
              <div class="border-circle bg-primary text-white flex align-items-center justify-content-center"
                   style="width: 28px; height: 28px; font-size: 12px;">
                {{ commit.authorName.charAt(0) }}
              </div>
              <span class="text-sm">{{ commit.authorName }}</span>
            </div>
          </td>
          <td>
            <p-tag [value]="commit.branch" severity="info" styleClass="text-xs font-mono" />
          </td>
          <td class="text-500 text-sm">{{ commit.committedAt | date:'MMM d, HH:mm' }}</td>
          <td>
            @if (commit.linkedTask) {
              <p-tag [value]="'#' + commit.linkedTask.id + ' ' + commit.linkedTask.title"
                     severity="success" styleClass="text-xs max-w-xs" />
            } @else {
              <p-button label="Link Task" icon="pi pi-link"
                        styleClass="p-button-text p-button-sm p-button-warning"
                        (onClick)="openLinkDialog(commit)" />
            }
          </td>
          <td>
            <p-button icon="pi pi-external-link" styleClass="p-button-text p-button-sm"
                      [pTooltip]="'Open in ' + (commit.repoUrl?.includes('github') ? 'GitHub' : 'GitLab')"
                      (onClick)="openCommit(commit)" />
          </td>
        </tr>
      </ng-template>
    </p-table>

    <!-- Webhook Setup Dialog -->
    <p-dialog header="Configure Git Webhook" [(visible)]="showWebhookSetup"
              [modal]="true" [style]="{width: '600px'}">
      <div class="p-3">
        <p class="mb-3">Add this webhook URL to your GitHub or GitLab repository to automatically 
        sync commits with DevSync tasks.</p>
        
        <div class="p-3 surface-ground border-round font-mono text-sm mb-3">
          POST {{ webhookUrl }}
        </div>

        <h4 class="mb-2">Auto-link commit messages:</h4>
        <ul class="text-sm text-500">
          <li>fixes #123</li>
          <li>closes #456</li>
          <li>resolves TASK-789</li>
        </ul>

        <h4 class="mb-2 mt-3">GitHub Setup:</h4>
        <ol class="text-sm text-500">
          <li>Go to Repository → Settings → Webhooks → Add webhook</li>
          <li>Payload URL: paste the webhook URL above</li>
          <li>Content type: application/json</li>
          <li>Events: Just the push event</li>
          <li>Secret: (optional, contact admin for shared secret)</li>
        </ol>
      </div>
    </p-dialog>
  `
})
export class CommitsListComponent implements OnInit {
  @Input() projectId!: number;
  private commitSvc = inject(CommitService);

  commits       = signal<any[]>([]);
  totalRecords  = signal(0);
  loading       = signal(false);
  branches      = signal<any[]>([{ label: 'All', value: null }]);
  showWebhookSetup = false;
  filters       = { author: '', branch: null };
  webhookUrl    = `${window.location.origin}/api/v1/webhooks/commits`;

  ngOnInit() { this.loadCommits({ first: 0, rows: 20 }); }

  loadCommits(event: any) {
    this.loading.set(true);
    const page = event.first / event.rows;
    this.commitSvc.getByProject(this.projectId, page, event.rows, this.filters).subscribe(res => {
      this.commits.set(res.data.content);
      this.totalRecords.set(res.data.totalElements);
      this.loading.set(false);
    });
  }

  onFilterChange() { this.loadCommits({ first: 0, rows: 20 }); }
  openCommit(commit: any) { window.open(commit.repoUrl, '_blank'); }
  openLinkDialog(commit: any) { /* open link dialog */ }
}
```
