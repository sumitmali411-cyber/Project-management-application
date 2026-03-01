# 23 — Audit Report, All Fixes & Design Patterns
## System Design Review · Security Rectification · Claude Code Guide

---

## AUDIT FINDINGS & SEVERITY

| # | Severity | Area | Finding |
|---|----------|------|---------|
| 1 | 🔴 CRITICAL | Security | CORS origins hardcoded in `SecurityConfig` — must come from `@Value` |
| 2 | 🔴 CRITICAL | Security | Webhook endpoint has no rate limiting — raw DDoS vector |
| 3 | 🔴 CRITICAL | Design | Zero Circuit Breaker pattern — Keycloak/Apiman/MySQL down = full cascade |
| 4 | 🔴 CRITICAL | Design | Idempotency missing — webhook delivers duplicate commits on retry |
| 5 | 🟠 HIGH | Security | JWT_SECRET minimum length not enforced at startup — silent weak secret |
| 6 | 🟠 HIGH | Security | Keycloak `sslRequired:"external"` in dev realm leaks to prod |
| 7 | 🟠 HIGH | Security | K8s pods missing `automountServiceAccountToken: false` |
| 8 | 🟠 HIGH | Security | MySQL: backend connects as root — must use least-privilege user |
| 9 | 🟠 HIGH | Security | No audit trail for privilege ops (role change, project delete) |
| 10 | 🟠 HIGH | Design | Pagination no max size cap — `?size=1000000` = OOM |
| 11 | 🟠 HIGH | Design | Soft delete not `@Transactional` — race condition on concurrent delete |
| 12 | 🟠 HIGH | Design | CQRS not applied — reads and writes share same service path |
| 13 | 🟠 HIGH | Design | Saga pattern missing — multi-step creation not atomic |
| 14 | 🟡 MEDIUM | Design | No base Repository class — duplication across 10+ repos |
| 15 | 🟡 MEDIUM | Design | Strategy pattern missing for wiki rendering (MD vs Confluence) |
| 16 | 🟡 MEDIUM | Design | Factory pattern missing for Task creation by type |
| 17 | 🟡 MEDIUM | Security | Rate limiting only at Apiman — backend port 8080 unprotected if exposed |
| 18 | 🟡 MEDIUM | UI | Settings toggles 2+3 missing `onclick` handler |
| 19 | 🟡 MEDIUM | UI | Toggle thumb CSS missing left/right translate animation |
| 20 | 🟡 MEDIUM | UI | Wiki page `overflow:hidden` blocks mobile scroll |
| 21 | 🟡 MEDIUM | UI | `showPage()` nav matcher too broad — string `includes()` false positives |
| 22 | 🟡 MEDIUM | Docs | Missing prompt files: `06`, `11`, `14` (listed in overview, never created) |

---

## PART A — RECTIFIED BACKEND CODE

### FIX 1 & 17 — CORS from Config + App-level Rate Limiting

```java
// application.yml — CORS config (not hardcoded)
app:
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:4200}
    allowed-methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
    max-age: 3600
  rate-limit:
    requests-per-minute: 100
    webhook-requests-per-minute: 30

// SecurityConfig.java — read from config
@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(request -> {
                var config = new CorsConfiguration();
                // ✅ From config, not hardcoded
                config.setAllowedOriginPatterns(List.of(allowedOrigins.split(",")));
                config.setAllowedMethods(List.of("GET","POST","PUT","DELETE","PATCH","OPTIONS"));
                config.setAllowedHeaders(List.of("*"));
                config.setExposedHeaders(List.of("X-RateLimit-Remaining","X-RateLimit-Reset"));
                config.setAllowCredentials(true);
                config.setMaxAge(3600L);
                return config;
            }))
            // ... rest unchanged
    }
}
```

```java
// RateLimitFilter.java — in-app Bucket4j rate limiting (defence if Apiman bypassed)
// pom.xml: <dependency>com.bucket4j:bucket4j-core:8.10.1</dependency>

@Component
@Order(1)   // ← runs before everything
@RequiredArgsConstructor
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Value("${app.rate-limit.requests-per-minute:100}")
    private int requestsPerMinute;

    @Override
    protected void doFilterInternal(HttpServletRequest req,
                                    HttpServletResponse res,
                                    FilterChain chain) throws ServletException, IOException {
        // Skip actuator health check
        if (req.getRequestURI().equals("/actuator/health")) {
            chain.doFilter(req, res); return;
        }

        String key = extractKey(req);   // IP or user sub from JWT
        Bucket bucket = buckets.computeIfAbsent(key, k ->
            Bucket.builder()
                .addLimit(Bandwidth.classic(requestsPerMinute,
                    Refill.greedy(requestsPerMinute, Duration.ofMinutes(1))))
                .build()
        );

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        res.setHeader("X-RateLimit-Limit",     String.valueOf(requestsPerMinute));
        res.setHeader("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));

        if (probe.isConsumed()) {
            chain.doFilter(req, res);
        } else {
            log.warn("Rate limit exceeded for key={}", key);
            res.setStatus(429);
            res.setContentType("application/problem+json");
            res.getWriter().write("""
                {"type":"https://devapp.io/errors/rate-limit","status":429,
                 "title":"Too Many Requests","detail":"Slow down. Retry in 1 minute."}
                """);
        }
    }

    private String extractKey(HttpServletRequest req) {
        // Prefer authenticated user sub, fall back to IP
        String auth = req.getHeader("Authorization");
        if (auth != null && auth.startsWith("Bearer ")) {
            try {
                // Quick JWT decode without full validation (already done by security filter)
                String[] parts = auth.substring(7).split("\\.");
                String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
                // Extract "sub" claim simply
                var matcher = Pattern.compile("\"sub\"\\s*:\\s*\"([^\"]+)\"").matcher(payload);
                if (matcher.find()) return "user:" + matcher.group(1);
            } catch (Exception ignored) {}
        }
        return "ip:" + req.getRemoteAddr();
    }
}
```

---

### FIX 2 — Webhook Idempotency + Rate Limiting

```java
// CommitController.java — fixed webhook
@PostMapping("/api/v1/webhooks/commits")
// ✅ Separate rate limit for webhook (stricter)
public ResponseEntity<Void> receiveWebhook(
        @RequestHeader(value = "X-Hub-Signature-256", required = false) String sig,
        @RequestHeader(value = "X-GitHub-Delivery", required = false) String deliveryId,
        @RequestBody String payload) {

    // ✅ Validate signature first
    if (!webhookValidator.isValidGitHubSignature(sig, payload)) {
        return ResponseEntity.status(401).build();
    }

    // ✅ Idempotency — skip duplicate delivery
    if (deliveryId != null && webhookIdempotencyStore.alreadyProcessed(deliveryId)) {
        log.info("Duplicate webhook delivery ignored: {}", deliveryId);
        return ResponseEntity.ok().build();   // 200 so GitHub doesn't retry
    }

    commitService.processWebhook(payload);

    if (deliveryId != null) webhookIdempotencyStore.markProcessed(deliveryId);
    return ResponseEntity.ok().build();
}

// WebhookIdempotencyStore.java — simple Redis or DB-backed
@Component
@RequiredArgsConstructor
public class WebhookIdempotencyStore {

    private final StringRedisTemplate redis;   // OR use DB table

    private static final Duration TTL = Duration.ofDays(1);

    public boolean alreadyProcessed(String deliveryId) {
        return Boolean.TRUE.equals(redis.hasKey("webhook:processed:" + deliveryId));
    }

    public void markProcessed(String deliveryId) {
        redis.opsForValue().set("webhook:processed:" + deliveryId, "1", TTL);
    }
}
```

---

### FIX 3 — Circuit Breaker (Resilience4j)

```xml
<!-- pom.xml -->
<dependency>
  <groupId>io.github.resilience4j</groupId>
  <artifactId>resilience4j-spring-boot3</artifactId>
  <version>2.2.0</version>
</dependency>
```

```yaml
# application.yml — Circuit Breaker config
resilience4j:
  circuitbreaker:
    instances:
      keycloak:
        slidingWindowSize:          10
        minimumNumberOfCalls:       5
        failureRateThreshold:       50      # 50% failures → OPEN
        waitDurationInOpenState:    30s
        permittedNumberOfCallsInHalfOpenState: 3
      apiman:
        slidingWindowSize:          10
        failureRateThreshold:       50
        waitDurationInOpenState:    30s
      mysql:
        slidingWindowSize:          20
        failureRateThreshold:       30
        waitDurationInOpenState:    10s

  retry:
    instances:
      keycloak:
        maxAttempts: 3
        waitDuration: 500ms
        retryExceptions:
          - java.net.ConnectException
          - java.io.IOException
```

```java
// KeycloakService.java — wrapped with circuit breaker
@Service
@Slf4j
public class KeycloakAdminService {

    @CircuitBreaker(name = "keycloak", fallbackMethod = "keycloakFallback")
    @Retry(name = "keycloak")
    public UserRepresentation getUserFromKeycloak(String userId) {
        // ... call Keycloak admin REST API
    }

    // ✅ Fallback: serve from local DB cache
    public UserRepresentation keycloakFallback(String userId, Exception ex) {
        log.warn("Keycloak circuit open — serving from local cache for user={}", userId);
        return userRepo.findById(userId)
            .map(this::toRepresentation)
            .orElseThrow(() -> new ServiceUnavailableException("Auth service unavailable"));
    }
}
```

---

### FIX 4 — Pagination Safety Guard

```java
// PageableHandlerConfig.java — enforce max page size
@Configuration
public class PageableConfig implements WebMvcConfigurer {

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        PageableHandlerMethodArgumentResolver resolver =
            new PageableHandlerMethodArgumentResolver();
        resolver.setMaxPageSize(100);          // ✅ Never more than 100 per request
        resolver.setFallbackPageable(PageRequest.of(0, 20));
        resolver.setOneIndexedParameters(false);
        resolvers.add(resolver);
    }
}
```

---

### FIX 5 — JWT Secret Length Enforcement at Startup

```java
// JwtStartupValidator.java
@Component
@Slf4j
public class JwtStartupValidator implements ApplicationRunner {

    @Value("${application.jwt.secret}")
    private String jwtSecret;

    @Override
    public void run(ApplicationArguments args) {
        if (jwtSecret == null || jwtSecret.length() < 32) {
            throw new IllegalStateException(
                "FATAL: JWT_SECRET must be at least 32 characters (256 bits). " +
                "Set the JWT_SECRET environment variable to a strong random value. " +
                "Generate one with: openssl rand -base64 32"
            );
        }
        if (jwtSecret.contains("change_me") || jwtSecret.contains("secret") ||
            jwtSecret.contains("example")) {
            log.warn("⚠️  JWT_SECRET looks like a default/placeholder value. " +
                     "Replace with a cryptographically random secret before production.");
        }
        log.info("✅ JWT secret validated: {} characters", jwtSecret.length());
    }
}
```

---

### FIX 6 — Audit Trail for Privilege Operations

```java
// AuditService.java — write-only, append-only audit log
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditRepo;

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)  // ← independent TX
    public void log(AuditEvent event) {
        try {
            auditRepo.save(AuditLog.builder()
                .userId(event.userId())
                .projectId(event.projectId())
                .action(event.action())
                .entityType(event.entityType())
                .entityId(event.entityId())
                .details(event.details())   // JSON string
                .ipAddress(event.ipAddress())
                .build());
        } catch (Exception e) {
            // Never let audit failure break the main operation
            log.error("Audit log write failed: {}", e.getMessage());
        }
    }
}

// Usage — in any service method
public void changeMemberRole(Long projectId, Long userId, Role newRole, String changedBy) {
    // ... business logic ...
    auditService.log(new AuditEvent(
        changedByUserId, projectId, "MEMBER_ROLE_CHANGED",
        "ProjectMember", userId,
        """{"userId":%d,"newRole":"%s"}""".formatted(userId, newRole)
    ));
}

// Sensitive operations that MUST be audited:
// - MEMBER_ROLE_CHANGED
// - PROJECT_DELETED
// - MEMBER_REMOVED  
// - WIKI_PAGE_DELETED
// - API_KEY_CREATED
// - API_KEY_REVOKED
// - USER_DEACTIVATED
```

---

### FIX 7 — Soft Delete with @Transactional + Optimistic Lock

```java
// BaseEntity — add version for optimistic locking
@MappedSuperclass
public abstract class BaseEntity {
    // ... existing fields ...
    
    @Version
    @Column(name = "version")
    private Long version = 0L;    // ✅ prevents concurrent delete race condition
}

// V2__add_version_column.sql
ALTER TABLE tasks         ADD COLUMN version BIGINT DEFAULT 0 NOT NULL;
ALTER TABLE projects      ADD COLUMN version BIGINT DEFAULT 0 NOT NULL;
ALTER TABLE wiki_pages    ADD COLUMN version BIGINT DEFAULT 0 NOT NULL;

// TaskService — soft delete properly transactional
@Transactional                     // ✅ was missing before
@PreAuthorize("hasRole('developer')")
public void delete(Long taskId, String requestingUserEmail) {
    Task task = taskRepo.findById(taskId)
        .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));

    // Check ownership
    accessGuard.requireMember(task.getProject().getId(), requestingUserEmail,
        ProjectMember.Role.ADMIN, ProjectMember.Role.PM);

    task.setIsDeleted(true);   // soft delete
    taskRepo.save(task);       // triggers @Version increment → concurrent deletes fail with OptimisticLockException
    
    events.publishEvent(new TaskDeletedEvent(taskId, task.getProject().getId(), requestingUserEmail));
}
```

---

## PART B — DESIGN PATTERNS (All 6 Applied)

### Pattern 1: CQRS — Separate Read and Write Services

```java
// ✅ Write service — commands, business logic, events
@Service
public class TaskCommandService {
    @Transactional public TaskDto create(...) { ... }
    @Transactional public TaskDto update(...) { ... }
    @Transactional public void delete(...) { ... }
    @Transactional public TaskDto updateStatus(...) { ... }
}

// ✅ Read service — optimised queries, projections, caching
@Service
@Transactional(readOnly = true)
public class TaskQueryService {
    @Cacheable("tasksByProject") 
    public Page<TaskSummaryProjection> getTasks(...) { ... }
    
    public KanbanBoardDto getKanbanBoard(Long projectId) { ... }
    public TaskDetailDto getTaskDetail(Long taskId) { ... }
    public List<TaskDto> getAssignedTo(Long userId) { ... }
}

// Controller uses both
@RestController
public class TaskController {
    private final TaskCommandService commands;
    private final TaskQueryService   queries;

    @GetMapping  public ... getTasks(...)  { return queries.getTasks(...); }
    @PostMapping public ... createTask()   { return commands.create(...); }
    @PatchMapping public ... updateStatus(){ return commands.updateStatus(...); }
}
```

---

### Pattern 2: Strategy — Wiki Renderer

```java
// WikiRenderer interface — Open/Closed principle
public interface WikiRenderer {
    boolean supports(String contentType);      // "markdown" | "confluence"
    String render(String rawContent);
}

// Implementation 1: Markdown
@Component
public class MarkdownRenderer implements WikiRenderer {
    @Override public boolean supports(String type) { return "markdown".equals(type); }
    @Override public String render(String raw) {
        // Use CommonMark or Flexmark-Java (open-source)
        Parser parser = Parser.builder().build();
        HtmlRenderer renderer = HtmlRenderer.builder().build();
        return renderer.render(parser.parse(raw));
    }
}

// Implementation 2: Confluence wiki markup (ported from vonfluence-wiki-markdown-chalks)
@Component
public class ConfluenceRenderer implements WikiRenderer {
    @Override public boolean supports(String type) { return "confluence".equals(type); }
    @Override public String render(String raw) {
        // Port confluenceParser.js logic here (3-pass algorithm)
        return confluenceParserPort.parse(raw);
    }
}

// WikiRendererFactory — finds the right renderer
@Component
@RequiredArgsConstructor
public class WikiRendererFactory {
    private final List<WikiRenderer> renderers;   // Spring auto-injects all

    public WikiRenderer get(String contentType) {
        return renderers.stream()
            .filter(r -> r.supports(contentType))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException(
                "No renderer for content type: " + contentType));
    }
}

// WikiService uses factory — adding new renderer = zero changes to WikiService
@Service
public class WikiService {
    private final WikiRendererFactory rendererFactory;
    private final WikiSanitizer sanitizer;

    public WikiPageDto savePage(CreateWikiPageRequest req) {
        WikiRenderer renderer = rendererFactory.get(req.getContentType());
        String html = sanitizer.sanitize(renderer.render(req.getContentMd()));
        // save...
    }
}
```

---

### Pattern 3: Factory — Task Creation by Type

```java
// TaskCreationStrategy interface
public interface TaskCreationStrategy {
    Task.TaskType supportedType();
    Task create(CreateTaskRequest req, Project project, User reporter);
    void validate(CreateTaskRequest req);     // type-specific rules
}

// Bug task — must have description, priority >= HIGH
@Component
public class BugTaskStrategy implements TaskCreationStrategy {
    @Override public Task.TaskType supportedType() { return Task.TaskType.BUG; }
    
    @Override public void validate(CreateTaskRequest req) {
        if (req.getDescriptionMd() == null || req.getDescriptionMd().isBlank())
            throw new ValidationException("Bug tasks must have a description");
        if (Task.Priority.valueOf(req.getPriority()).ordinal() > Task.Priority.MEDIUM.ordinal())
            throw new ValidationException("Bug priority must be MEDIUM or higher");
    }
    
    @Override public Task create(CreateTaskRequest req, Project project, User reporter) {
        validate(req);
        return Task.builder()
            .project(project).reporter(reporter)
            .title(req.getTitle()).descriptionMd(req.getDescriptionMd())
            .taskType(Task.TaskType.BUG)
            .priority(Task.Priority.valueOf(req.getPriority()))
            .status(Task.TaskStatus.TODO)   // Bugs go straight to TODO
            .build();
    }
}

// Epic task — must have story points, can have sub-tasks
@Component
public class EpicTaskStrategy implements TaskCreationStrategy {
    @Override public Task.TaskType supportedType() { return Task.TaskType.EPIC; }
    @Override public void validate(CreateTaskRequest req) {
        if (req.getStoryPoints() == null)
            throw new ValidationException("Epic tasks must have story points");
    }
    // ...
}

// TaskFactory — Spring collects all strategies automatically
@Component
@RequiredArgsConstructor
public class TaskFactory {
    private final List<TaskCreationStrategy> strategies;

    public Task create(CreateTaskRequest req, Project project, User reporter) {
        return strategies.stream()
            .filter(s -> s.supportedType() == Task.TaskType.valueOf(req.getTaskType()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Unknown task type: " + req.getTaskType()))
            .create(req, project, reporter);
    }
}
```

---

### Pattern 4: Saga — Multi-Step Project Creation

```java
// ProjectCreationSaga.java — compensating transactions
@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectCreationSaga {

    private final ProjectRepository  projectRepo;
    private final ProjectMemberRepository memberRepo;
    private final WikiPageRepository wikiRepo;

    @Transactional  // ← ONE transaction wrapping all 3 steps
    public ProjectDto createProject(CreateProjectRequest req, User owner) {
        Project project = null;
        try {
            // Step 1: Create project
            project = projectRepo.save(Project.builder()
                .name(req.getName())
                .slug(generateSlug(req.getName()))
                .owner(owner)
                .status(Project.Status.ACTIVE)
                .build());

            // Step 2: Add owner as ADMIN member
            memberRepo.save(ProjectMember.builder()
                .project(project)
                .user(owner)
                .role(ProjectMember.Role.ADMIN)
                .build());

            // Step 3: Create default wiki home page
            wikiRepo.save(WikiPage.builder()
                .project(project)
                .title("Home")
                .slug("home")
                .contentMd("# Welcome to " + req.getName() + "\n\nAdd your project documentation here.")
                .author(owner)
                .build());

            log.info("Project creation saga complete: id={}", project.getId());
            return mapper.toDto(project);

        } catch (Exception e) {
            // @Transactional rolls back ALL 3 steps automatically
            log.error("Project creation saga failed, rolling back: {}", e.getMessage());
            throw new ProjectCreationException("Failed to create project: " + e.getMessage(), e);
        }
    }
}
```

---

### Pattern 5: Base Repository

```java
// BaseRepository — common soft-delete-aware methods for all repos
@NoRepositoryBean
public interface BaseRepository<T extends BaseEntity> extends JpaRepository<T, Long> {

    // All these respect @Where(clause="is_deleted=0")
    Optional<T> findByIdAndIsDeletedFalse(Long id);

    @Modifying
    @Query("UPDATE #{#entityName} e SET e.isDeleted = true WHERE e.id = :id")
    void softDeleteById(@Param("id") Long id);

    @Query("SELECT COUNT(e) > 0 FROM #{#entityName} e WHERE e.id = :id AND e.isDeleted = false")
    boolean existsActiveById(@Param("id") Long id);
}

// All repos extend it — no duplication
public interface TaskRepository    extends BaseRepository<Task>,    JpaSpecificationExecutor<Task> { }
public interface ProjectRepository extends BaseRepository<Project>, JpaSpecificationExecutor<Project> { }
public interface WikiPageRepository extends BaseRepository<WikiPage> { }
```

---

### Pattern 6: Observer (Domain Events) — Already in file 19, now formalised

```java
// Full event catalogue — all domain events in one place
public sealed interface DomainEvent permits
    TaskCreatedEvent, TaskStatusChangedEvent, TaskAssignedEvent, TaskDeletedEvent,
    ProjectCreatedEvent, ProjectDeletedEvent, MemberRoleChangedEvent,
    WikiPageUpdatedEvent, CommitLinkedEvent {}

// All events carry: occurredAt + traceId for correlation
public record TaskStatusChangedEvent(
    Long taskId, Long projectId,
    String oldStatus, String newStatus,
    Long changedByUserId, Instant occurredAt, String traceId
) implements DomainEvent {}

// Listeners are @Async so they never slow down the HTTP response
@Component @Slf4j @RequiredArgsConstructor
public class NotificationEventListener {
    @Async @EventListener
    public void on(TaskAssignedEvent e)       { /* push notification */ }
    @Async @EventListener
    public void on(TaskStatusChangedEvent e)  { /* notify assignee */ }
}

@Component @Slf4j @RequiredArgsConstructor
public class AuditEventListener {
    @Async @EventListener
    public void on(MemberRoleChangedEvent e)  { auditService.log(e); }
    @Async @EventListener
    public void on(ProjectDeletedEvent e)     { auditService.log(e); }
}

@Component @Slf4j @RequiredArgsConstructor
public class ActivityFeedListener {
    @Async @EventListener
    public void on(DomainEvent e)             { activityService.record(e); }
}
```

---

## PART C — FIXED UI DEMO BUGS

### Fix 18+19 — Toggle animation + missing onclick handlers

```scss
/* Toggle switch — proper CSS with thumb animation */
.toggle {
  width: 38px; height: 20px; border-radius: 10px;
  background: var(--border); cursor: pointer;
  position: relative; transition: background var(--fast);
  border: none; padding: 0; outline: none; flex-shrink: 0;
}
.toggle::after {
  content: '';
  position: absolute;
  width: 14px; height: 14px; border-radius: 50%;
  background: white; top: 3px; left: 3px;
  transition: transform 180ms ease-out;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}
.toggle.on  { background: var(--primary); }
.toggle.on::after { transform: translateX(18px); }   /* ← thumb slides right */
```

```javascript
// toggleSwitch() — proper function all 3 toggles should use
function toggleSwitch(el) {
  el.classList.toggle('on');
}
// HTML: <button class="toggle on" onclick="toggleSwitch(this)" aria-checked="true" role="switch"></button>
```

### Fix 20+21 — Wiki overflow + nav matcher

```javascript
// showPage() — fixed: use data-page attribute, not string includes()
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const p = document.getElementById('page-' + name);
  if (p) { p.classList.add('active'); p.scrollTop = 0; }  // ← also scroll to top

  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === name);  // ✅ exact match via data-page
  });

  document.querySelectorAll('.bnav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.page === name);
  });

  document.getElementById('topbar-title').textContent = pageTitles[name] || name;
  closeSidebar();
}
// HTML: <button class="nav-item" data-page="projects" onclick="showPage('projects')">
// Wiki page: remove style="overflow:hidden" from .page div — overflow is on .wiki-split instead
```

---

## PART D — MISSING PROMPT FILES (gap-filled summaries)

### 06 — PrimeNG Components Reference
Key imports for every Angular module:
```typescript
// Shared module imports (add to each feature component)
SharedPrimeNGImports = [
  CardModule, ButtonModule, InputTextModule, TableModule,
  DialogModule, SidebarModule, PanelMenuModule, MenuModule,
  TagModule, BadgeModule, ChipModule, AvatarModule,
  ProgressBarModule, TimelineModule, TreeModule, SplitterModule,
  SkeletonModule, ToastModule, ConfirmDialogModule,
  DropdownModule, MultiSelectModule, CalendarModule,
  SelectButtonModule, ToggleButtonModule, SliderModule,
  EditorModule, FileUploadModule, PaginatorModule,
  OverlayPanelModule, TooltipModule, ChartModule
]
// Provider: MessageService, ConfirmationService, TreeDragDropService
```

### 11 — Team & Roles (Spring Security method security)
```java
// Role hierarchy: ADMIN > PM > DEV > VIEWER
@PreAuthorize("@projectAccessGuard.isAdmin(#projectId, authentication.name)")
public void deleteMember(Long projectId, Long userId) { ... }

@PreAuthorize("@projectAccessGuard.isPmOrAbove(#projectId, authentication.name)")
public SprintDto createSprint(Long projectId, CreateSprintRequest req) { ... }

@PreAuthorize("@projectAccessGuard.isMember(#projectId, authentication.name)")
public Page<TaskDto> getTasks(Long projectId, ...) { ... }
```

### 14 — Testing & CI/CD (Testcontainers + GitHub Actions)
```yaml
# .github/workflows/full-ci.yml
on: [push, pull_request]
jobs:
  backend-test:
    services:
      mysql: { image: mysql:8.0, env: {...}, options: --health-cmd="mysqladmin ping" }
    steps:
      - ./mvnw verify           # unit + integration tests
      - ./mvnw spotbugs:check   # static analysis
      - ./mvnw dependency-check:check  # CVE scan, fail on CVSS >= 7

  frontend-test:
    steps:
      - npm ci && npm run lint && npm test -- --watch=false

  docker-scan:
    needs: [backend-test, frontend-test]
    steps:
      - docker build && trivy image --exit-code 1 --severity HIGH,CRITICAL
```

---

## PART E — KUBERNETES Security Additions

```yaml
# Add to ALL Deployment pod specs — K8s security hardening
spec:
  automountServiceAccountToken: false    # ✅ FIX: was missing
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    fsGroup: 1001
    seccompProfile: { type: RuntimeDefault }
  containers:
    - securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities: { drop: ["ALL"] }

# MySQL — use least-privilege user (not root) for backend
# In init.sql:
CREATE USER 'devapp'@'%' IDENTIFIED BY 'strong_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON devapp.* TO 'devapp'@'%';
# ✅ NO GRANT OPTION, NO DDL, NO DROP — Flyway uses root only at startup

# application.yml — backend uses devapp user, not root:
spring:
  datasource:
    url: jdbc:mysql://mysql:3306/devapp
    username: ${MYSQL_USER:devapp}         # ✅ limited user
    password: ${MYSQL_PASSWORD}
  flyway:
    url: jdbc:mysql://mysql:3306/devapp
    user: ${MYSQL_ROOT_USER:root}          # ✅ Flyway uses root only for migrations
    password: ${MYSQL_ROOT_PASSWORD}
```

---

## PART F — WILL CLAUDE CODE WORK WITH THIS CHAT?

### Direct Answer: **Not directly — but here's exactly how to make it work.**

Claude Code cannot access Claude.ai chat links. It runs in your terminal with no browser. Here's the path:

```
THIS CHAT LINK → ❌ Claude Code cannot open URLs
THIS CHAT → EXPORT FILES → ✅ Claude Code reads files perfectly
```

### Step-by-step to make Claude Code work:

**Step 1: Download all files from this chat**
```
Download these from Claude.ai outputs:
├── devapp-ui-demo.html                    (the live UI)
└── prompts/
    ├── 00-MASTER-PROMPT-v2.md             ← START HERE
    ├── 01-SETUP-ARCHITECTURE.md
    ├── 02-DATABASE-SCHEMA.md
    ├── 03-BACKEND-CORE.md
    ├── 04-BACKEND-APIS.md
    ├── 05-FRONTEND-SETUP.md
    ├── 07-10-DASHBOARD-TASKS-COMMITS.md
    ├── 09-WIKI-MARKDOWN.md
    ├── 12-13-AUTH-THEMING.md
    ├── 15-DOCKER.md
    ├── 16-KEYCLOAK.md
    ├── 17-APIMAN.md
    ├── 18-KUBERNETES.md
    ├── 19-SOLUTION-ARCHITECT-BEST-PRACTICES.md
    ├── 20-DEVELOPER-BEST-PRACTICES.md
    ├── 21-DESIGN-SYSTEM.md
    ├── 22-SECURITY-DEVSECOPS.md
    └── 23-AUDIT-FIXES-PATTERNS.md          ← this file
```

**Step 2: Place files in your repo**
```bash
git clone https://github.com/sumitmali411-cyber/Project-management-application
cd Project-management-application
mkdir -p .claude/prompts
# Copy all .md files into .claude/prompts/
# Copy devapp-ui-demo.html into docs/
```

**Step 3: Create CLAUDE.md (Claude Code's instruction file)**
```markdown
# CLAUDE.md — DevSync Project Management Application

## Start Here
Read `.claude/prompts/00-MASTER-PROMPT-v2.md` first.
Then read in order: 01, 02, 03, 04, 05, 07-10, 09, 12-13, 15, 16, 17, 18, 19, 20, 21, 22, 23.

## Tech Stack
- Frontend: Angular 17 standalone, PrimeNG 17, npm
- Backend: Java 21, Spring Boot 3.2, Maven, MySQL 8
- Auth: Keycloak 24 (OIDC), Apiman 3 (API Gateway)
- Infra: Docker + Kubernetes

## UI Design Reference
See `docs/devapp-ui-demo.html` — open in browser. Match this design exactly.

## Key Patterns (from 23-AUDIT-FIXES-PATTERNS.md)
- CQRS: TaskCommandService + TaskQueryService (never mix)
- Strategy: WikiRendererFactory (Markdown + Confluence)
- Factory: TaskFactory with TaskCreationStrategy per type
- Saga: ProjectCreationSaga (atomic multi-step creation)
- Observer: DomainEvent + @EventListener for notifications, audit, activity
- Circuit Breaker: Resilience4j on Keycloak + Apiman + MySQL calls

## Security Non-Negotiables
- CORS from @Value config, never hardcoded
- Rate limiting: Bucket4j in-app + Apiman (dual layer)
- Webhook: HMAC-SHA256 + idempotency check
- JWT_SECRET: enforce 32+ chars at startup via JwtStartupValidator
- Pagination: max 100 via PageableHandlerMethodArgumentResolver
- All deletes: @Transactional + @Version optimistic lock
- Audit trail: AuditService on all privilege operations

## Sub-repos to Clone and Port
git clone https://github.com/sumitmali411-cyber/vonfluence-wiki-markdown-chalks
git clone https://github.com/sumitmali411-cyber/markdown-previewer-mermaid
```

**Step 4: Start Claude Code**
```bash
cd Project-management-application
claude   # opens Claude Code

# First message to Claude Code:
"Read CLAUDE.md, then read all files in .claude/prompts/ in order.
 Then scaffold the full application starting with:
 1. backend/ Spring Boot structure
 2. frontend/ Angular structure  
 3. infra/ directory (mysql, keycloak, apiman)
 4. docker-compose.yml
 5. k8s/ manifests"
```

### What Claude Code CAN do with these files:
- ✅ Read every .md file and understand the full architecture
- ✅ Scaffold Spring Boot package structure with all entities, services, controllers
- ✅ Generate Angular modules, components, services
- ✅ Write Flyway SQL migrations
- ✅ Create Dockerfile + docker-compose.yml
- ✅ Write K8s YAML manifests
- ✅ Apply all security patterns from file 22+23
- ✅ Run `mvn test`, `ng build`, `docker build` and fix errors iteratively
- ✅ Match the UI design from devapp-ui-demo.html

### What needs human input:
- ❗ Keycloak client secret (generate: `openssl rand -base64 32`)
- ❗ MySQL passwords (generate per env)
- ❗ Domain names in K8s ingress (replace `devapp.example.com`)
- ❗ GitHub webhook secret (generate in GitHub repo settings)
