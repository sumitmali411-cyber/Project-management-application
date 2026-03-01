import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TimelineModule } from 'primeng/timeline';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { DashboardService, DashboardStats, ActivityItem } from './dashboard.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    CardModule,
    TableModule,
    TimelineModule,
    ProgressSpinnerModule,
    TagModule,
    DividerModule
  ],
  template: `
    <div class="dashboard-page p-4">
      <!-- Header -->
      <div class="flex align-items-center justify-content-between mb-4">
        <div>
          <h2 style="margin:0;color:var(--text-color)">
            Welcome back, {{ auth.currentUser()?.fullName?.split(' ')?.at(0) || 'Developer' }}
          </h2>
          <p style="margin:0.25rem 0 0;color:var(--text-color-secondary)">Here's what's happening today</p>
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-content-center align-items-center" style="height:200px">
          <p-progressSpinner strokeWidth="4" />
        </div>
      }

      @if (!loading()) {
        <!-- Stat Cards -->
        <div class="grid mb-4">
          @for (card of statCards(); track card.label) {
            <div class="col-12 sm:col-6 lg:col-3">
              <div class="stat-card p-3 border-round">
                <div class="flex align-items-center gap-3">
                  <div class="stat-icon" [style.background]="card.iconBg">
                    <i [class]="card.icon" [style.color]="card.color"></i>
                  </div>
                  <div>
                    <div class="stat-value">{{ card.value }}</div>
                    <div class="stat-label">{{ card.label }}</div>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        <div class="grid">
          <!-- Recent Activity -->
          <div class="col-12 lg:col-5">
            <p-card header="Recent Activity" styleClass="h-full">
              @if (activity().length === 0) {
                <p style="color:var(--text-color-secondary);text-align:center;padding:2rem 0">
                  No recent activity
                </p>
              }
              <p-timeline [value]="activity()" styleClass="compact-timeline">
                <ng-template pTemplate="content" let-item>
                  <div class="activity-item">
                    <span style="color:var(--text-color);font-size:0.875rem">{{ item.message }}</span>
                    <span style="color:var(--text-color-secondary);font-size:0.75rem;display:block">
                      {{ item.user }} · {{ item.timestamp | date:'shortTime' }}
                    </span>
                  </div>
                </ng-template>
              </p-timeline>
            </p-card>
          </div>

          <!-- My Open Tasks -->
          <div class="col-12 lg:col-7">
            <p-card header="My Open Tasks" styleClass="h-full">
              @if (myTasks().length === 0) {
                <div class="flex flex-column align-items-center" style="padding:2rem 0">
                  <i class="pi pi-check-circle" style="font-size:2.5rem;color:var(--status-done);margin-bottom:0.75rem"></i>
                  <p style="color:var(--text-color-secondary);margin:0">All caught up! No open tasks.</p>
                </div>
              }
              @if (myTasks().length > 0) {
                <p-table [value]="myTasks()" [paginator]="myTasks().length > 8" [rows]="8"
                  styleClass="p-datatable-sm" [scrollable]="true" scrollHeight="320px">
                  <ng-template pTemplate="header">
                    <tr>
                      <th>Task</th>
                      <th style="width:110px">Status</th>
                      <th style="width:90px">Priority</th>
                      <th style="width:100px">Due</th>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-task>
                    <tr>
                      <td style="font-size:0.875rem">{{ task.title }}</td>
                      <td>
                        <span [class]="'status-' + task.status?.toLowerCase().replace('_','')">
                          {{ task.status?.replace('_',' ') }}
                        </span>
                      </td>
                      <td>
                        <span [class]="'priority-' + task.priority?.toLowerCase()">
                          <i class="pi pi-circle-fill" style="font-size:0.6rem;margin-right:4px"></i>
                          {{ task.priority }}
                        </span>
                      </td>
                      <td style="font-size:0.8rem;color:var(--text-color-secondary)">
                        {{ task.dueDate ? (task.dueDate | date:'MMM d') : '—' }}
                      </td>
                    </tr>
                  </ng-template>
                </p-table>
              }
            </p-card>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .stat-card {
      background: var(--surface-section);
      border: 1px solid var(--surface-border);
      transition: border-color 0.2s;
    }
    .stat-card:hover { border-color: var(--primary-color); }
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      flex-shrink: 0;
    }
    .stat-value { font-size: 1.75rem; font-weight: 700; color: var(--text-color); line-height: 1; }
    .stat-label { font-size: 0.8rem; color: var(--text-color-secondary); margin-top: 2px; }
    .activity-item { padding: 0.25rem 0; }
    ::ng-deep .compact-timeline .p-timeline-event-connector { background: var(--surface-border); }
  `]
})
export class DashboardComponent implements OnInit {
  private svc = inject(DashboardService);
  auth = inject(AuthService);

  loading = signal(true);
  stats = signal<DashboardStats | null>(null);
  activity = signal<ActivityItem[]>([]);
  myTasks = signal<any[]>([]);

  statCards = () => {
    const s = this.stats();
    return [
      { label: 'Open Tasks', value: s?.openTasks ?? 0, icon: 'pi pi-list-check', color: '#3B82F6', iconBg: 'rgba(59,130,246,0.15)' },
      { label: 'Closed Today', value: s?.closedToday ?? 0, icon: 'pi pi-check-circle', color: '#10B981', iconBg: 'rgba(16,185,129,0.15)' },
      { label: 'Active Sprints', value: s?.activeSprints ?? 0, icon: 'pi pi-bolt', color: '#F59E0B', iconBg: 'rgba(245,158,11,0.15)' },
      { label: 'Team Members', value: s?.teamMembers ?? 0, icon: 'pi pi-users', color: '#8B5CF6', iconBg: 'rgba(139,92,246,0.15)' }
    ];
  };

  ngOnInit() {
    this.svc.getStats().subscribe({
      next: (s) => this.stats.set(s),
      error: () => this.stats.set({ openTasks: 0, closedToday: 0, activeSprints: 0, teamMembers: 0 })
    });

    this.svc.getActivity().subscribe({
      next: (a) => this.activity.set(a),
      error: () => this.activity.set([])
    });

    this.svc.getMyTasks().subscribe({
      next: (t) => { this.myTasks.set(t); this.loading.set(false); },
      error: () => { this.myTasks.set([]); this.loading.set(false); }
    });
  }
}
