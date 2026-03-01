# 12 — Auth & Security Module

## Prompt for AI Code Generation

```
Generate Angular 17 Auth module for DevSync with PrimeNG components.

DESIGN: Clean centered card, dark theme, no sidebar/topbar (standalone layout)
COMPONENTS:
1. LoginComponent  — email + password, "Remember me", forgot password link
2. RegisterComponent — username, email, password, fullName, confirm password

VALIDATION (Angular Reactive Forms):
- Email: required, email format
- Password: required, min 8 chars, must contain uppercase + number
- Username: required, 3-20 chars, alphanumeric + underscores only
- ConfirmPassword: must match password (custom validator)

After login → redirect to /dashboard
After register → redirect to /dashboard

ERROR HANDLING:
- Show PrimeNG p-message for API errors
- Mark fields invalid on server validation errors
- Show loading spinner on submit button
```

---

## login.component.ts

```typescript
import { Component, signal, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { DividerModule } from 'primeng/divider';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    CardModule, InputTextModule, PasswordModule, ButtonModule,
    CheckboxModule, MessageModule, DividerModule
  ],
  template: `
    <div class="min-h-screen flex align-items-center justify-content-center surface-ground">
      <div style="width: 420px;">
        <div class="text-center mb-4">
          <i class="pi pi-code text-primary text-5xl"></i>
          <h1 class="text-3xl font-bold text-900 mt-2">DevSync</h1>
          <p class="text-500">Unified Project Management</p>
        </div>

        <p-card>
          <h2 class="text-xl font-semibold text-900 mb-4">Sign In</h2>

          @if (errorMessage()) {
            <p-message severity="error" [text]="errorMessage()!" styleClass="w-full mb-3" />
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="field mb-3">
              <label class="block text-900 font-medium mb-2">Email</label>
              <input pInputText type="email" formControlName="email"
                     placeholder="your@email.com" class="w-full"
                     [class.ng-invalid]="form.get('email')?.invalid && form.get('email')?.touched" />
              @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
                <small class="p-error">Email is required</small>
              }
            </div>

            <div class="field mb-3">
              <label class="block text-900 font-medium mb-2">Password</label>
              <p-password formControlName="password" [feedback]="false"
                          placeholder="••••••••" styleClass="w-full"
                          inputStyleClass="w-full" [toggleMask]="true" />
              @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
                <small class="p-error">Password is required</small>
              }
            </div>

            <div class="flex align-items-center justify-content-between mb-4">
              <div class="flex align-items-center gap-2">
                <p-checkbox formControlName="remember" [binary]="true" inputId="remember" />
                <label for="remember" class="text-900 cursor-pointer">Remember me</label>
              </div>
              <a class="text-primary cursor-pointer text-sm">Forgot password?</a>
            </div>

            <p-button type="submit" label="Sign In" icon="pi pi-sign-in"
                      styleClass="w-full" [loading]="loading()"
                      [disabled]="form.invalid || loading()" />
          </form>

          <p-divider />
          <p class="text-center text-500 text-sm">
            Don't have an account? 
            <a routerLink="/auth/register" class="text-primary font-medium">Create one</a>
          </p>
        </p-card>
      </div>
    </div>
  `
})
export class LoginComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);

  loading      = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    remember: [false]
  });

  onSubmit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    const { email, password } = this.form.value;

    this.auth.login(email!, password!).subscribe({
      next: ()  => { this.loading.set(false); this.router.navigate(['/dashboard']); },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Invalid credentials');
      }
    });
  }
}
```

---

# 13 — Theming & Design System

## Prompt for AI Code Generation

```
Configure the complete PrimeNG dark theme design system for DevSync.

BASE THEME: lara-dark-blue (from PrimeNG)
CUSTOMIZE: Override CSS variables in styles.scss

DESIGN TOKENS:
- Primary: #4F46E5 (indigo)
- Surface ground: #0f172a (dark navy)
- Surface section: #1e293b
- Surface overlay: #334155
- Text primary: #f1f5f9
- Text secondary: #94a3b8
- Border: #334155
- Success: #10B981, Warning: #F59E0B, Danger: #EF4444, Info: #3B82F6

COMPONENTS TO STYLE:
- Kanban cards with hover glow effect
- Code blocks with syntax highlighting
- Priority badges with semantic colors
- Status pills (BACKLOG=gray, TODO=blue, IN_PROGRESS=amber, IN_REVIEW=purple, DONE=green)
- Wiki page renderer (prose styles)
- Commit hash badges (monospace, cyan)
```

---

## styles.scss

```scss
// Import PrimeNG lara-dark-blue theme
@import "primeng/resources/themes/lara-dark-blue/theme.css";
@import "primeng/resources/primeng.min.css";
@import "primeicons/primeicons.css";
@import "primeflex/primeflex.css";
// highlight.js dark theme for code
@import "highlight.js/styles/github-dark.css";

:root {
  // Brand colors
  --primary-color: #4F46E5;
  --primary-color-text: #ffffff;

  // Dark surfaces
  --surface-ground:   #0f172a;
  --surface-section:  #1e293b;
  --surface-card:     #1e293b;
  --surface-overlay:  #334155;
  --surface-border:   #334155;
  --surface-hover:    #2d3f55;

  // Text
  --text-color:            #f1f5f9;
  --text-color-secondary:  #94a3b8;

  // Status colors
  --status-backlog:     #6B7280;
  --status-todo:        #3B82F6;
  --status-inprogress:  #F59E0B;
  --status-inreview:    #8B5CF6;
  --status-done:        #10B981;
  --status-cancelled:   #EF4444;

  // Priority colors
  --priority-critical: #EF4444;
  --priority-high:     #F59E0B;
  --priority-medium:   #3B82F6;
  --priority-low:      #10B981;
  --priority-none:     #6B7280;
}

// Global resets
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--surface-ground);
  color: var(--text-color);
}

// Kanban card hover
.kanban-card {
  transition: all 0.2s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(79, 70, 229, 0.15);
    border-color: var(--primary-color) !important;
  }
}

// Commit hash style
.commit-hash {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: #67e8f9; // cyan-300
  background: rgba(103, 232, 249, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.85rem;
}

// Custom scrollbar
::-webkit-scrollbar       { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--surface-ground); }
::-webkit-scrollbar-thumb { background: var(--surface-border); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--primary-color); }

// PrimeNG overrides
.p-card     { background: var(--surface-section); border: 1px solid var(--surface-border); }
.p-datatable { background: var(--surface-section); }
.p-toolbar  { background: var(--surface-section); border-color: var(--surface-border); }
.p-sidebar  { background: var(--surface-section); }
.p-dialog   { background: var(--surface-section); }

// Status badge utility classes
.status-backlog     { background: var(--status-backlog);    color: #fff; }
.status-todo        { background: var(--status-todo);       color: #fff; }
.status-inprogress  { background: var(--status-inprogress); color: #fff; }
.status-inreview    { background: var(--status-inreview);   color: #fff; }
.status-done        { background: var(--status-done);       color: #fff; }
.status-cancelled   { background: var(--status-cancelled);  color: #fff; }
```
