import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ButtonModule],
  template: `
    <div class="layout-sidebar" [class.hidden]="!visible"
         style="width:260px; min-height:100vh; background: var(--surface-section);
                border-right: 1px solid var(--surface-border); display:flex; flex-direction:column;">

      <div class="flex align-items-center gap-2 p-4"
           style="border-bottom: 1px solid var(--surface-border);">
        <i class="pi pi-code text-primary text-2xl"></i>
        <span class="text-xl font-bold text-primary">DevSync</span>
      </div>

      <nav class="flex-1 p-3">
        @for (item of navItems; track item.route) {
          <a [routerLink]="item.route" routerLinkActive="nav-active"
             class="nav-item flex align-items-center gap-3 px-3 py-2 mb-1 border-round cursor-pointer
                    text-color-secondary no-underline"
             style="transition: all 0.15s ease;">
            <i [class]="item.icon"></i>
            <span class="font-medium">{{ item.label }}</span>
          </a>
        }
      </nav>

      <div class="p-3" style="border-top: 1px solid var(--surface-border);">
        <div class="flex align-items-center gap-2 px-3 py-2 mb-2">
          <div class="flex align-items-center justify-content-center"
               style="width:32px; height:32px; border-radius:50%; background:var(--primary-color); font-size:0.875rem; font-weight:600;">
            {{ auth.currentUser()?.fullName?.charAt(0) || 'U' }}
          </div>
          <div class="flex-1 overflow-hidden">
            <div class="text-sm font-medium text-overflow-ellipsis overflow-hidden white-space-nowrap">
              {{ auth.currentUser()?.fullName }}
            </div>
            <div class="text-xs text-color-secondary text-overflow-ellipsis overflow-hidden white-space-nowrap">
              {{ auth.currentUser()?.email }}
            </div>
          </div>
        </div>
        <p-button label="Sign Out" icon="pi pi-sign-out"
                  styleClass="p-button-text p-button-sm w-full justify-content-start"
                  (onClick)="auth.logout()" />
      </div>
    </div>
  `,
  styles: [`
    .nav-item:hover { background: var(--surface-hover); color: var(--text-color) !important; }
    .nav-active { background: rgba(79,70,229,0.15) !important; color: var(--primary-color) !important; }
    .nav-active i { color: var(--primary-color); }
  `]
})
export class SidebarComponent {
  @Input() visible = true;
  @Output() toggleSidebar = new EventEmitter<void>();

  auth = inject(AuthService);

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'pi pi-home',        route: '/dashboard' },
    { label: 'Projects',  icon: 'pi pi-folder',      route: '/projects' },
    { label: 'My Tasks',  icon: 'pi pi-check-square', route: '/tasks' },
    { label: 'Wiki',      icon: 'pi pi-book',         route: '/wiki' },
    { label: 'Commits',   icon: 'pi pi-code',         route: '/commits' },
    { label: 'Team',      icon: 'pi pi-users',        route: '/team' },
    { label: 'Settings',  icon: 'pi pi-cog',          route: '/settings' }
  ];
}
