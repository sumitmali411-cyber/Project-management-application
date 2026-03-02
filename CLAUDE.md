# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DevSync** — an all-in-one project management and collaboration platform (Angular 17 + Spring Boot 3 + MySQL 8). Inspired by Linear, Confluence, and task-commit-hub. Currently in the blueprint/scaffolding phase; all architecture is defined in `prompts/` but no source code exists yet.

UI design reference: `devapp-ui-demo.html` (open in browser — match this design exactly).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 17+ (standalone components), PrimeNG 17+, PrimeFlex, npm |
| Backend | Java 21, Spring Boot 3.2, Maven (`./mvnw`) |
| Database | MySQL 8, Flyway migrations |
| ORM | Spring Data JPA / Hibernate, Lombok |
| Auth | Spring Security 6 + JWT (jjwt 0.12.3) |
| Infra (v2) | Docker, Keycloak 24, Apiman 3.1, Kubernetes 1.29 |

## Development Commands

```bash
# Frontend (once frontend/ exists)
cd frontend
npm install
npm start          # http://localhost:4200
npm run build
npm test
npm run lint

# Backend (once backend/ exists)
cd backend
./mvnw spring-boot:run   # http://localhost:8080
./mvnw test
./mvnw clean install

# MySQL via Docker
docker run -d --name devapp-mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=devapp \
  -p 3306:3306 mysql:8

# Full stack (v2, once docker-compose.yml exists)
docker-compose up -d
```

## Intended Directory Structure

```
project-management-app/
├── frontend/src/app/
│   ├── core/              # Guards, interceptors, auth service
│   ├── shared/            # Reusable PrimeNG components
│   ├── layout/            # Sidebar, topbar, breadcrumb
│   └── modules/           # dashboard/, projects/, tasks/, wiki/, commits/, team/, settings/
├── backend/src/main/java/com/devapp/
│   ├── config/            # Security, CORS, JPA, Pageable
│   ├── controller/        # REST controllers
│   ├── service/           # Business logic (CQRS: *CommandService + *QueryService)
│   ├── repository/        # JPA repos extending BaseRepository<T>
│   ├── model/             # JPA entities extending BaseEntity
│   ├── dto/               # Request/Response DTOs
│   ├── security/          # JWT filter, UserDetailsService
│   └── exception/         # GlobalExceptionHandler
└── backend/src/main/resources/
    ├── application.yml
    └── db/migration/      # Flyway SQL (V1__initial_schema.sql, V2__...)
```

## Architecture & Key Patterns

Read `prompts/` files in order (00 → 23) to understand the full design. Critical patterns from `prompts/23-AUDIT-FIXES-PATTERNS-CLAUDECODE.md`:

### Backend Patterns
- **CQRS**: Every feature has `*CommandService` (writes, `@Transactional`) and `*QueryService` (reads, `@Transactional(readOnly=true)`, `@Cacheable`). Controllers use both; never mix in one service.
- **Strategy (Wiki)**: `WikiRenderer` interface → `MarkdownRenderer` + `ConfluenceRenderer`, dispatched by `WikiRendererFactory`.
- **Factory (Tasks)**: `TaskCreationStrategy` per task type (BUG, EPIC, STORY, TASK), collected by `TaskFactory`.
- **Saga**: `ProjectCreationSaga` wraps project + member + wiki-home creation in a single `@Transactional`.
- **Observer**: Sealed `DomainEvent` hierarchy + `@Async @EventListener` handlers for notifications, audit, activity feed.
- **Circuit Breaker**: Resilience4j on Keycloak, Apiman, and MySQL calls with fallbacks.
- **Base Repository**: All repos extend `BaseRepository<T extends BaseEntity>` (soft-delete-aware methods, no duplication).

### Backend API Conventions
- Base path: `/api/v1`
- All responses wrapped in `ApiResponse<T>`
- Soft deletes: all entities have `is_deleted` + `@Where(clause="is_deleted=0")` + `@Version` for optimistic locking
- All entities extend `BaseEntity` (id, createdAt, updatedAt, isDeleted, version)
- Role hierarchy for `@PreAuthorize`: `ADMIN > PM > DEV > VIEWER`, enforced via `@projectAccessGuard` bean

### Frontend Patterns
- All components are standalone (no NgModules)
- Angular Signals for reactive state
- Two HTTP interceptors: `authInterceptor` (JWT injection) + `errorInterceptor` (401/403 handling)
- Lazy-loaded routes per feature module

## Security Non-Negotiables

These are critical and must be implemented correctly (from prompt 23):

- **CORS**: Never hardcode origins — read from `@Value("${app.cors.allowed-origins}")` in `SecurityConfig`
- **Rate limiting**: Dual-layer — Bucket4j `RateLimitFilter` in-app (100 req/min) + Apiman at gateway (30 req/min for webhooks)
- **Webhook**: Must validate `X-Hub-Signature-256` HMAC-SHA256 + idempotency check via `WebhookIdempotencyStore`
- **JWT secret**: `JwtStartupValidator` must enforce 32+ character minimum at startup
- **Pagination**: `PageableHandlerMethodArgumentResolver.setMaxPageSize(100)` — no unbounded queries
- **Soft delete**: Every delete service method must be `@Transactional` + rely on `@Version` optimistic lock
- **Audit trail**: `AuditService.log()` (async, independent TX) on: role changes, project delete, member remove, wiki delete, API key operations, user deactivation
- **MySQL**: Backend app uses a least-privilege `devapp` DB user; Flyway uses root only during migrations
- **K8s pods**: `automountServiceAccountToken: false`, `readOnlyRootFilesystem: true`, `runAsNonRoot: true`

## Sub-repos to Integrate into Wiki Module

```bash
# Port to frontend/src/app/modules/wiki/
git clone https://github.com/sumitmali411-cyber/vonfluence-wiki-markdown-chalks
# confluenceParser.js → wiki.service.ts (ConfluenceParserService)
# mermaidLoader.js   → mermaid.service.ts
# styles.css         → wiki.component.scss

git clone https://github.com/sumitmali411-cyber/markdown-previewer-mermaid
# app.js logic       → markdown-preview.component.ts
# mermaidLoader.js   → shared mermaid.service.ts
```

## Design System

- **Theme**: PrimeNG `lara-dark-blue`
- **Background**: `#0A0F1E` (dark navy), Card: `#111827`
- **Accent**: `#6366F1` (Electric Indigo)
- **Fonts**: DM Sans (UI text), IBM Plex Mono (IDs, code, technical data)
- **Borders**: `1px solid rgba(255,255,255,0.08)`, max radius 8px
- **Transitions**: 120ms ease-out (micro-interactions), 200ms (panels)
- **Status colors**: backlog=gray, todo=blue, in_progress=amber, in_review=purple, done=green
- **Priority colors**: critical=red, high=amber, medium=blue, low=green

See `prompts/21-DESIGN-SYSTEM.md` for full token reference and `devapp-ui-demo.html` as the pixel-perfect reference.

## Prompt File Index

| File | Content |
|------|---------|
| `prompts/00-MASTER-PROMPT-v2.md` | Master scaffold prompt (start here) |
| `prompts/01-SETUP-ARCHITECTURE.md` | Project setup & folder structure |
| `prompts/02-DATABASE-SCHEMA.md` | MySQL schema + Flyway V1 migration |
| `prompts/03-BACKEND-CORE.md` | JPA entities, repos, security config |
| `prompts/04-BACKEND-APIS.md` | REST controllers + all endpoints |
| `prompts/05-FRONTEND-SETUP.md` | Angular services, interceptors, layout |
| `prompts/07-10-DASHBOARD-TASKS-COMMITS.md` | Dashboard, task, commit modules |
| `prompts/09-WIKI-MARKDOWN.md` | Wiki + Mermaid + Confluence integration |
| `prompts/12-13-AUTH-THEMING.md` | Auth flow + design system theming |
| `prompts/15-DOCKER.md` | Docker + docker-compose |
| `prompts/16-KEYCLOAK.md` | Keycloak OIDC/SSO setup |
| `prompts/17-APIMAN.md` | API Manager / gateway |
| `prompts/18-KUBERNETES.md` | K8s manifests |
| `prompts/19-SOLUTION-ARCHITECT-BEST-PRACTICES.md` | Architectural patterns |
| `prompts/20-DEVELOPER-BEST-PRACTICES.md` | Code conventions |
| `prompts/21-DESIGN-SYSTEM.md` | Full design token reference |
| `prompts/22-SECURITY-DEVSECOPS.md` | Security hardening |
| `prompts/23-AUDIT-FIXES-PATTERNS-CLAUDECODE.md` | Audit fixes + all 6 design patterns |

## Secrets That Require Human Input

- Keycloak client secret: `openssl rand -base64 32`
- MySQL password (per environment)
- GitHub webhook secret (from GitHub repo settings)
- JWT secret (32+ chars, set as `JWT_SECRET` env var)
- Domain names in K8s ingress (replace `devapp.example.com`)

---

## Best Practices

### Spring Boot (DevSync-Specific)
- Constructor injection only — never `@Autowired` on fields
- CQRS strictly enforced: `*CommandService` (writes) + `*QueryService` (reads) — never mixed
- All entities extend `BaseEntity`; all repos extend `BaseRepository<T>`
- Soft delete via `is_deleted` flag + `@Where(clause="is_deleted=0")` + `@Version` optimistic lock
- DTOs for all API responses — never expose JPA entities directly
- All responses wrapped in `ApiResponse<T>`; pagination via `Pageable` (max 100)
- Domain events published for sensitive operations; handlers use `@Async @EventListener`
- Audit via `AuditService.log()` in independent transaction for: role changes, deletes, API key ops
- Circuit Breaker (Resilience4j) on all external calls (Keycloak, Apiman, MySQL)
- `server.shutdown=graceful` for K8s rolling updates

### Security Non-Negotiables
- CORS from `@Value("${app.cors.allowed-origins}")` — never hardcode `"*"`
- Rate limiting: dual-layer — Bucket4j in-app (100/min) + Apiman at gateway (30/min webhooks)
- Webhook: validate `X-Hub-Signature-256` HMAC-SHA256 + idempotency via `WebhookIdempotencyStore`
- JWT secret: `JwtStartupValidator` enforces ≥ 32 chars at startup (prevents weak secrets in prod)
- `@PreAuthorize` with role hierarchy: `ADMIN > PM > DEV > VIEWER` via `@projectAccessGuard` bean
- Audit trail on: role changes, project delete, member remove, wiki delete, API key ops, user deactivation
- MySQL app user (`devapp`) is least-privilege; Flyway root only for migrations

### Angular (DevSync-Specific)
- Standalone components only (no NgModules)
- Angular Signals for reactive local state
- Two interceptors: `authInterceptor` (JWT injection) + `errorInterceptor` (401/403 handling)
- Lazy-loaded routes per feature module
- Design tokens from `prompts/21-DESIGN-SYSTEM.md` — match `devapp-ui-demo.html` exactly
- Theme: `lara-dark-blue`, background `#0A0F1E`, accent `#6366F1`

### Docker / Kubernetes
- K8s: `command:` overrides ENTRYPOINT; use `args:` for subcommands (critical for Keycloak)
- K8s pod security: `runAsNonRoot: true`, `readOnlyRootFilesystem: true`, `automountServiceAccountToken: false`
- Secrets in K8s `Secret` objects, never `ConfigMap`
- Resource limits on all containers (prevents OOM eviction)
- HPA: CPU 70%, memory 80%, min 2 replicas for stateless services
- Liveness + readiness probes on every Deployment

### Keycloak
- Backend uses `spring.security.oauth2.resourceserver.jwt.issuer-uri` (not manual JWT parsing)
- Frontend: `auth.interceptor.ts` adds Bearer token; `error.interceptor.ts` handles 401 logout
- Keycloak realm configured via REST API in startup scripts (not manual console clicks)

---

## Quick Start (Local Dev)

```bash
# Backend
cd backend
./mvnw spring-boot:run        # port 9090

# Frontend
cd frontend
npm start                      # port 4300

# Full stack with Docker
docker-compose up -d

# Health check
curl http://localhost:9090/actuator/health | jq .status
```

---

## Available Slash Commands (this project)

| Command | Purpose |
|---------|---------|
| `/start-devapp` | Start DevSync backend + frontend |
| `/health-devapp` | Health check for DevSync services |
| `/review-devapp` | DevSync-specific code review (CQRS, patterns, security) |

## Global Slash Commands

| Command | Purpose |
|---------|---------|
| `/architect` | Full architectural review |
| `/review` | Generic code review (OWASP + Spring + Angular) |
| `/angular-check` | Angular best practices audit |
| `/spring-check` | Spring Boot best practices audit |
| `/docker-check` | Docker/K8s configuration audit |
| `/keycloak-check` | Keycloak setup verification |
| `/security-audit` | OWASP Top 10 security audit |
| `/server-check` | Check which services are running |
