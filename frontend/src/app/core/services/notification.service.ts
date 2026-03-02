import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  unreadCount = signal(0);

  constructor(private api: ApiService) {}

  getAll(): Observable<any[]> {
    return this.api.get<any[]>('/notifications').pipe(
      tap((notifications: any[]) => {
        this.unreadCount.set(notifications.filter((n: any) => !n.isRead).length);
      })
    );
  }

  markRead(id: number): Observable<any> {
    return this.api.patch<any>(`/notifications/${id}/read`, {}).pipe(
      tap(() => this.unreadCount.update(c => Math.max(0, c - 1)))
    );
  }

  markAllRead(): Observable<void> {
    return this.api.post<void>('/notifications/mark-all-read', {}).pipe(
      tap(() => this.unreadCount.set(0))
    );
  }
}
