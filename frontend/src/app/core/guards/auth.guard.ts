import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { KeycloakService } from '../services/keycloak.service';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const kc = inject(KeycloakService);
  const auth = inject(AuthService);
  const router = inject(Router);

  // Keycloak is primary — if KC says authenticated, let through
  if (kc.isAvailable && kc.isAuthenticated) return true;

  // Fallback: own JWT (for when Keycloak is unavailable)
  if (auth.isAuthenticated()) return true;

  // Not authenticated
  if (kc.isAvailable) {
    kc.login();
  } else {
    router.navigate(['/auth/login']);
  }
  return false;
};
