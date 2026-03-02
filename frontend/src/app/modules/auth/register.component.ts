import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../core/services/auth.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CardModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessageModule
  ],
  template: `
    <div class="auth-wrapper">
      <p-card styleClass="auth-card">
        <ng-template pTemplate="header">
          <div class="auth-header">
            <div class="logo-icon">
              <i class="pi pi-code" style="font-size:2rem;color:var(--primary-color)"></i>
            </div>
            <h1 class="app-title">DevSync</h1>
            <p class="app-subtitle">Create your account</p>
          </div>
        </ng-template>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="field">
            <label for="fullName">Full Name</label>
            <input id="fullName" type="text" pInputText formControlName="fullName"
              placeholder="Jane Doe" class="w-full"
              [class.ng-invalid]="f['fullName'].invalid && f['fullName'].touched" />
            @if (f['fullName'].invalid && f['fullName'].touched) {
              <small class="p-error">Full name is required.</small>
            }
          </div>

          <div class="field">
            <label for="username">Username</label>
            <input id="username" type="text" pInputText formControlName="username"
              placeholder="jane_doe (3–20 chars)" class="w-full"
              [class.ng-invalid]="f['username'].invalid && f['username'].touched" />
            @if (f['username'].invalid && f['username'].touched) {
              <small class="p-error">Username must be 3–20 alphanumeric characters.</small>
            }
          </div>

          <div class="field">
            <label for="email">Email</label>
            <input id="email" type="email" pInputText formControlName="email"
              placeholder="you@company.com" class="w-full"
              [class.ng-invalid]="f['email'].invalid && f['email'].touched" />
            @if (f['email'].invalid && f['email'].touched) {
              <small class="p-error">Valid email is required.</small>
            }
          </div>

          <div class="field">
            <label for="password">Password</label>
            <p-password inputId="password" formControlName="password"
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" />
            @if (f['password'].invalid && f['password'].touched) {
              <small class="p-error">Password must be 8+ chars with uppercase and number.</small>
            }
          </div>

          <div class="field">
            <label for="confirmPassword">Confirm Password</label>
            <p-password inputId="confirmPassword" formControlName="confirmPassword"
              placeholder="Repeat password"
              [feedback]="false" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" />
            @if (form.errors?.['passwordMismatch'] && f['confirmPassword'].touched) {
              <small class="p-error">Passwords do not match.</small>
            }
          </div>

          @if (errorMsg()) {
            <p-message severity="error" [text]="errorMsg()!" styleClass="w-full mb-3" />
          }

          <p-button type="submit" label="Create Account" icon="pi pi-user-plus"
            styleClass="w-full" [loading]="loading()" [disabled]="form.invalid || loading()" />
        </form>

        <ng-template pTemplate="footer">
          <div class="auth-footer">
            <span style="color:var(--text-color-secondary)">Already have an account?</span>
            <a routerLink="/auth/login" class="auth-link">Sign in</a>
          </div>
        </ng-template>
      </p-card>
    </div>
  `,
  styles: [`
    .auth-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--surface-ground);
      padding: 1rem;
    }
    ::ng-deep .auth-card {
      width: 100%;
      max-width: 440px;
      background: var(--surface-section) !important;
      border: 1px solid var(--surface-border) !important;
      border-radius: 12px;
    }
    .auth-header {
      text-align: center;
      padding: 2rem 2rem 0;
    }
    .logo-icon {
      width: 56px;
      height: 56px;
      background: rgba(79,70,229,0.15);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1rem;
    }
    .app-title { margin: 0; font-size: 1.75rem; font-weight: 700; color: var(--text-color); }
    .app-subtitle { margin: 0.25rem 0 0; color: var(--text-color-secondary); font-size: 0.9rem; }
    .field { margin-bottom: 1.25rem; }
    .field label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: var(--text-color-secondary); font-weight: 500; }
    .auth-footer { text-align: center; padding-top: 0.5rem; font-size: 0.875rem; display: flex; gap: 0.5rem; justify-content: center; align-items: center; }
    .auth-link { color: var(--primary-color); text-decoration: none; font-weight: 500; }
    .auth-link:hover { text-decoration: underline; }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMsg = signal<string | null>(null);

  form = this.fb.group({
    fullName: ['', Validators.required],
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20), Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Z])(?=.*\d).+$/)]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordMatchValidator });

  get f() { return this.form.controls; }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set(null);
    const { fullName, username, email, password } = this.form.value;
    this.auth.register({ fullName: fullName!, username: username!, email: email!, password: password! }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.errorMsg.set(err?.error?.message || 'Registration failed. Please try again.');
        this.loading.set(false);
      }
    });
  }
}
