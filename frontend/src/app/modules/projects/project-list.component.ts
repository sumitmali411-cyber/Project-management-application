import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { DataViewModule } from 'primeng/dataview';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProjectService, Project } from '../../core/services/project.service';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    CardModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    DataViewModule,
    TagModule,
    ProgressSpinnerModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="p-4">
      <!-- Header Toolbar -->
      <div class="flex align-items-center justify-content-between mb-4">
        <div>
          <h2 style="margin:0;color:var(--text-color)">Projects</h2>
          <p style="margin:0.25rem 0 0;color:var(--text-color-secondary)">{{ projects().length }} projects</p>
        </div>
        <div class="flex gap-2 align-items-center">
          <span class="p-input-icon-left">
            <i class="pi pi-search"></i>
            <input pInputText type="text" placeholder="Search projects…"
              (input)="filterProjects($event)" style="width:220px" />
          </span>
          <p-button label="New Project" icon="pi pi-plus" (onClick)="showDialog = true" />
        </div>
      </div>

      @if (loading()) {
        <div class="flex justify-content-center" style="padding:4rem">
          <p-progressSpinner strokeWidth="4" />
        </div>
      }

      @if (!loading()) {
        @if (filtered().length === 0) {
          <div class="empty-state">
            <i class="pi pi-folder-open"></i>
            <p>No projects found. Create your first project to get started.</p>
            <p-button label="Create Project" icon="pi pi-plus" (onClick)="showDialog = true" />
          </div>
        }

        <div class="grid">
          @for (project of filtered(); track project.id) {
            <div class="col-12 md:col-6 lg:col-4">
              <div class="project-card p-4 border-round" [routerLink]="['/projects', project.id]">
                <div class="flex align-items-center gap-3 mb-3">
                  <div class="project-icon" [style.background]="project.color || 'var(--primary-color)'">
                    {{ project.icon || project.name[0].toUpperCase() }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="project-name">{{ project.name }}</div>
                    <span class="project-key">{{ project.slug?.toUpperCase() }}</span>
                  </div>
                  <span [class]="getStatusClass(project.status)">{{ project.status }}</span>
                </div>
                <p class="project-desc">{{ project.description || 'No description provided.' }}</p>
                <div class="flex align-items-center justify-content-between mt-3" style="font-size:0.75rem;color:var(--text-color-secondary)">
                  <span><i class="pi pi-user mr-1"></i>{{ project.owner?.fullName || '—' }}</span>
                  <span>{{ project.createdAt | date:'MMM d, yyyy' }}</span>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Create Project Dialog -->
    <p-dialog header="New Project" [(visible)]="showDialog" [modal]="true"
      [style]="{width:'480px'}" [draggable]="false">
      <form [formGroup]="createForm" (ngSubmit)="createProject()">
        <div class="field">
          <label>Project Name *</label>
          <input pInputText formControlName="name" class="w-full" placeholder="My Awesome Project" />
          @if (createForm.get('name')?.invalid && createForm.get('name')?.touched) {
            <small class="p-error">Project name is required.</small>
          }
        </div>
        <div class="field">
          <label>Project Key *</label>
          <input pInputText formControlName="key" class="w-full" placeholder="MAP" style="text-transform:uppercase" />
          <small style="color:var(--text-color-secondary)">Short identifier (e.g. DEV, FE, API)</small>
        </div>
        <div class="field">
          <label>Description</label>
          <textarea pInputText formControlName="description" class="w-full" rows="3"
            placeholder="What is this project about?"></textarea>
        </div>
      </form>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" (onClick)="showDialog = false" />
        <p-button label="Create" icon="pi pi-check" (onClick)="createProject()"
          [disabled]="createForm.invalid || creating()" [loading]="creating()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .project-card {
      background: var(--surface-section);
      border: 1px solid var(--surface-border);
      cursor: pointer;
      transition: all 0.2s ease;
      height: 100%;
    }
    .project-card:hover {
      border-color: var(--primary-color);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(79,70,229,0.15);
    }
    .project-icon {
      width: 40px; height: 40px;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 700; font-size: 1.1rem;
      flex-shrink: 0;
    }
    .project-name { font-weight: 600; color: var(--text-color); font-size: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .project-key { font-size: 0.75rem; color: var(--text-color-secondary); font-family: monospace; }
    .project-desc { color: var(--text-color-secondary); font-size: 0.875rem; margin: 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .status-active { background: var(--status-inprogress); color: #fff; border-radius: 4px; padding: 2px 8px; font-size: 0.75rem; }
    .status-planning { background: var(--status-todo); color: #fff; border-radius: 4px; padding: 2px 8px; font-size: 0.75rem; }
    .status-completed { background: var(--status-done); color: #fff; border-radius: 4px; padding: 2px 8px; font-size: 0.75rem; }
    .status-archived { background: var(--status-backlog); color: #fff; border-radius: 4px; padding: 2px 8px; font-size: 0.75rem; }
    .empty-state { text-align: center; padding: 4rem 2rem; color: var(--text-color-secondary); }
    .empty-state i { font-size: 3rem; margin-bottom: 1rem; display: block; }
    .field { margin-bottom: 1.25rem; }
    .field label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: var(--text-color-secondary); }
  `]
})
export class ProjectListComponent implements OnInit {
  private projectSvc = inject(ProjectService);
  private fb = inject(FormBuilder);
  private toast = inject(MessageService);

  loading = signal(true);
  creating = signal(false);
  projects = signal<Project[]>([]);
  filtered = signal<Project[]>([]);
  showDialog = false;

  createForm = this.fb.group({
    name: ['', Validators.required],
    key: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{2,10}$/)]],
    description: ['']
  });

  ngOnInit() {
    this.projectSvc.getAll().subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : (data as any)?.content ?? [];
        this.projects.set(list);
        this.filtered.set(list);
        this.loading.set(false);
      },
      error: () => { this.projects.set([]); this.filtered.set([]); this.loading.set(false); }
    });
  }

  filterProjects(event: Event) {
    const q = (event.target as HTMLInputElement).value.toLowerCase();
    this.filtered.set(this.projects().filter(p =>
      p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    ));
  }

  getStatusClass(status: string): string {
    return 'status-' + (status?.toLowerCase() || 'active');
  }

  createProject() {
    if (this.createForm.invalid) return;
    this.creating.set(true);
    const { name, key, description } = this.createForm.value;
    this.projectSvc.create({ name: name!, slug: key!.toLowerCase(), description: description || '' }).subscribe({
      next: (p) => {
        this.projects.update(list => [p, ...list]);
        this.filtered.update(list => [p, ...list]);
        this.showDialog = false;
        this.createForm.reset();
        this.creating.set(false);
        this.toast.add({ severity: 'success', summary: 'Project created', detail: p.name });
      },
      error: (err) => {
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Failed to create project' });
        this.creating.set(false);
      }
    });
  }
}
