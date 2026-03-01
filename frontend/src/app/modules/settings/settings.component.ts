import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TabViewModule } from 'primeng/tabview';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { AvatarModule } from 'primeng/avatar';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TabViewModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    CheckboxModule,
    AvatarModule,
    ToastModule,
    DividerModule
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="p-4" style="max-width:800px;margin:0 auto">
      <h2 style="margin:0 0 1.5rem;color:var(--text-color)">Settings</h2>

      <p-tabView>
        <!-- Profile Tab -->
        <p-tabPanel header="Profile">
          <div class="flex align-items-center gap-4 mb-4">
            <p-avatar [label]="getInitials()" shape="circle" size="xlarge"
              [style]="{'background-color':'var(--primary-color)','color':'#fff','font-weight':'700','font-size':'1.25rem'}" />
            <div>
              <div style="font-size:1.25rem;font-weight:600;color:var(--text-color)">{{ auth.currentUser()?.fullName }}</div>
              <div style="color:var(--text-color-secondary)">{{ auth.currentUser()?.email }}</div>
              <div style="font-size:0.8rem;color:var(--text-color-secondary);margin-top:2px">
                Role: <strong style="color:var(--primary-color)">{{ auth.currentUser()?.role }}</strong>
              </div>
            </div>
          </div>

          <p-divider />

          <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
            <div class="grid">
              <div class="col-12 md:col-6 field">
                <label>Full Name</label>
                <input pInputText formControlName="fullName" class="w-full" />
              </div>
              <div class="col-12 md:col-6 field">
                <label>Username</label>
                <input pInputText formControlName="username" class="w-full" />
              </div>
              <div class="col-12 field">
                <label>Avatar URL</label>
                <input pInputText formControlName="avatarUrl" class="w-full" placeholder="https://..." />
              </div>
            </div>
            <p-button type="submit" label="Save Profile" icon="pi pi-save"
              [loading]="savingProfile()" [disabled]="profileForm.invalid || savingProfile()" />
          </form>
        </p-tabPanel>

        <!-- Security Tab -->
        <p-tabPanel header="Security">
          <h3 style="color:var(--text-color);margin:0 0 1.25rem">Change Password</h3>
          <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" style="max-width:400px">
            <div class="field">
              <label>Current Password</label>
              <p-password formControlName="currentPassword" [feedback]="false" [toggleMask]="true"
                styleClass="w-full" inputStyleClass="w-full" />
            </div>
            <div class="field">
              <label>New Password</label>
              <p-password formControlName="newPassword" [toggleMask]="true"
                styleClass="w-full" inputStyleClass="w-full" />
              @if (passwordForm.get('newPassword')?.invalid && passwordForm.get('newPassword')?.touched) {
                <small class="p-error">Min 8 chars, 1 uppercase, 1 number</small>
              }
            </div>
            <div class="field">
              <label>Confirm New Password</label>
              <p-password formControlName="confirmPassword" [feedback]="false" [toggleMask]="true"
                styleClass="w-full" inputStyleClass="w-full" />
            </div>
            <p-button type="submit" label="Update Password" icon="pi pi-lock"
              severity="warning" [loading]="savingPassword()"
              [disabled]="passwordForm.invalid || savingPassword()" />
          </form>
        </p-tabPanel>

        <!-- Notifications Tab -->
        <p-tabPanel header="Notifications">
          <h3 style="color:var(--text-color);margin:0 0 1.25rem">Notification Preferences</h3>
          <div class="flex flex-column gap-3" style="max-width:480px">
            @for (pref of notifPrefs; track pref.key) {
              <div class="flex align-items-center justify-content-between notif-row p-3 border-round">
                <div>
                  <div style="font-weight:500;color:var(--text-color)">{{ pref.label }}</div>
                  <div style="font-size:0.8rem;color:var(--text-color-secondary)">{{ pref.desc }}</div>
                </div>
                <p-checkbox [(ngModel)]="pref.enabled" [binary]="true" />
              </div>
            }
            <p-button label="Save Preferences" icon="pi pi-save" (onClick)="saveNotifPrefs()"
              [loading]="savingNotifs()" />
          </div>
        </p-tabPanel>

        <!-- API Keys Tab -->
        <p-tabPanel header="API Keys">
          <h3 style="color:var(--text-color);margin:0 0 0.5rem">API Access</h3>
          <p style="color:var(--text-color-secondary);margin:0 0 1.5rem">
            Use API keys to authenticate programmatic access to DevSync.
          </p>
          <div class="api-key-box p-3 border-round mb-3">
            <div style="font-size:0.75rem;color:var(--text-color-secondary);margin-bottom:0.5rem">Your API Key</div>
            <div style="font-family:monospace;color:#67e8f9;word-break:break-all">
              {{ apiKey() || 'Generate a key below' }}
            </div>
          </div>
          <p-button label="Generate New API Key" icon="pi pi-key"
            severity="secondary" (onClick)="generateApiKey()" [loading]="generatingKey()" />
          <p class="mt-2" style="font-size:0.8rem;color:var(--priority-critical)">
            <i class="pi pi-exclamation-triangle mr-1"></i>
            Generating a new key will invalidate the previous one.
          </p>
        </p-tabPanel>
      </p-tabView>
    </div>
  `,
  styles: [`
    .field { margin-bottom: 1.25rem; }
    .field label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: var(--text-color-secondary); }
    .notif-row { background: var(--surface-section); border: 1px solid var(--surface-border); }
    .api-key-box { background: var(--surface-section); border: 1px solid var(--surface-border); }
  `]
})
export class SettingsComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private toast = inject(MessageService);

  savingProfile = signal(false);
  savingPassword = signal(false);
  savingNotifs = signal(false);
  generatingKey = signal(false);
  apiKey = signal<string | null>(null);

  profileForm = this.fb.group({
    fullName: ['', Validators.required],
    username: ['', [Validators.required, Validators.minLength(3)]],
    avatarUrl: ['']
  });

  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Z])(?=.*\d).+$/)]],
    confirmPassword: ['', Validators.required]
  });

  notifPrefs = [
    { key: 'taskAssigned', label: 'Task Assigned', desc: 'When a task is assigned to you', enabled: true },
    { key: 'taskComment', label: 'Task Comments', desc: 'When someone comments on your task', enabled: true },
    { key: 'sprintStart', label: 'Sprint Started', desc: 'When a new sprint begins', enabled: false },
    { key: 'emailDigest', label: 'Email Digest', desc: 'Daily email summary of activity', enabled: false },
    { key: 'mentionAlert', label: 'Mentions', desc: 'When you are @mentioned in a comment or wiki', enabled: true }
  ];

  ngOnInit() {
    const user = this.auth.currentUser();
    if (user) {
      this.profileForm.patchValue({
        fullName: user.fullName,
        username: user.username,
        avatarUrl: user.avatarUrl || ''
      });
    }
  }

  getInitials(): string {
    const name = this.auth.currentUser()?.fullName;
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  saveProfile() {
    if (this.profileForm.invalid) return;
    this.savingProfile.set(true);
    this.api.put<any>('/users/me', this.profileForm.value).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Saved', detail: 'Profile updated successfully' });
        this.savingProfile.set(false);
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update profile' });
        this.savingProfile.set(false);
      }
    });
  }

  changePassword() {
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;
    if (newPassword !== confirmPassword) {
      this.toast.add({ severity: 'warn', summary: 'Mismatch', detail: 'Passwords do not match' });
      return;
    }
    this.savingPassword.set(true);
    this.api.post<any>('/users/me/password', { currentPassword, newPassword }).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Done', detail: 'Password changed successfully' });
        this.passwordForm.reset();
        this.savingPassword.set(false);
      },
      error: (err) => {
        this.toast.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Failed to change password' });
        this.savingPassword.set(false);
      }
    });
  }

  saveNotifPrefs() {
    this.savingNotifs.set(true);
    const prefs = Object.fromEntries(this.notifPrefs.map(p => [p.key, p.enabled]));
    this.api.put<any>('/users/me/notifications', prefs).subscribe({
      next: () => {
        this.toast.add({ severity: 'success', summary: 'Saved', detail: 'Notification preferences saved' });
        this.savingNotifs.set(false);
      },
      error: () => { this.savingNotifs.set(false); }
    });
  }

  generateApiKey() {
    this.generatingKey.set(true);
    this.api.post<any>('/users/me/api-key', {}).subscribe({
      next: (res) => {
        this.apiKey.set(res.apiKey || res.key || '');
        this.generatingKey.set(false);
        this.toast.add({ severity: 'success', summary: 'Generated', detail: 'New API key generated. Copy it now!' });
      },
      error: () => { this.generatingKey.set(false); }
    });
  }
}
