import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Project {
  id: number;
  name: string;
  slug: string;
  description?: string;
  status: string;
  color: string;
  icon: string;
  owner: any;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  constructor(private api: ApiService) {}

  getAll(): Observable<any> {
    return this.api.get<any>('/projects');
  }

  getById(id: number): Observable<Project> {
    return this.api.get<Project>(`/projects/${id}`);
  }

  create(data: Partial<Project>): Observable<Project> {
    return this.api.post<Project>('/projects', data);
  }

  update(id: number, data: Partial<Project>): Observable<Project> {
    return this.api.put<Project>(`/projects/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/projects/${id}`);
  }

  getMembers(id: number): Observable<any[]> {
    return this.api.get<any[]>(`/projects/${id}/members`);
  }

  addMember(id: number, data: { email: string; role: string }): Observable<void> {
    return this.api.post<void>(`/projects/${id}/members`, data);
  }
}
