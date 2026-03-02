import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
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
            <p class="app-subtitle">Sign in to your workspace</p>
          </div>
        </ng-template>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="field">
            <label for="email">Email</label>
            <input
              id="email"
              type="email"
              pInputText
              formControlName="email"
              placeholder="you@company.com"
              class="w-full"
              [class.ng-invalid]="form.get('email')?.invalid && form.get('email')?.touched"
            />
            @if (form.get('email')?.invalid && form.get('email')?.touched) {
              <small class="p-error">Valid email is required.</small>
            }
          </div>

          <div class="field">
            <label for="password">Password</label>
            <p-password
              inputId="password"
              formControlName="password"
              placeholder="Min 8 characters"
              [feedback]="false"
              [toggleMask]="true"
              styleClass="w-full"
              inputStyleClass="w-full"
              [class.ng-invalid]="form.get('password')?.invalid && form.get('password')?.touched"
            />
            @if (form.get('password')?.invalid && form.get('password')?.touched) {
              <small class="p-error">Password must be at least 8 characters.</small>
            }
          </div>

          @if (errorMsg()) {
            <p-message severity="error" [text]="errorMsg()!" styleClass="w-full mb-3" />
          }

          <p-button
            type="submit"
            label="Sign In"
            icon="pi pi-sign-in"
            styleClass="w-full"
            [loading]="loading()"
            [disabled]="form.invalid || loading()"
          />
        </form>

        <ng-template pTemplate="footer">
          <div class="auth-footer">
            <span style="color:var(--text-color-secondary)">Don't have an account?</span>
            <a routerLink="/auth/register" class="auth-link">Create account</a>
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
      max-width: 420px;
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
    .app-title {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-color);
      letter-spacing: -0.5px;
    }
    .app-subtitle {
      margin: 0.25rem 0 0;
      color: var(--text-color-secondary);
      font-size: 0.9rem;
    }
    .field {
      margin-bottom: 1.25rem;
    }
    .field label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-color-secondary);
      font-weight: 500;
    }
    .auth-footer {
      text-align: center;
      padding-top: 0.5rem;
      font-size: 0.875rem;
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      align-items: center;
    }
    .auth-link {
      color: var(--primary-color);
      text-decoration: none;
      font-weight: 500;
    }
    .auth-link:hover { text-decoration: underline; }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMsg = signal<string | null>(null);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  onSubmit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set(null);
    const { email, password } = this.form.value;
    this.auth.login(email!, password!).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.errorMsg.set(err?.error?.message || 'Invalid credentials. Please try again.');
        this.loading.set(false);
      }
    });
  }
}
