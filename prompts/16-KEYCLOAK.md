# 16 — Keycloak 24: SSO / OIDC Identity Provider

> **Open-source:** `quay.io/keycloak/keycloak:24.0` (Apache 2.0)  
> **Replaces:** manual JWT generation in AuthController  
> **Provides:** OAuth2 / OIDC, social login, RBAC, token introspection, user federation

---

## Architecture: How Keycloak Fits In

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser / Angular                        │
│                                                                  │
│  1. User clicks "Login"                                          │
│  2. Angular redirects → Keycloak login page (port 8180)         │
│  3. Keycloak authenticates → returns OIDC tokens                 │
│  4. Angular stores access_token (memory) + refresh_token (cookie)│
│  5. Angular sends Authorization: Bearer <access_token> → Backend │
│  6. Backend validates token against Keycloak JWKS endpoint       │
│  7. Keycloak realm roles → Spring Security authorities           │
└─────────────────────────────────────────────────────────────────┘

Keycloak Realm:  devapp
Clients:
  - devapp-frontend  (public, browser flows, PKCE)
  - devapp-backend   (confidential, service account, token introspection)
  - apiman           (confidential, used by Apiman gateway)

Roles:
  - realm_admin   → maps to SUPER_ADMIN
  - project_admin → maps to ADMIN
  - developer     → maps to DEV
  - viewer        → maps to VIEWER
```

---

## Prompt for AI Code Generation

```
Integrate Keycloak 24 as the OIDC identity provider for DevSync.

PART A — Keycloak Realm Config (infra/keycloak/devapp-realm.json):
1. Realm name: devapp
2. Clients:
   a) devapp-frontend: publicClient=true, standardFlow=true, PKCE required,
      redirectUris=["http://localhost/*","http://frontend/*"],
      webOrigins=["http://localhost:4200","http://frontend"]
   b) devapp-backend: publicClient=false, serviceAccountsEnabled=true,
      clientAuthenticatorType=client-secret
   c) apiman: publicClient=false, serviceAccountsEnabled=true
3. Realm roles: realm_admin, project_admin, developer, viewer
4. Password policy: min 8 chars, 1 uppercase, 1 digit
5. Brute force protection: enabled, 5 failures, 30s lockout
6. Access token lifespan: 15 minutes
7. Refresh token lifespan: 7 days

PART B — Spring Boot Integration (spring-boot-starter-oauth2-resource-server):
1. Add to pom.xml: spring-boot-starter-oauth2-resource-server
2. application.yml: configure spring.security.oauth2.resourceserver.jwt.issuer-uri
3. SecurityConfig.java: replace JWT filter with .oauth2ResourceServer(oauth2 -> oauth2.jwt(...))
4. KeycloakRoleConverter.java: extract realm_access.roles from JWT claims → GrantedAuthority list
5. Update @PreAuthorize to use Keycloak roles: @PreAuthorize("hasRole('developer')")
6. UserSyncService: on first login, auto-create User record in MySQL from Keycloak token claims
   (listen to Spring Security authentication events)

PART C — Angular Integration (keycloak-angular + keycloak-js):
1. npm install keycloak-js keycloak-angular
2. KeycloakService initialization in APP_INITIALIZER
3. AuthGuard using KeycloakAuthGuard (replaces existing authGuard)
4. HTTP interceptor: KeycloakBearerInterceptor (from keycloak-angular)
5. AuthService: wrap KeycloakService, expose currentUser() from token claims
6. Login/Logout: delegate to keycloak.login() / keycloak.logout()
7. Silent refresh: use keycloak checkLoginIframe or token refresh on 401
```

---

## `infra/keycloak/devapp-realm.json`

```json
{
  "realm": "devapp",
  "enabled": true,
  "displayName": "DevSync",
  "displayNameHtml": "<b>DevSync</b> Project Management",
  "registrationAllowed": true,
  "registrationEmailAsUsername": false,
  "rememberMe": true,
  "verifyEmail": false,
  "resetPasswordAllowed": true,
  "editUsernameAllowed": false,
  "bruteForceProtected": true,
  "failureFactor": 5,
  "waitIncrementSeconds": 30,
  "accessTokenLifespan": 900,
  "ssoSessionMaxLifespan": 604800,
  "passwordPolicy": "length(8) and upperCase(1) and digits(1)",

  "roles": {
    "realm": [
      { "name": "realm_admin",    "description": "Super administrator" },
      { "name": "project_admin",  "description": "Project administrator" },
      { "name": "developer",      "description": "Developer / team member" },
      { "name": "viewer",         "description": "Read-only viewer" }
    ]
  },

  "defaultRoles": ["developer"],

  "clients": [
    {
      "clientId": "devapp-frontend",
      "name": "DevSync Frontend",
      "enabled": true,
      "publicClient": true,
      "standardFlowEnabled": true,
      "implicitFlowEnabled": false,
      "directAccessGrantsEnabled": false,
      "attributes": {
        "pkce.code.challenge.method": "S256"
      },
      "redirectUris": [
        "http://localhost/*",
        "http://localhost:4200/*",
        "http://frontend/*"
      ],
      "webOrigins": [
        "http://localhost:4200",
        "http://frontend"
      ],
      "protocol": "openid-connect"
    },
    {
      "clientId": "devapp-backend",
      "name": "DevSync Backend",
      "enabled": true,
      "publicClient": false,
      "serviceAccountsEnabled": true,
      "standardFlowEnabled": false,
      "directAccessGrantsEnabled": false,
      "clientAuthenticatorType": "client-secret",
      "protocol": "openid-connect"
    },
    {
      "clientId": "apiman",
      "name": "Apiman Gateway",
      "enabled": true,
      "publicClient": false,
      "serviceAccountsEnabled": true,
      "standardFlowEnabled": false,
      "clientAuthenticatorType": "client-secret",
      "protocol": "openid-connect"
    }
  ],

  "users": [
    {
      "username": "admin",
      "email": "admin@devapp.local",
      "enabled": true,
      "emailVerified": true,
      "firstName": "Admin",
      "lastName": "User",
      "credentials": [{ "type": "password", "value": "Admin1234!", "temporary": false }],
      "realmRoles": ["realm_admin", "developer"]
    }
  ]
}
```

---

## `pom.xml` additions (Keycloak adapter)

```xml
<!-- OAuth2 Resource Server (replaces manual JWT) -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>
<!-- Remove: jjwt-api, jjwt-impl, jjwt-jackson (no longer needed) -->
```

---

## `application.yml` additions

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: http://keycloak:8080/realms/devapp
          # For local dev without docker:
          # issuer-uri: http://localhost:8180/realms/devapp

keycloak:
  realm:  ${KEYCLOAK_REALM:devapp}
  auth-server-url: ${KEYCLOAK_AUTH_SERVER_URL:http://localhost:8180}
  client-id: ${KEYCLOAK_CLIENT_ID:devapp-backend}
  client-secret: ${KEYCLOAK_CLIENT_SECRET}
```

---

## `KeycloakRoleConverter.java`

```java
package com.devapp.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Extracts Keycloak realm roles from the JWT claim "realm_access.roles"
 * and converts them to Spring Security GrantedAuthority objects.
 */
public class KeycloakRoleConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

    @Override
    @SuppressWarnings("unchecked")
    public Collection<GrantedAuthority> convert(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess == null || !realmAccess.containsKey("roles")) {
            return Collections.emptyList();
        }
        List<String> roles = (List<String>) realmAccess.get("roles");
        return roles.stream()
            .filter(role -> !role.startsWith("default-roles") && !role.startsWith("offline"))
            .map(role -> new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
            .collect(Collectors.toList());
    }
}
```

---

## `SecurityConfig.java` (updated for Keycloak)

```java
package com.devapp.config;

import com.devapp.security.KeycloakRoleConverter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import java.util.List;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(req -> {
                var config = new CorsConfiguration();
                config.setAllowedOrigins(List.of(
                    "http://localhost:4200",
                    "http://localhost",
                    "http://frontend"
                ));
                config.setAllowedMethods(List.of("GET","POST","PUT","DELETE","PATCH","OPTIONS"));
                config.setAllowedHeaders(List.of("*"));
                config.setAllowCredentials(true);
                return config;
            }))
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/api/v1/webhooks/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
            );
        return http.build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        var converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(new KeycloakRoleConverter());
        return converter;
    }
}
```

---

## `UserSyncService.java` (auto-create user on first login)

```java
package com.devapp.service;

import com.devapp.model.User;
import com.devapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.security.authentication.event.AuthenticationSuccessEvent;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserSyncService {

    private final UserRepository userRepo;

    @EventListener
    @Transactional
    public void onAuthentication(AuthenticationSuccessEvent event) {
        if (!(event.getAuthentication() instanceof JwtAuthenticationToken jwtAuth)) return;

        var jwt = jwtAuth.getToken();
        String sub      = jwt.getSubject();            // Keycloak user ID
        String email    = jwt.getClaimAsString("email");
        String username = jwt.getClaimAsString("preferred_username");
        String fullName = jwt.getClaimAsString("name");

        userRepo.findByEmail(email).orElseGet(() -> {
            log.info("First login — creating user record for {}", email);
            return userRepo.save(User.builder()
                .username(username)
                .email(email)
                .fullName(fullName != null ? fullName : username)
                .passwordHash("[KEYCLOAK]")   // not used — auth is via Keycloak
                .isActive(true)
                .build());
        });
    }
}
```

---

## Angular: `app.config.ts` (Keycloak init)

```typescript
import { APP_INITIALIZER, ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { KeycloakAngularModule, KeycloakService } from 'keycloak-angular';
import { routes } from './app.routes';
import { environment } from '../environments/environment';

function initKeycloak(keycloak: KeycloakService) {
  return () =>
    keycloak.init({
      config: {
        url:      environment.keycloakUrl,
        realm:    environment.keycloakRealm,
        clientId: environment.keycloakClientId
      },
      initOptions: {
        onLoad:              'check-sso',
        silentCheckSsoRedirectUri: window.location.origin + '/assets/silent-check-sso.html',
        pkceMethod:          'S256',
        checkLoginIframe:    false
      },
      loadUserProfileAtStartUp: true
    });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    importProvidersFrom(KeycloakAngularModule),
    {
      provide:    APP_INITIALIZER,
      useFactory: initKeycloak,
      deps:       [KeycloakService],
      multi:      true
    }
  ]
};
```

---

## `assets/silent-check-sso.html`

```html
<!DOCTYPE html>
<html>
  <body>
    <script>parent.postMessage(location.href, location.origin);</script>
  </body>
</html>
```

---

## Angular `AuthService` (wraps KeycloakService)

```typescript
import { Injectable, signal, computed, inject } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { KeycloakProfile } from 'keycloak-js';

export interface DevAppUser {
  id: string; username: string; email: string;
  fullName: string; roles: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private kc = inject(KeycloakService);

  private _user = signal<DevAppUser | null>(null);

  readonly isAuthenticated = computed(() => !!this._user());
  readonly currentUser     = computed(() => this._user());

  async loadUserProfile(): Promise<void> {
    if (!this.kc.isLoggedIn()) return;
    const profile: KeycloakProfile = await this.kc.loadUserProfile();
    const roles = this.kc.getUserRoles(true);
    this._user.set({
      id:       profile.id || '',
      username: profile.username || '',
      email:    profile.email || '',
      fullName: `${profile.firstName} ${profile.lastName}`.trim(),
      roles
    });
  }

  login()  { this.kc.login({ redirectUri: window.location.origin + '/dashboard' }); }
  logout() { this.kc.logout({ redirectUri: window.location.origin }); }

  hasRole(role: string): boolean {
    return this.kc.isUserInRole(role);
  }

  getToken(): Promise<string> {
    return this.kc.getToken();
  }
}
```

---

## npm install

```bash
cd frontend
npm install keycloak-js@24.0.4 keycloak-angular@16.0.1
```

---

## environment.ts additions

```typescript
export const environment = {
  production: false,
  apiUrl:          'http://localhost:8080/api/v1',
  keycloakUrl:     'http://localhost:8180',
  keycloakRealm:   'devapp',
  keycloakClientId:'devapp-frontend'
};
```
