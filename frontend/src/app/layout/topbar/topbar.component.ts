import { Component, Output, EventEmitter, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, NgStyle } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { BadgeModule } from 'primeng/badge';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { Popover } from 'primeng/popover';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    CommonModule, NgStyle, RouterLink,
    ButtonModule, InputTextModule, BadgeModule, MenuModule, AvatarModule, Popover
  ],
  template: `
    <div class="layout-topbar flex align-items-center justify-content-between px-4 py-2"
         style="background: var(--surface-section); border-bottom: 1px solid var(--surface-border); height: 60px;">

      <p-button icon="pi pi-bars" styleClass="p-button-text p-button-rounded"
                (onClick)="toggleSidebar.emit()" />

      <div class="p-input-icon-left flex-1 mx-4" style="max-width: 400px;">
        <i class="pi pi-search"></i>
        <input pInputText type="text" placeholder="Search tasks, wiki, commits..."
               class="w-full" style="background: var(--surface-ground);" />
      </div>

      <div class="flex align-items-center gap-2">
        <div class="relative">
          <p-button icon="pi pi-bell" styleClass="p-button-text p-button-rounded"
                    (onClick)="notifPanel.toggle($event)" />
          @if (notifications.unreadCount() > 0) {
            <span class="absolute top-0 right-0 flex align-items-center justify-content-center"
                  style="width:16px; height:16px; background:#EF4444; border-radius:50%;
                         font-size:0.65rem; font-weight:700; color:#fff;">
              {{ notifications.unreadCount() }}
            </span>
          }
        </div>

        <p-popover #notifPanel>
          <div style="width:320px; max-height:400px; overflow-y:auto;">
            <div class="flex align-items-center justify-content-between mb-3">
              <span class="font-semibold">Notifications</span>
              <p-button label="Mark all read" styleClass="p-button-text p-button-sm"
                        (onClick)="notifications.markAllRead().subscribe()" />
            </div>
            <p class="text-color-secondary text-sm text-center py-4">
              No new notifications
            </p>
          </div>
        </p-popover>

        <p-avatar
          [label]="auth.currentUser()?.fullName?.charAt(0) || 'U'"
          shape="circle" size="normal"
          styleClass="cursor-pointer"
          [ngStyle]="{'background': 'var(--primary-color)', 'color': '#fff'}"
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
  notifications = inject(NotificationService);

  userMenuItems: MenuItem[] = [
    { label: 'Profile',  icon: 'pi pi-user' },
    { label: 'Settings', icon: 'pi pi-cog',      routerLink: '/settings' },
    { separator: true },
    { label: 'Logout',   icon: 'pi pi-sign-out', command: () => this.auth.logout() }
  ];
}
