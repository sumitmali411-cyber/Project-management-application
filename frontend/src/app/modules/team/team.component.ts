import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { DataViewModule } from 'primeng/dataview';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { AvatarModule } from 'primeng/avatar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProjectService, Project } from '../../core/services/project.service';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DataViewModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    DropdownModule,
    AvatarModule,
    ProgressSpinnerModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="p-4">
      <div class="flex align-items-center justify-content-between mb-4">
        <div>
          <h2 style="margin:0;color:var(--text-color)">Team</h2>
          <p style="margin:0.25rem 0 0;color:var(--text-color-secondary)">{{ members().length }} members</p>
        </div>
        <div class="flex gap-2 align-items-center">
          <p-dropdown [options]="projects()" optionLabel="name" optionValue="id"
            placeholder="Select Project" [(ngModel)]="selectedProjectId"
            (onChange)="onProjectChange()" />
          <p-button label="Invite Member" icon="pi pi-user-plus" (onClick)="showInviteDialog = true"
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
          <i class="pi pi-users"></i>
          <p>Select a project to view team members</p>
        </div>
      }

      @if (!loading() && selectedProjectId) {
        @if (members().length === 0) {
          <div class="empty-state">
            <i class="pi pi-user-plus"></i>
            <p>No members in this project yet. Invite someone!</p>
          </div>
        }

        <div class="grid">
          @for (m of members(); track m.id) {
            <div class="col-12 md:col-6 lg:col-4 xl:col-3">
              <div class="member-card p-4 border-round">
                <div class="flex align-items-center gap-3 mb-3">
                  <p-avatar [label]="getInitials(m.user?.fullName)"
                    shape="circle" size="xlarge"
                    [style]="{'background-color': getAvatarColor(m.user?.id), 'color': '#fff', 'font-weight': '700'}" />
                  <div>
                    <div class="member-name">{{ m.user?.fullName || '—' }}</div>
                    <div class="member-username">&#64;{{ m.user?.username }}</div>
                  </div>
                </div>
                <div class="member-email">
                  <i class="pi pi-envelope mr-1" style="font-size:0.8rem"></i>
                  {{ m.user?.email }}
                </div>
                <div class="flex align-items-center justify-content-between mt-3">
                  <span class="role-badge role-{{ m.role?.toLowerCase() }}">{{ m.role }}</span>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Invite Dialog -->
    <p-dialog header="Invite Member" [(visible)]="showInviteDialog" [modal]="true"
      [style]="{width:'400px'}" [draggable]="false">
      <form [formGroup]="inviteForm" (ngSubmit)="inviteMember()">
        <div class="field">
          <label>Email Address *</label>
          <input pInputText formControlName="email" class="w-full" placeholder="colleague@company.com" />
        </div>
        <div class="field">
          <label>Role *</label>
          <p-dropdown formControlName="role" [options]="roles"
            optionLabel="label" optionValue="value" styleClass="w-full" />
        </div>
      </form>
      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" (onClick)="showInviteDialog = false" />
        <p-button label="Send Invite" icon="pi pi-send" (onClick)="inviteMember()"
          [loading]="inviting()" [disabled]="inviteForm.invalid || inviting()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .member-card { background: var(--surface-section); border: 1px solid var(--surface-border); transition: border-color 0.2s; }
    .member-card:hover { border-color: var(--primary-color); }
    .member-name { font-weight: 600; color: var(--text-color); font-size: 1rem; }
    .member-username { font-size: 0.8rem; color: var(--text-color-secondary); }
    .member-email { font-size: 0.8rem; color: var(--text-color-secondary); }
    .role-badge { font-size: 0.75rem; border-radius: 4px; padding: 3px 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .role-admin { background: rgba(239,68,68,0.15); color: #EF4444; }
    .role-pm { background: rgba(245,158,11,0.15); color: #F59E0B; }
    .role-dev { background: rgba(79,70,229,0.15); color: var(--primary-color); }
    .role-viewer { background: rgba(107,114,128,0.15); color: #6B7280; }
    .empty-state { text-align: center; padding: 4rem 2rem; color: var(--text-color-secondary); }
    .empty-state i { font-size: 3rem; margin-bottom: 1rem; display: block; }
    .field { margin-bottom: 1.25rem; }
    .field label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: var(--text-color-secondary); }
  `]
})
export class TeamComponent implements OnInit {
  private projectSvc = inject(ProjectService);
  private fb = inject(FormBuilder);
  private toast = inject(MessageService);

  loading = signal(false);
  inviting = signal(false);
  projects = signal<Project[]>([]);
  members = signal<any[]>([]);
  selectedProjectId: number | null = null;
  showInviteDialog = false;

  roles = [
    { label: 'Developer', value: 'DEV' },
    { label: 'Project Manager', value: 'PM' },
    { label: 'Viewer', value: 'VIEWER' }
  ];

  inviteForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['DEV', Validators.required]
  });

  ngOnInit() {
    this.projectSvc.getAll().subscribe({
      next: (data) => this.projects.set(Array.isArray(data) ? data : (data as any)?.content ?? []),
      error: () => this.projects.set([])
    });
  }

  onProjectChange() {
    if (!this.selectedProjectId) return;
    this.loading.set(true);
    this.projectSvc.getMembers(this.selectedProjectId).subscribe({
      next: (m) => { this.members.set(m); this.loading.set(false); },
      error: () => { this.members.set([]); this.loading.set(false); }
    });
  }

  inviteMember() {
    if (this.inviteForm.invalid || !this.selectedProjectId) return;
    this.inviting.set(true);
    const { email, role } = this.inviteForm.value;
    this.projectSvc.addMember(this.selectedProjectId, { email: email!, role: role! }).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Invited', detail: `${email} has been invited` });
        this.showInviteDialog = false;
        this.inviteForm.reset({ role: 'DEV' });
        this.inviting.set(false);
        this.onProjectChange();
      },
      error: (err) => {
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Failed to invite member' });
        this.inviting.set(false);
      }
    });
  }

  getInitials(name?: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getAvatarColor(id?: number): string {
    const colors = ['#4F46E5', '#7C3AED', '#DB2777', '#D97706', '#059669', '#0284C7'];
    return colors[(id || 0) % colors.length];
  }
}
