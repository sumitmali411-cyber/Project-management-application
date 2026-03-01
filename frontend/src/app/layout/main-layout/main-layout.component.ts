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
    <div class="layout-wrapper" [class.sidebar-collapsed]="!sidebarVisible()">
      <app-sidebar [visible]="sidebarVisible()" (toggleSidebar)="sidebarVisible.set(!sidebarVisible())" />
      <div class="layout-main-container">
        <app-topbar (toggleSidebar)="sidebarVisible.set(!sidebarVisible())" />
        <div class="layout-main p-4">
          <router-outlet />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .layout-wrapper {
      display: flex;
      min-height: 100vh;
      background: var(--surface-ground);
    }
    .layout-main-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }
    .layout-main {
      flex: 1;
      overflow-y: auto;
    }
  `]
})
export class MainLayoutComponent {
  sidebarVisible = signal(true);
}
