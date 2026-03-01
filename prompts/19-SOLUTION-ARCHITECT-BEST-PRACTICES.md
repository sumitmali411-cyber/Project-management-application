# 19 — Solution Architect Best Practices

> Applies across: Spring Boot · Angular · MySQL · Keycloak · Apiman · Docker · Kubernetes  
> Grounded in: Clean Architecture · DDD tactical patterns · OWASP Top 10 · 12-Factor App

---

## 1. Architecture Decision Records (ADRs)

Every significant technical choice gets a short ADR in `docs/adr/`.  
Teams that skip this spend months re-litigating decisions that were already made.

```
docs/adr/
├── 001-angular-primeng-over-material.md
├── 002-keycloak-over-custom-jwt.md
├── 003-apiman-over-spring-cloud-gateway.md
├── 004-mysql-over-postgres.md
└── 005-flyway-over-liquibase.md
```

**ADR Template** (`docs/adr/000-template.md`):

```markdown
# ADR-{N}: {Title}

**Status:** Proposed | Accepted | Deprecated | Superseded  
**Date:** YYYY-MM-DD  
**Deciders:** {names}

## Context
What problem are we solving? What forces are at play?

## Decision
What did we decide?

## Rationale
Why this option over alternatives? Trade-offs accepted.

## Consequences
- ✅ Good: ...
- ⚠️ Neutral: ...
- ❌ Bad: ...

## Alternatives Considered
| Option | Rejected because |
|--------|-----------------|
| ...    | ...             |
```

---

## 2. Layered Architecture (Backend)

```
┌──────────────────────────────────────────────────────────────┐
│  REST / HTTP Layer  (Controllers, DTOs, Validators)          │
│  Rule: NO business logic here. Map ↔ DTOs only.              │
├──────────────────────────────────────────────────────────────┤
│  Application Layer  (Services, Use Cases)                    │
│  Rule: Orchestrates domain logic. No DB queries directly.    │
├──────────────────────────────────────────────────────────────┤
│  Domain Layer  (Entities, Value Objects, Domain Events)      │
│  Rule: Pure Java. Zero Spring annotations. Fully testable.   │
├──────────────────────────────────────────────────────────────┤
│  Infrastructure Layer  (Repositories, JPA, Keycloak, Email)  │
│  Rule: Implements domain interfaces. Swappable.              │
└──────────────────────────────────────────────────────────────┘
```

**Dependency Rule:** outer layers depend on inner layers — never the reverse.  
A `Service` may call a `Repository` interface. A `Repository` must never call a `Service`.

---

## 3. Domain Events (Decouple Modules)

Instead of services calling each other directly (tight coupling), publish domain events.

```java
// Domain event — pure POJO, no Spring dependency
public record TaskStatusChangedEvent(
    Long taskId, String oldStatus, String newStatus,
    Long changedByUserId, Instant occurredAt
) {}

// In TaskService — publish the event
@Service
@RequiredArgsConstructor
public class TaskService {
    private final ApplicationEventPublisher events;

    @Transactional
    public TaskDto updateStatus(Long taskId, String newStatus) {
        Task task = taskRepo.findById(taskId).orElseThrow();
        String old = task.getStatus().name();
        task.setStatus(Task.TaskStatus.valueOf(newStatus));
        taskRepo.save(task);

        // ← publish; listeners handle their own concerns
        events.publishEvent(new TaskStatusChangedEvent(
            taskId, old, newStatus, currentUserId(), Instant.now()
        ));
        return mapper.toDto(task);
    }
}

// NotificationService listens — zero coupling to TaskService
@Component
public class TaskNotificationListener {
    @EventListener
    @Async
    public void onStatusChanged(TaskStatusChangedEvent event) {
        // Send notification to assignee
    }
}

// ActivityLogService listens independently
@Component
public class ActivityLogListener {
    @EventListener
    @Async
    public void onStatusChanged(TaskStatusChangedEvent event) {
        // Write activity log entry
    }
}
```

**Why:** Adding a new reaction (e.g. Slack notification, webhook) means adding a listener — zero changes to `TaskService`.

---

## 4. API Design Principles (REST)

```
✅  Consistent naming
GET    /api/v1/projects                     # list (paginated)
GET    /api/v1/projects/{id}                # single resource
POST   /api/v1/projects                     # create
PUT    /api/v1/projects/{id}                # full replace
PATCH  /api/v1/projects/{id}                # partial update
DELETE /api/v1/projects/{id}                # soft delete

✅  Sub-resource for relationships
GET    /api/v1/projects/{id}/tasks          # tasks for a project
POST   /api/v1/projects/{id}/tasks          # create task in project

✅  Actions as verbs on resource (when REST verbs don't fit)
POST   /api/v1/sprints/{id}/start           # action
POST   /api/v1/sprints/{id}/close
PATCH  /api/v1/tasks/{id}/status            # sub-field update

✅  Versioning in URL
/api/v1/...  →  /api/v2/...  (new major when breaking change)

❌  Never:
/api/getTasks      (RPC style)
/api/task_list     (snake_case)
/api/deleteTask/1  (verb in URL)
```

**Pagination contract** — every list endpoint returns:
```json
{
  "success": true,
  "data": {
    "content": [...],
    "page": 0,
    "size": 20,
    "totalElements": 142,
    "totalPages": 8,
    "first": true,
    "last": false
  }
}
```

**Error contract** — every error returns RFC 7807 Problem Detail:
```json
{
  "type":     "https://devapp.io/errors/validation",
  "title":    "Validation Failed",
  "status":   400,
  "detail":   "title: must not be blank; dueDate: must be future",
  "instance": "/api/v1/projects/42/tasks",
  "timestamp": "2025-03-01T10:15:30Z",
  "traceId":  "a1b2c3d4e5f6"
}
```

---

## 5. Security Architecture (Defense in Depth)

```
Layer 1: Network        — K8s NetworkPolicy, no direct DB exposure
Layer 2: Ingress        — TLS termination, rate limiting (ingress-nginx)
Layer 3: API Gateway    — Apiman: token validation, rate limit, IP blocklist
Layer 4: Auth           — Keycloak: OIDC, PKCE, short-lived tokens (15 min)
Layer 5: Application    — Spring Security: @PreAuthorize, method security
Layer 6: Data           — Encrypted at rest (MySQL), soft deletes, audit log
Layer 7: Secrets        — K8s Sealed Secrets, never in source control
```

**OWASP Top 10 — Where We Address Each:**

| OWASP Risk | Where Mitigated |
|-----------|----------------|
| A01 Broken Access Control | `@PreAuthorize` + project membership check in every service |
| A02 Cryptographic Failures | TLS everywhere, BCrypt passwords, Keycloak PKCE |
| A03 Injection | Spring Data JPA (parameterized), Bean Validation, no raw SQL |
| A05 Security Misconfiguration | SecurityConfig stateless, no defaults, actuator secured |
| A06 Vulnerable Components | Dependabot / OWASP dependency-check Maven plugin |
| A07 Auth Failures | Keycloak brute-force protection, short token TTL, refresh rotation |
| A09 Logging Failures | Structured logging + MDC trace IDs, no PII in logs |
| A10 SSRF | Webhook URL allowlist, no user-controlled URL fetching |

---

## 6. Observability Stack (All Open Source)

```
Metrics:   Spring Actuator → Prometheus → Grafana
Tracing:   Micrometer Tracing → Zipkin (or Tempo)
Logging:   Logback JSON → Loki → Grafana
Alerting:  Grafana Alerting → PagerDuty / Slack webhook
```

Add to `pom.xml`:
```xml
<dependency>
  <groupId>io.micrometer</groupId>
  <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
<dependency>
  <groupId>io.micrometer</groupId>
  <artifactId>micrometer-tracing-bridge-brave</artifactId>
</dependency>
<dependency>
  <groupId>io.zipkin.reporter2</groupId>
  <artifactId>zipkin-reporter-brave</artifactId>
</dependency>
```

Add to `application.yml`:
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus,metrics
  metrics:
    export:
      prometheus.enabled: true
  tracing:
    sampling:
      probability: 1.0   # 100% in dev; 0.1 (10%) in prod
```

---

## 7. Caching Strategy

```
L1 — Application cache (Caffeine, in-process):
     Project member lists, user lookups, tag lists
     TTL: 5 minutes, max 500 entries

L2 — Distributed cache (Redis, optional):
     Add when horizontal scaling causes L1 staleness problems
     Keycloak token validation results, search results

What NOT to cache:
     Task status (changes too frequently, stale = bugs)
     Wiki page content (needs versioning consistency)
     Notifications (must be real-time)
```

```java
@Configuration
@EnableCaching
public class CacheConfig {
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager mgr = new CaffeineCacheManager(
            "projectMembers", "userLookup", "tags"
        );
        mgr.setCaffeine(Caffeine.newBuilder()
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .maximumSize(500)
            .recordStats());
        return mgr;
    }
}

// Usage in service
@Cacheable(value = "projectMembers", key = "#projectId")
public List<MemberDto> getMembers(Long projectId) { ... }

@CacheEvict(value = "projectMembers", key = "#projectId")
public void addMember(Long projectId, AddMemberRequest req) { ... }
```

---

## 8. Feature Flags (Gradual Rollout)

Use a simple DB-backed feature flag — no new infra needed.

```sql
CREATE TABLE feature_flags (
    name        VARCHAR(100) PRIMARY KEY,
    enabled     TINYINT(1) NOT NULL DEFAULT 0,
    rollout_pct INT DEFAULT 100,
    description VARCHAR(500),
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO feature_flags VALUES
  ('wiki_confluence_parser', 0, 100, 'Confluence wiki markup in editor'),
  ('commit_auto_link',       1, 100, 'Auto-link commits from webhook messages'),
  ('sprint_ai_suggestions',  0,  10, '10% rollout — AI sprint planning suggestions');
```

```java
@Service
@RequiredArgsConstructor
public class FeatureFlagService {
    private final FeatureFlagRepository repo;

    public boolean isEnabled(String flagName) {
        return repo.findById(flagName)
            .map(FeatureFlag::isEnabled)
            .orElse(false);
    }
}
```

---

## 9. Database Best Practices

**Connection Pool (HikariCP defaults are too generous for containers):**
```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size:    10    # formula: (cores × 2) + effective_spindle_count
      minimum-idle:          2
      idle-timeout:       300000  # 5 min
      connection-timeout:  30000  # 30 sec — fail fast
      max-lifetime:      1800000  # 30 min (less than MySQL wait_timeout)
      leak-detection-threshold: 60000
```

**Index checklist** (add to Flyway V2+):
```sql
-- Every FK should have an index (MySQL doesn't auto-create on FK)
-- Composite indexes: (project_id, status) for Kanban queries
-- Covering indexes: tasks(project_id, status, assignee_id, due_date)

ALTER TABLE tasks ADD INDEX idx_task_board (project_id, status, sort_order);
ALTER TABLE tasks ADD INDEX idx_task_assignee_status (assignee_id, status);
ALTER TABLE wiki_pages ADD FULLTEXT INDEX ft_wiki_content (title, content_md);
ALTER TABLE commits ADD FULLTEXT INDEX ft_commits (message);
```

**Never use `SELECT *` in production queries:**
```java
// ❌ Bad — loads entire entity graph
List<Task> tasks = taskRepo.findByProjectId(projectId);

// ✅ Good — projection interface
interface TaskSummary {
    Long getId(); String getTitle(); String getStatus(); String getPriority();
    String getAssigneeFullName();
}
List<TaskSummary> tasks = taskRepo.findSummaryByProjectId(projectId);
```

---

## 10. Twelve-Factor App Compliance Checklist

| Factor | How DevSync Implements It |
|--------|--------------------------|
| I. Codebase | One repo, branches per environment via env vars |
| II. Dependencies | `pom.xml` + `package.json` — nothing assumed installed |
| III. Config | All secrets via env vars / K8s Secrets — zero in code |
| IV. Backing Services | MySQL, Keycloak, Apiman as attached resources via URL env vars |
| V. Build/Release/Run | Dockerfile multi-stage, K8s rolling deployments |
| VI. Processes | Stateless backend — sessions in Keycloak, no local files |
| VII. Port Binding | App binds its own port (8080) — no external web server |
| VIII. Concurrency | HPA scales backend pods horizontally |
| IX. Disposability | `SIGTERM` graceful shutdown, preStop sleep hook |
| X. Dev/Prod Parity | docker-compose mirrors K8s — same images, same config shape |
| XI. Logs | Stdout/stderr only — log aggregator collects (Loki) |
| XII. Admin Processes | Flyway runs at startup, bootstrap.sh as one-shot K8s Job |
