import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TaskFormComponent } from './task-form.component';
import { TaskService, Task } from '../../core/services/task.service';
import { ProjectService, Project } from '../../core/services/project.service';

interface KanbanColumn {
  id: string;
  label: string;
  statusClass: string;
  tasks: Task[];
}

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    DropdownModule,
    ButtonModule,
    ProgressSpinnerModule,
    ToastModule,
    TaskFormComponent
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="kanban-page p-4">
      <!-- Toolbar -->
      <div class="flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <h2 style="margin:0;color:var(--text-color)">Kanban Board</h2>
        <div class="flex gap-2 align-items-center flex-wrap">
          <p-dropdown [options]="projects()" optionLabel="name" optionValue="id"
            placeholder="Select Project" [(ngModel)]="selectedProjectId"
            (onChange)="onProjectChange()" styleClass="project-select" />
          <p-button label="New Task" icon="pi pi-plus" (onClick)="showTaskForm = true"
            [disabled]="!selectedProjectId" />
        </div>
      </div>

      @if (loading()) {
        <div class="flex justify-content-center" style="padding:4rem">
          <p-progressSpinner strokeWidth="4" />
        </div>
      }

      @if (!loading() && !selectedProjectId) {
        <div class="empty-state">
          <i class="pi pi-th-large"></i>
          <p>Select a project to view the kanban board</p>
        </div>
      }

      @if (!loading() && selectedProjectId) {
        <!-- Board -->
        <div class="kanban-board" cdkDropListGroup>
          @for (col of columns(); track col.id) {
            <div class="kanban-column">
              <div class="col-header">
                <span class="col-title">{{ col.label }}</span>
                <span class="col-count">{{ col.tasks.length }}</span>
              </div>

              <div class="col-body" cdkDropList
                [cdkDropListData]="col.tasks"
                [id]="col.id"
                (cdkDropListDropped)="onDrop($event, col.id)">

                @for (task of col.tasks; track task.id) {
                  <div class="kanban-card p-3 border-round" cdkDrag>
                    <div class="flex align-items-start justify-content-between gap-2 mb-2">
                      <span class="task-title">{{ task.title }}</span>
                      <span class="task-type-badge">{{ task.taskType }}</span>
                    </div>
                    <div class="flex align-items-center justify-content-between mt-2">
                      <span [class]="'priority-' + task.priority?.toLowerCase()" style="font-size:0.75rem">
                        <i class="pi pi-circle-fill" style="font-size:0.5rem;margin-right:3px"></i>
                        {{ task.priority }}
                      </span>
                      @if (task.assignee) {
                        <div class="assignee-avatar" [title]="task.assignee.fullName">
                          {{ getInitials(task.assignee.fullName) }}
                        </div>
                      }
                    </div>
                    @if (task.dueDate) {
                      <div style="font-size:0.72rem;color:var(--text-color-secondary);margin-top:6px">
                        <i class="pi pi-calendar" style="margin-right:3px"></i>{{ task.dueDate }}
                      </div>
                    }
                  </div>
                }

                @if (col.tasks.length === 0) {
                  <div class="empty-col">Drop tasks here</div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>

    <app-task-form
      [(visible)]="showTaskForm"
      [projectId]="selectedProjectId!"
      (taskCreated)="onTaskCreated($event)" />
  `,
  styles: [`
    .kanban-board {
      display: flex;
      gap: 1rem;
      overflow-x: auto;
      padding-bottom: 1rem;
      min-height: calc(100vh - 200px);
    }
    .kanban-column {
      flex: 0 0 280px;
      min-width: 280px;
      display: flex;
      flex-direction: column;
    }
    .col-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: var(--surface-section);
      border: 1px solid var(--surface-border);
      border-radius: 8px 8px 0 0;
      border-bottom: none;
    }
    .col-title { font-weight: 600; font-size: 0.875rem; color: var(--text-color); text-transform: uppercase; letter-spacing: 0.5px; }
    .col-count { background: var(--surface-overlay); color: var(--text-color-secondary); border-radius: 12px; padding: 2px 8px; font-size: 0.75rem; }
    .col-body {
      flex: 1;
      background: rgba(255,255,255,0.02);
      border: 1px solid var(--surface-border);
      border-radius: 0 0 8px 8px;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-height: 200px;
    }
    .kanban-card {
      background: var(--surface-section);
      border: 1px solid var(--surface-border);
      cursor: grab;
      transition: all 0.15s ease;
    }
    .kanban-card:active { cursor: grabbing; }
    .kanban-card:hover { border-color: var(--primary-color); box-shadow: 0 4px 12px rgba(79,70,229,0.15); }
    .task-title { font-size: 0.875rem; color: var(--text-color); line-height: 1.4; flex: 1; }
    .task-type-badge { font-size: 0.65rem; background: rgba(79,70,229,0.15); color: var(--primary-color); border-radius: 3px; padding: 1px 5px; white-space: nowrap; flex-shrink: 0; }
    .assignee-avatar { width: 24px; height: 24px; border-radius: 50%; background: var(--primary-color); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700; }
    .empty-col { text-align: center; padding: 1.5rem; color: var(--text-color-secondary); font-size: 0.8rem; border: 2px dashed var(--surface-border); border-radius: 6px; }
    .empty-state { text-align: center; padding: 4rem 2rem; color: var(--text-color-secondary); }
    .empty-state i { font-size: 3rem; margin-bottom: 1rem; display: block; }
    ::ng-deep .project-select .p-dropdown { min-width: 200px; }
    .cdk-drag-placeholder { opacity: 0.3; }
    .cdk-drag-animating { transition: transform 250ms cubic-bezier(0,0,0.2,1); }
  `]
})
export class KanbanBoardComponent implements OnInit {
  private taskSvc = inject(TaskService);
  private projectSvc = inject(ProjectService);
  private route = inject(ActivatedRoute);
  private toast = inject(MessageService);

  loading = signal(false);
  projects = signal<Project[]>([]);
  columns = signal<KanbanColumn[]>([]);
  selectedProjectId: number | null = null;
  showTaskForm = false;

  private readonly STATUSES = [
    { id: 'BACKLOG', label: 'Backlog', statusClass: 'status-backlog' },
    { id: 'TODO', label: 'To Do', statusClass: 'status-todo' },
    { id: 'IN_PROGRESS', label: 'In Progress', statusClass: 'status-inprogress' },
    { id: 'IN_REVIEW', label: 'In Review', statusClass: 'status-inreview' },
    { id: 'DONE', label: 'Done', statusClass: 'status-done' }
  ];

  ngOnInit() {
    this.projectSvc.getAll().subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : (data as any)?.content ?? [];
        this.projects.set(list);
        const qpId = this.route.snapshot.queryParamMap.get('projectId');
        if (qpId && list.length) {
          this.selectedProjectId = Number(qpId);
          this.loadKanban();
        }
      },
      error: () => this.projects.set([])
    });
  }

  onProjectChange() {
    if (this.selectedProjectId) this.loadKanban();
  }

  private loadKanban() {
    if (!this.selectedProjectId) return;
    this.loading.set(true);
    this.taskSvc.getKanban(this.selectedProjectId).subscribe({
      next: (data) => {
        const tasksByStatus = data as Record<string, Task[]> || {};
        this.columns.set(this.STATUSES.map(s => ({
          ...s,
          tasks: tasksByStatus[s.id] || []
        })));
        this.loading.set(false);
      },
      error: () => {
        this.columns.set(this.STATUSES.map(s => ({ ...s, tasks: [] })));
        this.loading.set(false);
      }
    });
  }

  onDrop(event: CdkDragDrop<Task[]>, targetColId: string) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
      const task = event.container.data[event.currentIndex];
      this.taskSvc.updateStatus(this.selectedProjectId!, task.id, targetColId).subscribe({
        error: () => {
          transferArrayItem(event.container.data, event.previousContainer.data, event.currentIndex, event.previousIndex);
          this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update status' });
        }
      });
    }
  }

  onTaskCreated(task: Task) {
    this.columns.update(cols => cols.map(c => c.id === 'BACKLOG' ? { ...c, tasks: [task, ...c.tasks] } : c));
    this.toast.add({ severity: 'success', summary: 'Task created', detail: task.title });
  }

  getInitials(name?: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
