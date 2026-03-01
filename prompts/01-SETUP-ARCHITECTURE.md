# 01 — Project Setup & Architecture

## Prompt for AI Code Generation

```
You are setting up a full-stack project management application called "DevSync".

TECH STACK (non-negotiable):
- Frontend: Angular 17 (standalone components), PrimeNG 17, PrimeFlex, npm
- Backend: Java 21, Spring Boot 3.2, Maven
- Database: MySQL 8
- Auth: Spring Security + JWT (jjwt 0.12)
- ORM: Spring Data JPA / Hibernate

FRONTEND SETUP TASKS:
1. Generate Angular 17 app: `ng new frontend --standalone --routing --style=scss`
2. Install PrimeNG: `npm install primeng primeicons primeflex @angular/cdk`
3. Install markdown libs: `npm install marked dompurify mermaid highlight.js`
4. Install HTTP: `npm install @angular/common` (already included)
5. Configure angular.json to include PrimeNG CSS:
   - "node_modules/primeng/resources/themes/lara-dark-blue/theme.css"
   - "node_modules/primeng/resources/primeng.min.css"
   - "node_modules/primeicons/primeicons.css"
   - "node_modules/primeflex/primeflex.css"
6. Set up environments: environment.ts and environment.prod.ts with apiUrl
7. Create app.config.ts with provideHttpClient(withInterceptors([authInterceptor]))

BACKEND SETUP TASKS:
1. Initialize Spring Boot project via Spring Initializr with:
   - Spring Web
   - Spring Data JPA
   - Spring Security
   - MySQL Driver
   - Flyway Migration
   - Lombok
   - Spring Boot Validation
   - Spring Boot Actuator
2. Set application.yml with MySQL datasource, JPA settings, JWT secret
3. Enable CORS for http://localhost:4200

APPLICATION ARCHITECTURE:
- Frontend: feature-based module structure (lazy loaded routes)
- Backend: layered architecture (Controller → Service → Repository → Entity)
- REST API: /api/v1/* 
- JWT tokens in Authorization: Bearer <token> header
- Refresh token stored in httpOnly cookie

OUTPUT: 
- Complete package.json for frontend
- Complete pom.xml for backend
- application.yml for backend
- app.config.ts for Angular
- app.routes.ts for Angular routing (lazy loaded)
- main layout component with PrimeNG Sidebar + Toolbar
```

---

## Angular app.routes.ts (Lazy Loaded)

```typescript
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./modules/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES)
      },
      {
        path: 'projects',
        loadChildren: () =>
          import('./modules/projects/projects.routes').then(m => m.PROJECTS_ROUTES)
      },
      {
        path: 'tasks',
        loadChildren: () =>
          import('./modules/tasks/tasks.routes').then(m => m.TASKS_ROUTES)
      },
      {
        path: 'wiki',
        loadChildren: () =>
          import('./modules/wiki/wiki.routes').then(m => m.WIKI_ROUTES)
      },
      {
        path: 'commits',
        loadChildren: () =>
          import('./modules/commits/commits.routes').then(m => m.COMMITS_ROUTES)
      },
      {
        path: 'team',
        loadChildren: () =>
          import('./modules/team/team.routes').then(m => m.TEAM_ROUTES)
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./modules/settings/settings.routes').then(m => m.SETTINGS_ROUTES)
      }
    ]
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./modules/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  { path: '**', redirectTo: 'dashboard' }
];
```

---

## application.yml (Spring Boot)

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/devapp?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
    username: root
    password: root
    driver-class-name: com.mysql.cj.jdbc.Driver
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
    properties:
      hibernate:
        format_sql: true
        dialect: org.hibernate.dialect.MySQL8Dialect
  flyway:
    enabled: true
    locations: classpath:db/migration
  mvc:
    cors:
      allowed-origins: "http://localhost:4200"
      allowed-methods: "GET,POST,PUT,DELETE,PATCH,OPTIONS"
      allowed-headers: "*"

application:
  jwt:
    secret: ${JWT_SECRET:devapp-super-secret-key-change-in-production-256bits}
    expiration: 86400000        # 24 hours
    refresh-expiration: 604800000  # 7 days

logging:
  level:
    com.devapp: DEBUG
```

---

## pom.xml (Spring Boot 3)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.3</version>
  </parent>
  <groupId>com.devapp</groupId>
  <artifactId>project-management-backend</artifactId>
  <version>1.0.0</version>
  <packaging>jar</packaging>

  <properties>
    <java.version>21</java.version>
    <jjwt.version>0.12.3</jjwt.version>
  </properties>

  <dependencies>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-security</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-validation</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-actuator</artifactId></dependency>
    <dependency><groupId>com.mysql</groupId><artifactId>mysql-connector-j</artifactId><scope>runtime</scope></dependency>
    <dependency><groupId>org.flywaydb</groupId><artifactId>flyway-mysql</artifactId></dependency>
    <dependency><groupId>org.projectlombok</groupId><artifactId>lombok</artifactId><optional>true</optional></dependency>
    <dependency><groupId>io.jsonwebtoken</groupId><artifactId>jjwt-api</artifactId><version>${jjwt.version}</version></dependency>
    <dependency><groupId>io.jsonwebtoken</groupId><artifactId>jjwt-impl</artifactId><version>${jjwt.version}</version><scope>runtime</scope></dependency>
    <dependency><groupId>io.jsonwebtoken</groupId><artifactId>jjwt-jackson</artifactId><version>${jjwt.version}</version><scope>runtime</scope></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-test</artifactId><scope>test</scope></dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin><groupId>org.springframework.boot</groupId><artifactId>spring-boot-maven-plugin</artifactId></plugin>
    </plugins>
  </build>
</project>
```

---

## package.json (Angular Frontend)

```json
{
  "name": "devapp-frontend",
  "version": "1.0.0",
  "scripts": {
    "start": "ng serve --proxy-config proxy.conf.json",
    "build": "ng build --configuration production",
    "test": "ng test",
    "lint": "ng lint"
  },
  "dependencies": {
    "@angular/animations": "^17.3.0",
    "@angular/cdk": "^17.3.0",
    "@angular/common": "^17.3.0",
    "@angular/compiler": "^17.3.0",
    "@angular/core": "^17.3.0",
    "@angular/forms": "^17.3.0",
    "@angular/platform-browser": "^17.3.0",
    "@angular/platform-browser-dynamic": "^17.3.0",
    "@angular/router": "^17.3.0",
    "dompurify": "^3.1.0",
    "highlight.js": "^11.9.0",
    "marked": "^12.0.0",
    "mermaid": "^11.0.0",
    "primeicons": "^7.0.0",
    "primeng": "^17.18.0",
    "primeflex": "^3.3.1",
    "rxjs": "~7.8.0",
    "tslib": "^2.6.0",
    "zone.js": "~0.14.4"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^17.3.0",
    "@angular/cli": "^17.3.0",
    "@types/dompurify": "^3.0.5",
    "@types/marked": "^6.0.0",
    "typescript": "~5.4.2"
  }
}
```
