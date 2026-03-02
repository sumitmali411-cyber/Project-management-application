import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { KeycloakService } from './keycloak.service';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = environment.apiUrl;

  private _token = signal<string | null>(localStorage.getItem('token'));
  private _user = signal<AuthUser | null>(
    JSON.parse(localStorage.getItem('user') || 'null')
  );

  readonly isAuthenticated = computed(() => !!this._token());
  readonly currentUser = computed(() => this._user());
  readonly token = computed(() => this._token());

  constructor(
    private http: HttpClient,
    private router: Router,
    private kc: KeycloakService
  ) {}

  /** Called from APP_INITIALIZER after Keycloak init — syncs KC user into signals */
  syncFromKeycloak(): void {
    if (!this.kc.isAvailable || !this.kc.isAuthenticated) return;
    const user: AuthUser = {
      id: 0,
      username: this.kc.getUsername(),
      email: this.kc.getEmail(),
      fullName: this.kc.getUserFullName() || this.kc.getUsername(),
      role: this.kc.getRoles().find(r => ['ADMIN', 'PM', 'DEV', 'VIEWER'].includes(r)) ?? 'DEV'
    };
    this._token.set('keycloak-sso');
    this._user.set(user);
  }

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
    if (this.kc.isAvailable) {
      this.kc.logout();
    } else {
      this.router.navigate(['/auth/login']);
    }
  }

  private storeAuth(data: AuthResponse) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    this._token.set(data.token);
    this._user.set(data.user);
  }
}
