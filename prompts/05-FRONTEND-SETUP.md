# 05 — Angular Frontend: Core Services & Layout

## Prompt for AI Code Generation

```
Generate Angular 17 standalone component architecture for DevSync.

REQUIREMENTS:
- All components are standalone (no NgModule)
- Use Angular Signals for state management where applicable
- Use PrimeNG components throughout (NO custom CSS components unless unavoidable)
- Use PrimeFlex for layout
- Dark theme: lara-dark-blue PrimeNG theme

CORE SERVICES TO GENERATE:
1. AuthService       — login, register, logout, token management, isAuthenticated signal
2. ApiService        — generic HTTP wrapper with error handling
3. ProjectService    — CRUD + member management
4. TaskService       — CRUD + kanban board data
5. WikiService       — page CRUD + markdown rendering (from vonfluence-wiki-markdown-chalks)
6. MermaidService    — diagram rendering (from markdown-previewer-mermaid)
7. NotificationService — polling + mark read
8. UserService       — current user, profile

LAYOUT COMPONENTS:
1. MainLayoutComponent    — sidebar + topbar + router-outlet
2. SidebarComponent       — PrimeNG PanelMenu navigation
3. TopbarComponent        — search, notifications bell, user avatar menu

HTTP INTERCEPTORS:
1. authInterceptor — inject Bearer token
2. errorInterceptor — handle 401/403/500
```

---

## auth.service.ts

```typescript
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthUser {
  id: number; username: string; email: string;
  fullName: string; avatarUrl?: string; role: string;
}
export interface AuthResponse {
  token: string; refreshToken: string; user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = environment.apiUrl;

  private _token = signal<string | null>(localStorage.getItem('token'));
  private _user  = signal<AuthUser | null>(
    JSON.parse(localStorage.getItem('user') || 'null')
  );

  readonly isAuthenticated = computed(() => !!this._token());
  readonly currentUser     = computed(() => this._user());
  readonly token           = computed(() => this._token());

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string) {
    return this.http.post<{ data: AuthResponse }>(`${this.api}/auth/login`, { email, password }).pipe(
      tap(res => this.storeAuth(res.data))
    );
  }

  register(payload: { username: string; email: string; password: string; fullName: string }) {
    return this.http.post<{ data: AuthResponse }>(`${this.api}/auth/register`, payload).pipe(
      tap(res => this.storeAuth(res.data))
    );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/auth/login']);
  }

  private storeAuth(data: AuthResponse) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    this._token.set(data.token);
    this._user.set(data.user);
  }
}
```

---

## auth.interceptor.ts

```typescript
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth  = inject(AuthService);
  const token = auth.token();

  if (token) {
    req = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  }
  return next(req);
};
```

---

## main-layout.component.ts

```typescript
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, CommonModule],
  template: `
    <div class="layout-wrapper" [class.layout-sidebar-active]="sidebarVisible()">
      <app-sidebar (toggleSidebar)="sidebarVisible.set(!sidebarVisible())" />
      <div class="layout-main-container">
        <app-topbar (toggleSidebar)="sidebarVisible.set(!sidebarVisible())" />
        <div class="layout-main p-4">
          <router-outlet />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .layout-wrapper { display: flex; min-height: 100vh; background: var(--surface-ground); }
    .layout-main-container { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .layout-main { flex: 1; overflow-y: auto; }
  `]
})
export class MainLayoutComponent {
  sidebarVisible = signal(true);
}
```

---

## sidebar.component.ts

```typescript
import { Component, Output, EventEmitter, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PanelMenuModule } from 'primeng/panelmenu';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [PanelMenuModule, ButtonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="layout-sidebar bg-surface-section border-right-1 surface-border"
         style="width:260px; min-height:100vh; padding: 1rem;">
      
      <div class="flex align-items-center gap-2 mb-4 p-2">
        <i class="pi pi-code text-primary text-2xl"></i>
        <span class="text-xl font-bold text-primary">DevSync</span>
      </div>

      <p-panelMenu [model]="menuItems" styleClass="w-full border-none" />

      <div class="mt-auto pt-4 border-top-1 surface-border">
        <p-button
          label="Logout" icon="pi pi-sign-out"
          styleClass="p-button-text w-full justify-content-start"
          (onClick)="auth.logout()"
        />
      </div>
    </div>
  `
})
export class SidebarComponent {
  auth = inject(AuthService);

  menuItems: MenuItem[] = [
    { label: 'Dashboard', icon: 'pi pi-home',       routerLink: '/dashboard' },
    { label: 'Projects',  icon: 'pi pi-folder',     routerLink: '/projects' },
    { label: 'My Tasks',  icon: 'pi pi-check-square',routerLink: '/tasks' },
    { label: 'Wiki',      icon: 'pi pi-book',        routerLink: '/wiki' },
    { label: 'Commits',   icon: 'pi pi-code',        routerLink: '/commits' },
    { label: 'Team',      icon: 'pi pi-users',       routerLink: '/team' },
    { label: 'Settings',  icon: 'pi pi-cog',         routerLink: '/settings' }
  ];
}
```

---

## topbar.component.ts

```typescript
import { Component, Output, EventEmitter, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { BadgeModule } from 'primeng/badge';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [ButtonModule, InputTextModule, BadgeModule, MenuModule, AvatarModule, OverlayPanelModule, CommonModule],
  template: `
    <div class="layout-topbar flex align-items-center justify-content-between px-4 py-2
                bg-surface-section border-bottom-1 surface-border">
      
      <p-button icon="pi pi-bars" styleClass="p-button-text" (onClick)="toggleSidebar.emit()" />

      <div class="p-input-icon-left" style="width: 360px;">
        <i class="pi pi-search"></i>
        <input pInputText type="text" placeholder="Search tasks, wiki, commits..."
               class="w-full" style="background: var(--surface-ground);" />
      </div>

      <div class="flex align-items-center gap-3">
        <p-button icon="pi pi-bell" styleClass="p-button-text p-button-rounded"
                  pBadge value="3" badgeSeverity="danger" />

        <p-avatar
          [label]="auth.currentUser()?.fullName?.charAt(0) || 'U'"
          shape="circle" size="normal"
          styleClass="cursor-pointer"
          (click)="userMenu.toggle($event)"
        />
        <p-menu #userMenu [model]="userMenuItems" [popup]="true" />
      </div>
    </div>
  `
})
export class TopbarComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  auth = inject(AuthService);

  userMenuItems: MenuItem[] = [
    { label: 'Profile',    icon: 'pi pi-user' },
    { label: 'Settings',   icon: 'pi pi-cog', routerLink: '/settings' },
    { separator: true },
    { label: 'Logout',     icon: 'pi pi-sign-out', command: () => this.auth.logout() }
  ];
}
```
