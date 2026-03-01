import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';

export interface DashboardStats {
  openTasks: number;
  closedToday: number;
  activeSprints: number;
  teamMembers: number;
}

export interface ActivityItem {
  id: number;
  type: string;
  message: string;
  user: string;
  timestamp: string;
}

export interface BurndownPoint {
  date: string;
  remaining: number;
  ideal: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private api = inject(ApiService);

  getStats(): Observable<DashboardStats> {
    return this.api.get<DashboardStats>('/dashboard/stats');
  }

  getBurndown(projectId?: number): Observable<BurndownPoint[]> {
    const params = projectId ? { projectId } : undefined;
    return this.api.get<BurndownPoint[]>('/dashboard/burndown', params);
  }

  getActivity(): Observable<ActivityItem[]> {
    return this.api.get<ActivityItem[]>('/dashboard/activity');
  }

  getMyTasks(): Observable<any[]> {
    return this.api.get<any[]>('/dashboard/my-tasks');
  }
}
