# 20 — Developer Best Practices

> Java Spring Boot 3 · Angular 17 · Testing · Git · Code Quality  
> Applied throughout every file in this project

---

## Part A: Spring Boot Developer Patterns

### A1. Service Layer Conventions

```java
// ✅ Every public service method should:
// 1. Be @Transactional (read-only=true for reads — uses read replica if configured)
// 2. Return a DTO, never an entity
// 3. Throw specific exceptions, never generic RuntimeException
// 4. Log with structured fields (MDC), never string concatenation

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)   // ← default readOnly; override writes below
public class TaskService {

    private final TaskRepository    taskRepo;
    private final ProjectRepository projectRepo;
    private final UserRepository    userRepo;
    private final TaskMapper        mapper;
    private final ApplicationEventPublisher events;

    public Page<TaskDto> getTasks(Long projectId, TaskFilter filter, Pageable pageable) {
        // ① Validate project exists (fail fast)
        if (!projectRepo.existsById(projectId)) {
            throw new ResourceNotFoundException("Project", projectId);
        }
        // ② Build Specification from filter (avoids N+1 dynamic query)
        Specification<Task> spec = TaskSpecification.of(projectId, filter);
        // ③ Project to DTO at query time (no SELECT *)
        return taskRepo.findAll(spec, pageable).map(mapper::toDto);
    }

    @Transactional   // ← write operation — overrides class-level readOnly
    public TaskDto create(Long projectId, CreateTaskRequest req, String creatorEmail) {
        MDC.put("projectId", String.valueOf(projectId));   // structured logging
        log.info("Creating task: title={}, type={}", req.getTitle(), req.getTaskType());
        try {
            Project project  = projectRepo.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
            User reporter    = userRepo.findByEmail(creatorEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User", creatorEmail));

            Task task = Task.builder()
                .project(project)
                .title(req.getTitle())
                .descriptionMd(req.getDescriptionMd())
                .status(Task.TaskStatus.BACKLOG)
                .priority(Task.Priority.valueOf(req.getPriority()))
                .taskType(Task.TaskType.valueOf(req.getTaskType()))
                .reporter(reporter)
                .build();

            Task saved = taskRepo.save(task);
            events.publishEvent(new TaskCreatedEvent(saved.getId(), projectId, creatorEmail));

            log.info("Task created: id={}", saved.getId());
            return mapper.toDto(saved);
        } finally {
            MDC.remove("projectId");
        }
    }
}
```

### A2. MapStruct for DTO Mapping (never map manually)

```java
// pom.xml
// <dependency><groupId>org.mapstruct</groupId><artifactId>mapstruct</artifactId><version>1.5.5.Final</version></dependency>
// <dependency><groupId>org.mapstruct</groupId><artifactId>mapstruct-processor</artifactId>...</dependency>

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface TaskMapper {

    @Mapping(source = "assignee.fullName",   target = "assigneeName")
    @Mapping(source = "assignee.avatarUrl",  target = "assigneeAvatar")
    @Mapping(source = "reporter.fullName",   target = "reporterName")
    @Mapping(source = "project.id",          target = "projectId")
    @Mapping(source = "sprint.id",           target = "sprintId")
    TaskDto toDto(Task task);

    @Mapping(target = "id",         ignore = true)
    @Mapping(target = "createdAt",  ignore = true)
    @Mapping(target = "updatedAt",  ignore = true)
    @Mapping(target = "project",    ignore = true)
    @Mapping(target = "reporter",   ignore = true)
    @Mapping(target = "isDeleted",  ignore = true)
    Task toEntity(CreateTaskRequest req);

    // Partial update: only set non-null fields
    void updateTaskFromRequest(UpdateTaskRequest req, @MappingTarget Task task);
}
```

### A3. Specification Pattern for Dynamic Filters (avoid N+1 fragile if chains)

```java
public class TaskSpecification {

    public static Specification<Task> of(Long projectId, TaskFilter filter) {
        return Specification
            .where(hasProject(projectId))
            .and(filter.getStatus()     != null ? hasStatus(filter.getStatus())      : null)
            .and(filter.getAssigneeId() != null ? hasAssignee(filter.getAssigneeId()): null)
            .and(filter.getPriority()   != null ? hasPriority(filter.getPriority())  : null)
            .and(filter.getSprintId()   != null ? hasSprint(filter.getSprintId())    : null)
            .and(filter.getSearch()     != null ? titleContains(filter.getSearch())  : null);
    }

    private static Specification<Task> hasProject(Long pid) {
        return (root, q, cb) -> cb.equal(root.get("project").get("id"), pid);
    }

    private static Specification<Task> hasStatus(String status) {
        return (root, q, cb) -> cb.equal(root.get("status"),
            Task.TaskStatus.valueOf(status));
    }

    private static Specification<Task> titleContains(String keyword) {
        return (root, q, cb) -> cb.like(
            cb.lower(root.get("title")), "%" + keyword.toLowerCase() + "%"
        );
    }
    // ... other specs
}
```

### A4. Validation — Bean Validation + Custom Validators

```java
// Request DTO with full validation
@Data
public class CreateTaskRequest {

    @NotBlank(message = "Title is required")
    @Size(min = 3, max = 500, message = "Title must be 3-500 characters")
    private String title;

    @NotBlank(message = "Task type is required")
    @ValidEnum(enumClass = Task.TaskType.class, message = "Invalid task type")
    private String taskType;

    @NotBlank
    @ValidEnum(enumClass = Task.Priority.class)
    private String priority;

    @FutureOrPresent(message = "Due date must be today or future")
    private LocalDate dueDate;

    @Min(value = 0, message = "Story points cannot be negative")
    @Max(value = 100, message = "Story points cannot exceed 100")
    private Integer storyPoints;
}

// Custom @ValidEnum annotation
@Target({ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = EnumValidator.class)
public @interface ValidEnum {
    Class<? extends Enum<?>> enumClass();
    String message()  default "Invalid value";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

public class EnumValidator implements ConstraintValidator<ValidEnum, String> {
    private List<String> values;

    @Override
    public void initialize(ValidEnum ann) {
        values = Arrays.stream(ann.enumClass().getEnumConstants())
            .map(Enum::name).collect(Collectors.toList());
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext ctx) {
        return value == null || values.contains(value.toUpperCase());
    }
}
```

### A5. Repository — Custom Queries (JPQL + Native)

```java
@Repository
public interface TaskRepository extends JpaRepository<Task, Long>,
                                        JpaSpecificationExecutor<Task> {

    // Kanban board — group by status in one query
    @Query("""
        SELECT t.status as status, COUNT(t) as count
        FROM Task t
        WHERE t.project.id = :projectId AND t.isDeleted = false
        GROUP BY t.status
        """)
    List<TaskStatusCount> countByStatus(@Param("projectId") Long projectId);

    // Dashboard: tasks due soon for a user
    @Query("""
        SELECT t FROM Task t
        WHERE t.assignee.id = :userId
          AND t.status NOT IN ('DONE', 'CANCELLED')
          AND t.dueDate BETWEEN :today AND :inDays
          AND t.isDeleted = false
        ORDER BY t.dueDate ASC
        """)
    List<Task> findDueSoon(@Param("userId") Long userId,
                           @Param("today") LocalDate today,
                           @Param("inDays") LocalDate inDays);

    // Projection — only summary fields
    @Query("""
        SELECT t.id as id, t.title as title, t.status as status,
               t.priority as priority, t.dueDate as dueDate,
               a.fullName as assigneeName
        FROM Task t LEFT JOIN t.assignee a
        WHERE t.project.id = :projectId AND t.isDeleted = false
        """)
    Page<TaskSummaryProjection> findSummaries(
        @Param("projectId") Long projectId, Pageable pageable);

    // Exists check without loading entity
    boolean existsByIdAndProjectId(Long id, Long projectId);
}
```

### A6. Async Processing — @Async for non-blocking operations

```java
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {

    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("devapp-async-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (ex, method, params) ->
            LoggerFactory.getLogger(getClass())
                .error("Async error in {}: {}", method.getName(), ex.getMessage(), ex);
    }
}

// Usage: notifications, emails, activity log writes — never block the request thread
@Service
public class NotificationService {

    @Async
    @EventListener
    public void onTaskAssigned(TaskAssignedEvent event) {
        // send email / push notification
        // runs in thread pool, not blocking the HTTP request
    }
}
```

---

## Part B: Angular Developer Patterns

### B1. Signal-First State Management

```typescript
// ✅ Use Signals for all component state (Angular 17 best practice)
// ✅ Use computed() for derived state
// ✅ Use effect() for side effects that respond to state changes
// ❌ Avoid BehaviorSubject in components (verbose, manual unsubscription)

@Component({ ... })
export class ProjectDetailComponent implements OnInit {
  private projectSvc = inject(ProjectService);
  private route       = inject(ActivatedRoute);

  // Signals — single source of truth
  project     = signal<ProjectDto | null>(null);
  tasks       = signal<TaskDto[]>([]);
  loading     = signal(true);
  activeTab   = signal(0);
  searchQuery = signal('');

  // Derived state — auto-recomputes when dependencies change
  filteredTasks = computed(() =>
    this.tasks().filter(t =>
      t.title.toLowerCase().includes(this.searchQuery().toLowerCase())
    )
  );

  openTaskCount    = computed(() => this.tasks().filter(t => t.status !== 'DONE').length);
  completedPercent = computed(() => {
    const total = this.tasks().length;
    const done  = this.tasks().filter(t => t.status === 'DONE').length;
    return total ? Math.round((done / total) * 100) : 0;
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.projectSvc.getById(+id).subscribe({
      next: p  => { this.project.set(p.data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
}
```

### B2. OnPush Change Detection (performance — mandatory for lists)

```typescript
// Every component that renders a list MUST use OnPush
@Component({
  selector: 'app-task-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,  // ← mandatory
  template: `...`
})
export class TaskCardComponent {
  @Input({ required: true }) task!: TaskDto;
  @Output() clicked = new EventEmitter<TaskDto>();
}
```

### B3. HTTP Service Pattern — Clean, Typed, Error-Aware

```typescript
// Generic API service — one place for HTTP concerns
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http  = inject(HttpClient);
  private toast = inject(MessageService);

  get<T>(path: string, params?: HttpParams) {
    return this.http.get<ApiResponse<T>>(`${environment.apiUrl}${path}`, { params });
  }

  post<T>(path: string, body: unknown) {
    return this.http.post<ApiResponse<T>>(`${environment.apiUrl}${path}`, body);
  }

  put<T>(path: string, body: unknown) {
    return this.http.put<ApiResponse<T>>(`${environment.apiUrl}${path}`, body);
  }

  patch<T>(path: string, body: unknown) {
    return this.http.patch<ApiResponse<T>>(`${environment.apiUrl}${path}`, body);
  }

  delete<T>(path: string) {
    return this.http.delete<ApiResponse<T>>(`${environment.apiUrl}${path}`);
  }
}

// Feature service — business-focused
@Injectable({ providedIn: 'root' })
export class TaskService {
  private api = inject(ApiService);

  getTasks(projectId: number, filter?: TaskFilter, page = 0) {
    const params = buildParams({ page, size: 20, ...filter });
    return this.api.get<PagedResponse<TaskDto>>(`/projects/${projectId}/tasks`, params);
  }

  getKanbanBoard(projectId: number) {
    return this.api.get<KanbanBoardDto>(`/projects/${projectId}/tasks/kanban`);
  }

  create(projectId: number, req: CreateTaskRequest) {
    return this.api.post<TaskDto>(`/projects/${projectId}/tasks`, req);
  }

  updateStatus(projectId: number, taskId: number, status: TaskStatus) {
    return this.api.patch<TaskDto>(`/projects/${projectId}/tasks/${taskId}/status`, { status });
  }
}
```

### B4. Error Interceptor — Global error handling

```typescript
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast  = inject(MessageService);
  const auth   = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 — token expired, try refresh or redirect
      if (error.status === 401) {
        auth.logout();
        return EMPTY;
      }

      // 403 — not authorised for this action
      if (error.status === 403) {
        toast.add({ severity: 'error', summary: 'Access Denied',
                    detail: 'You don\'t have permission for this action' });
        return EMPTY;
      }

      // 429 — rate limited by Apiman
      if (error.status === 429) {
        toast.add({ severity: 'warn', summary: 'Rate Limited',
                    detail: 'Too many requests. Please wait a moment.' });
        return EMPTY;
      }

      // 422 / 400 — validation error from backend
      if (error.status === 400 || error.status === 422) {
        const detail = error.error?.detail || 'Validation error';
        toast.add({ severity: 'error', summary: 'Validation Error', detail });
        return throwError(() => error);   // propagate for form-level handling
      }

      // 5xx — server error
      if (error.status >= 500) {
        toast.add({ severity: 'error', summary: 'Server Error',
                    detail: 'Something went wrong. Please try again.' });
      }

      return throwError(() => error);
    })
  );
};
```

### B5. Loading State Pattern — Consistent across all components

```typescript
// Shared enum — never use raw boolean flags for loading
export type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

// Component usage
@Component({
  template: `
    @switch (loadState()) {
      @case ('loading') {
        <div class="grid">
          @for (i of [1,2,3,4]; track i) {
            <div class="col-12 md:col-6 lg:col-3">
              <p-skeleton height="8rem" borderRadius="12px" />
            </div>
          }
        </div>
      }
      @case ('error') {
        <p-message severity="error" text="Failed to load projects. Please refresh." />
      }
      @case ('loaded') {
        <!-- actual content -->
      }
    }
  `
})
export class ProjectsComponent {
  loadState = signal<LoadState>('idle');

  load() {
    this.loadState.set('loading');
    this.projectSvc.getAll().subscribe({
      next:  () => this.loadState.set('loaded'),
      error: () => this.loadState.set('error')
    });
  }
}
```

### B6. Accessibility (a11y) — Non-negotiable

```typescript
// Every interactive element must have:
// 1. Accessible label (aria-label or visible text)
// 2. Keyboard navigation support (tab order, enter/space activation)
// 3. Focus management in dialogs (FocusTrap from CDK)
// 4. Color not as the only differentiator (icons + labels on status badges)

// ✅ Good
<p-button
  label="Delete Task"
  icon="pi pi-trash"
  [attr.aria-label]="'Delete task: ' + task.title"
  styleClass="p-button-danger"
/>

// ✅ Status with icon + text (not just color)
<p-tag>
  <i [class]="getStatusIcon(task.status)" class="mr-1"></i>
  {{ task.status | titlecase }}
</p-tag>

// ✅ Form fields always have labels
<label [for]="'task-title'" class="block mb-1">Task Title *</label>
<input pInputText id="task-title" formControlName="title"
       [attr.aria-describedby]="form.get('title')?.invalid ? 'title-error' : null" />
@if (form.get('title')?.invalid && form.get('title')?.touched) {
  <small id="title-error" role="alert" class="p-error">Title is required</small>
}
```

---

## Part C: Testing Strategy

### C1. Backend Testing Pyramid

```
Unit Tests (fast, numerous):
  - Service logic with mocked repositories
  - Specification builders
  - Mapper transformations
  - Custom validators
  Target: 80%+ coverage of service + domain layers

Integration Tests (medium, some):
  - @SpringBootTest with Testcontainers MySQL
  - Full repository tests with real DB
  - Controller tests with MockMvc
  Target: every API endpoint has at least one integration test

Contract Tests:
  - Spring Cloud Contract (Pact alternative)
  - Frontend ↔ Backend API contract verified automatically
```

**Example Service Unit Test:**

```java
@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock TaskRepository    taskRepo;
    @Mock ProjectRepository projectRepo;
    @Mock UserRepository    userRepo;
    @Mock TaskMapper        mapper;
    @Mock ApplicationEventPublisher events;

    @InjectMocks TaskService taskService;

    @Test
    @DisplayName("create() should persist task and publish TaskCreatedEvent")
    void create_shouldPersistAndPublishEvent() {
        // Given
        Long projectId = 1L;
        var req     = buildCreateRequest("Fix login bug", "BUG", "HIGH");
        var project = buildProject(projectId);
        var user    = buildUser("dev@test.com");
        var saved   = buildTask(42L, project);

        when(projectRepo.findById(projectId)).thenReturn(Optional.of(project));
        when(userRepo.findByEmail("dev@test.com")).thenReturn(Optional.of(user));
        when(taskRepo.save(any())).thenReturn(saved);
        when(mapper.toDto(saved)).thenReturn(buildTaskDto(42L));

        // When
        TaskDto result = taskService.create(projectId, req, "dev@test.com");

        // Then
        assertThat(result.getId()).isEqualTo(42L);
        verify(taskRepo).save(argThat(t ->
            t.getTitle().equals("Fix login bug") &&
            t.getTaskType() == Task.TaskType.BUG
        ));
        verify(events).publishEvent(any(TaskCreatedEvent.class));
    }

    @Test
    @DisplayName("create() should throw ResourceNotFoundException when project not found")
    void create_shouldThrowWhenProjectNotFound() {
        when(projectRepo.findById(anyLong())).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
            taskService.create(999L, new CreateTaskRequest(), "user@test.com")
        ).isInstanceOf(ResourceNotFoundException.class)
         .hasMessageContaining("Project");
    }
}
```

**Testcontainers Integration Test:**

```java
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
class TaskControllerIT {

    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0")
        .withDatabaseName("devapp_test")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry reg) {
        reg.add("spring.datasource.url",      mysql::getJdbcUrl);
        reg.add("spring.datasource.username", mysql::getUsername);
        reg.add("spring.datasource.password", mysql::getPassword);
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    @WithMockUser(roles = "developer")
    void createTask_returns201WithBody() throws Exception {
        var req = Map.of(
            "title", "Test task",
            "taskType", "TASK",
            "priority", "MEDIUM"
        );

        mvc.perform(post("/api/v1/projects/1/tasks")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(req)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.title").value("Test task"))
            .andExpect(jsonPath("$.data.status").value("BACKLOG"));
    }
}
```

### C2. Angular Testing

```typescript
// Component unit test with fakeAsync + signal testing
describe('KanbanBoardComponent', () => {
  let component: KanbanBoardComponent;
  let fixture: ComponentFixture<KanbanBoardComponent>;
  let taskSvc: jasmine.SpyObj<TaskService>;

  beforeEach(async () => {
    taskSvc = jasmine.createSpyObj('TaskService', ['getKanbanBoard', 'updateStatus']);
    taskSvc.getKanbanBoard.and.returnValue(of({ data: mockKanbanData }));

    await TestBed.configureTestingModule({
      imports: [KanbanBoardComponent],
      providers: [{ provide: TaskService, useValue: taskSvc }]
    }).compileComponents();
  });

  it('should group tasks by status column', () => {
    component.tasks.set(mockTasks);
    expect(component.getColumnTasks('TODO').length).toBe(3);
    expect(component.getColumnTasks('DONE').length).toBe(5);
  });

  it('should call updateStatus on drop between columns', () => {
    taskSvc.updateStatus.and.returnValue(of({ data: mockTask }));
    component.onDrop(buildDropEvent('TODO', 'IN_PROGRESS', mockTasks[0]));
    expect(taskSvc.updateStatus).toHaveBeenCalledWith(jasmine.any(Number), mockTasks[0].id, 'IN_PROGRESS');
  });
});
```

---

## Part D: Git Workflow & Code Quality

### D1. Branch Strategy (Trunk-Based with short-lived feature branches)

```
main              ← production-ready always
└── develop       ← integration branch
    ├── feat/TASK-123-kanban-drag-drop
    ├── feat/TASK-124-wiki-mermaid-export
    ├── fix/TASK-125-keycloak-token-refresh
    └── chore/TASK-126-bump-primeng-17-18
```

**Commit message format (Conventional Commits):**
```
feat(wiki):    add Confluence macro parser port from vonfluence-wiki-markdown-chalks
fix(kanban):   prevent duplicate card when dropping to same column position
feat(api):     add task bulk status update endpoint
chore(docker): upgrade eclipse-temurin to 21.0.3
docs(adr):     add ADR-002 for Keycloak over custom JWT
test(task):    add integration tests for TaskController create/update/delete
refactor(dto): extract TaskMapper from TaskService using MapStruct
```

### D2. Pre-commit Hooks (husky + lint-staged for Angular)

```json
// package.json
{
  "lint-staged": {
    "src/**/*.ts": ["eslint --fix", "prettier --write"],
    "src/**/*.scss": ["prettier --write"],
    "src/**/*.html": ["prettier --write"]
  }
}
```

```bash
# .husky/pre-commit
npx lint-staged
```

```xml
<!-- pom.xml — backend code quality checks on CI -->
<plugin>
  <groupId>com.github.spotbugs</groupId>
  <artifactId>spotbugs-maven-plugin</artifactId>
  <version>4.8.3.1</version>
</plugin>
<plugin>
  <groupId>org.owasp</groupId>
  <artifactId>dependency-check-maven</artifactId>
  <version>9.0.9</version>
  <configuration>
    <failBuildOnCVSS>7</failBuildOnCVSS>   <!-- fail on HIGH/CRITICAL CVEs -->
  </configuration>
</plugin>
```

### D3. CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env: { MYSQL_ROOT_PASSWORD: root, MYSQL_DATABASE: devapp_test }
        options: --health-cmd="mysqladmin ping" --health-interval=10s
        ports: ["3306:3306"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { java-version: '21', distribution: 'temurin', cache: 'maven' }
      - run: cd backend && ./mvnw verify -Dspring.profiles.active=test
      - run: cd backend && ./mvnw spotbugs:check
      - run: cd backend && ./mvnw org.owasp:dependency-check-maven:check

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm', cache-dependency-path: frontend/package-lock.json }
      - run: cd frontend && npm ci
      - run: cd frontend && npm run lint
      - run: cd frontend && npm test -- --watch=false --browsers=ChromeHeadless
      - run: cd frontend && npm run build

  docker-build:
    needs: [backend, frontend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v5
        with:
          context: ./backend
          tags: devapp/backend:${{ github.sha }},devapp/backend:latest
      - uses: docker/build-push-action@v5
        with:
          context: ./frontend
          tags: devapp/frontend:${{ github.sha }},devapp/frontend:latest
```
