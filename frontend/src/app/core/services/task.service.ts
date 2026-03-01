import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  taskType: string;
  assignee?: any;
  reporter?: any;
  dueDate?: string;
  storyPoints?: number;
  projectId: number;
  sprintId?: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  constructor(private api: ApiService) {}

  getTasks(projectId: number, params?: any): Observable<any> {
    return this.api.get<any>(`/projects/${projectId}/tasks`, params);
  }

  getKanban(projectId: number): Observable<any> {
    return this.api.get<any>(`/projects/${projectId}/tasks/kanban`);
  }

  getTask(projectId: number, taskId: number): Observable<any> {
    return this.api.get<any>(`/projects/${projectId}/tasks/${taskId}`);
  }

  create(projectId: number, data: Partial<Task>): Observable<Task> {
    return this.api.post<Task>(`/projects/${projectId}/tasks`, data);
  }

  update(projectId: number, taskId: number, data: Partial<Task>): Observable<Task> {
    return this.api.put<Task>(`/projects/${projectId}/tasks/${taskId}`, data);
  }

  updateStatus(projectId: number, taskId: number, status: string): Observable<Task> {
    return this.api.patch<Task>(`/projects/${projectId}/tasks/${taskId}/status`, { status });
  }

  delete(projectId: number, taskId: number): Observable<void> {
    return this.api.delete<void>(`/projects/${projectId}/tasks/${taskId}`);
  }

  addComment(projectId: number, taskId: number, contentMd: string): Observable<any> {
    return this.api.post<any>(`/projects/${projectId}/tasks/${taskId}/comments`, { contentMd });
  }
}
