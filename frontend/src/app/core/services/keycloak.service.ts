import { Injectable } from '@angular/core';
import Keycloak from 'keycloak-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class KeycloakService {
  private keycloak = new Keycloak({
    url: environment.keycloak.url,
    realm: environment.keycloak.realm,
    clientId: environment.keycloak.clientId
  });

  isAvailable = false;

  get isAuthenticated(): boolean {
    return !!this.keycloak.authenticated;
  }

  async init(): Promise<void> {
    try {
      await this.keycloak.init({ onLoad: 'login-required', checkLoginIframe: false });
      this.isAvailable = true;
    } catch {
      console.warn('Keycloak unavailable — running without authentication');
    }
  }

  getToken(): Promise<string> {
    if (!this.isAvailable) return Promise.resolve('');
    return this.keycloak.updateToken(30).then(() => this.keycloak.token ?? '').catch(() => '');
  }

  login(): void {
    this.keycloak.login();
  }

  logout(): void {
    this.keycloak.logout({ redirectUri: 'http://localhost:4300' });
  }

  getUsername(): string {
    return this.keycloak.tokenParsed?.['preferred_username'] ?? '';
  }

  getUserFullName(): string {
    return this.keycloak.tokenParsed?.['name'] ?? this.getUsername();
  }

  getEmail(): string {
    return this.keycloak.tokenParsed?.['email'] ?? '';
  }

  getRoles(): string[] {
    return this.keycloak.realmAccess?.roles ?? [];
  }

  getInitials(): string {
    const name = this.getUserFullName();
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
