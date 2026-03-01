import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TabViewModule } from 'primeng/tabview';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { ProjectService, Project } from '../../core/services/project.service';
import { TaskService } from '../../core/services/task.service';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    TabViewModule,
    CardModule,
    ButtonModule,
    TagModule,
    TableModule,
    ProgressSpinnerModule,
    AvatarModule,
    DividerModule
  ],
  template: `
    <div class="p-4">
      @if (loading()) {
        <div class="flex justify-content-center" style="padding:4rem">
          <p-progressSpinner strokeWidth="4" />
        </div>
      }

      @if (!loading() && project()) {
        <!-- Project Header -->
        <div class="flex align-items-center gap-3 mb-4">
          <div class="proj-icon" [style.background]="project()!.color || 'var(--primary-color)'">
            {{ project()!.icon || project()!.name[0] }}
          </div>
          <div class="flex-1">
            <h2 style="margin:0;color:var(--text-color)">{{ project()!.name }}</h2>
            <span style="color:var(--text-color-secondary);font-size:0.875rem">
              {{ project()!.slug?.toUpperCase() }} · Created {{ project()!.createdAt | date:'MMM d, yyyy' }}
            </span>
          </div>
          <span [class]="'status-' + project()!.status?.toLowerCase()">{{ project()!.status }}</span>
        </div>

        <!-- Tabs -->
        <p-tabView>
          <!-- Overview Tab -->
          <p-tabPanel header="Overview">
            <div class="grid">
              <div class="col-12 md:col-8">
                <p-card header="About">
                  <p style="color:var(--text-color-secondary);line-height:1.7">
                    {{ project()!.description || 'No description provided.' }}
                  </p>
                </p-card>
              </div>
              <div class="col-12 md:col-4">
                <p-card header="Details">
                  <div class="detail-row">
                    <span class="detail-label">Owner</span>
                    <span>{{ project()!.owner?.fullName || '—' }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Status</span>
                    <span [class]="'status-' + project()!.status?.toLowerCase()">{{ project()!.status }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Created</span>
                    <span>{{ project()!.createdAt | date:'MMM d, yyyy' }}</span>
                  </div>
                </p-card>
              </div>
            </div>
          </p-tabPanel>

          <!-- Tasks Tab -->
          <p-tabPanel header="Tasks">
            <div class="flex justify-content-between align-items-center mb-3">
              <span style="color:var(--text-color-secondary)">{{ tasks().length }} tasks</span>
              <p-button label="Go to Board" icon="pi pi-th-large" size="small"
                [routerLink]="['/tasks']" [queryParams]="{projectId: project()!.id}" />
            </div>
            <p-table [value]="tasks()" styleClass="p-datatable-sm" [scrollable]="true" scrollHeight="400px">
              <ng-template pTemplate="header">
                <tr>
                  <th>Title</th>
                  <th style="width:120px">Status</th>
                  <th style="width:100px">Priority</th>
                  <th style="width:120px">Assignee</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-task>
                <tr>
                  <td style="font-size:0.875rem">{{ task.title }}</td>
                  <td><span [class]="'status-' + task.status?.toLowerCase().replace('_','')">{{ task.status?.replace('_',' ') }}</span></td>
                  <td><span [class]="'priority-' + task.priority?.toLowerCase()">{{ task.priority }}</span></td>
                  <td style="font-size:0.85rem">{{ task.assignee?.fullName || '—' }}</td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr><td colspan="4" style="text-align:center;color:var(--text-color-secondary);padding:2rem">No tasks yet</td></tr>
              </ng-template>
            </p-table>
          </p-tabPanel>

          <!-- Members Tab -->
          <p-tabPanel header="Members">
            @if (members().length === 0) {
              <p style="color:var(--text-color-secondary);text-align:center;padding:2rem">No members found.</p>
            }
            <div class="grid">
              @for (m of members(); track m.id) {
                <div class="col-12 md:col-6 lg:col-4">
                  <div class="member-card p-3 border-round flex align-items-center gap-3">
                    <p-avatar [label]="getInitials(m.user?.fullName)" shape="circle" size="large"
                      [style]="{'background-color': 'var(--primary-color)', 'color': '#fff'}" />
                    <div>
                      <div style="font-weight:600;color:var(--text-color)">{{ m.user?.fullName || '—' }}</div>
                      <div style="font-size:0.8rem;color:var(--text-color-secondary)">{{ m.user?.email }}</div>
                      <span class="role-badge">{{ m.role }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          </p-tabPanel>
        </p-tabView>
      }

      @if (!loading() && !project()) {
        <div class="empty-state">
          <i class="pi pi-exclamation-circle"></i>
          <p>Project not found.</p>
          <p-button label="Back to Projects" routerLink="/projects" />
        </div>
      }
    </div>
  `,
  styles: [`
    .proj-icon { width:48px;height:48px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:1.25rem;flex-shrink:0; }
    .detail-row { display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0;border-bottom:1px solid var(--surface-border); }
    .detail-row:last-child { border-bottom:none; }
    .detail-label { color:var(--text-color-secondary);font-size:0.875rem; }
    .member-card { background:var(--surface-section);border:1px solid var(--surface-border); }
    .role-badge { font-size:0.7rem;background:rgba(79,70,229,0.15);color:var(--primary-color);border-radius:4px;padding:2px 6px;font-weight:600; }
    .empty-state { text-align:center;padding:4rem 2rem;color:var(--text-color-secondary); }
    .empty-state i { font-size:3rem;margin-bottom:1rem;display:block; }
  `]
})
export class ProjectDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private projectSvc = inject(ProjectService);
  private taskSvc = inject(TaskService);

  loading = signal(true);
  project = signal<Project | null>(null);
  tasks = signal<any[]>([]);
  members = signal<any[]>([]);

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.projectSvc.getById(id).subscribe({
      next: (p) => {
        this.project.set(p);
        this.loading.set(false);
        this.loadTasks(id);
        this.loadMembers(id);
      },
      error: () => { this.project.set(null); this.loading.set(false); }
    });
  }

  private loadTasks(id: number) {
    this.taskSvc.getTasks(id).subscribe({
      next: (data) => this.tasks.set(Array.isArray(data) ? data : (data as any)?.content ?? []),
      error: () => this.tasks.set([])
    });
  }

  private loadMembers(id: number) {
    this.projectSvc.getMembers(id).subscribe({
      next: (m) => this.members.set(m),
      error: () => this.members.set([])
    });
  }

  getInitials(name?: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
