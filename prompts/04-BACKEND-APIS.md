# 04 — Java Backend REST APIs

## Prompt for AI Code Generation

```
Generate all Spring Boot REST Controllers, Services, and DTOs for DevSync.

BASE PATH: /api/v1

CONTROLLERS TO GENERATE:
1. AuthController       — POST /auth/register, /auth/login, /auth/refresh, /auth/logout
2. ProjectController    — CRUD /projects, /projects/{id}/members
3. TaskController       — CRUD /projects/{pid}/tasks, PATCH status, bulk update
4. SprintController     — CRUD /projects/{pid}/sprints, start/close sprint
5. WikiController       — CRUD /projects/{pid}/wiki, versioning
6. CommitController     — GET/POST /projects/{pid}/commits, webhook endpoint
7. NotificationController — GET /notifications, PATCH read
8. DashboardController  — GET /dashboard/stats, /dashboard/burndown
9. SearchController     — GET /search?q=&type=

PATTERNS:
- All responses use ApiResponse<T> wrapper: { success, data, message, timestamp }
- Use Page<T> for paginated endpoints with ?page=0&size=20&sort=createdAt,desc
- Services return DTOs (never entities directly)
- Use @PreAuthorize for role-based access
- Validate all request bodies with @Valid
```

---

## ApiResponse.java (Generic Wrapper)

```java
package com.devapp.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import java.time.LocalDateTime;

@Data @Builder
@NoArgsConstructor @AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private boolean success;
    private T data;
    private String message;
    private LocalDateTime timestamp = LocalDateTime.now();

    public static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder().success(true).data(data).build();
    }
    public static <T> ApiResponse<T> ok(T data, String message) {
        return ApiResponse.<T>builder().success(true).data(data).message(message).build();
    }
    public static <T> ApiResponse<T> error(String message) {
        return ApiResponse.<T>builder().success(false).message(message).build();
    }
}
```

---

## AuthController.java

```java
package com.devapp.controller;

import com.devapp.dto.*;
import com.devapp.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(authService.register(req), "Registration successful"));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(authService.login(req)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@RequestBody RefreshRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(authService.refresh(req.getRefreshToken())));
    }
}
```

---

## ProjectController.java

```java
package com.devapp.controller;

import com.devapp.dto.*;
import com.devapp.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ProjectDto>>> getAll(
            @AuthenticationPrincipal UserDetails user, Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(projectService.getAllForUser(user.getUsername(), pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProjectDto>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(projectService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProjectDto>> create(
            @Valid @RequestBody CreateProjectRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(projectService.create(req, user.getUsername()), "Project created"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProjectDto>> update(
            @PathVariable Long id, @Valid @RequestBody UpdateProjectRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(projectService.update(id, req)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        projectService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Project deleted"));
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<ApiResponse<Void>> addMember(
            @PathVariable Long id, @Valid @RequestBody AddMemberRequest req) {
        projectService.addMember(id, req);
        return ResponseEntity.ok(ApiResponse.ok(null, "Member added"));
    }

    @GetMapping("/{id}/members")
    public ResponseEntity<ApiResponse<java.util.List<MemberDto>>> getMembers(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(projectService.getMembers(id)));
    }
}
```

---

## TaskController.java

```java
package com.devapp.controller;

import com.devapp.dto.*;
import com.devapp.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<TaskDto>>> getTasks(
            @PathVariable Long projectId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) Long sprintId,
            Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(
            taskService.getTasks(projectId, status, assigneeId, sprintId, pageable)));
    }

    @GetMapping("/kanban")
    public ResponseEntity<ApiResponse<KanbanBoardDto>> getKanban(@PathVariable Long projectId) {
        return ResponseEntity.ok(ApiResponse.ok(taskService.getKanbanBoard(projectId)));
    }

    @GetMapping("/{taskId}")
    public ResponseEntity<ApiResponse<TaskDetailDto>> getTask(
            @PathVariable Long projectId, @PathVariable Long taskId) {
        return ResponseEntity.ok(ApiResponse.ok(taskService.getTaskDetail(projectId, taskId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TaskDto>> createTask(
            @PathVariable Long projectId,
            @Valid @RequestBody CreateTaskRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(taskService.create(projectId, req, user.getUsername())));
    }

    @PutMapping("/{taskId}")
    public ResponseEntity<ApiResponse<TaskDto>> updateTask(
            @PathVariable Long projectId,
            @PathVariable Long taskId,
            @Valid @RequestBody UpdateTaskRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(taskService.update(projectId, taskId, req)));
    }

    @PatchMapping("/{taskId}/status")
    public ResponseEntity<ApiResponse<TaskDto>> updateStatus(
            @PathVariable Long projectId,
            @PathVariable Long taskId,
            @RequestBody StatusUpdateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(taskService.updateStatus(taskId, req.getStatus())));
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<ApiResponse<Void>> deleteTask(
            @PathVariable Long projectId, @PathVariable Long taskId) {
        taskService.delete(taskId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Task deleted"));
    }

    @PostMapping("/{taskId}/comments")
    public ResponseEntity<ApiResponse<CommentDto>> addComment(
            @PathVariable Long projectId,
            @PathVariable Long taskId,
            @Valid @RequestBody CreateCommentRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(taskService.addComment(taskId, req, user.getUsername())));
    }

    @GetMapping("/{taskId}/comments")
    public ResponseEntity<ApiResponse<List<CommentDto>>> getComments(
            @PathVariable Long projectId, @PathVariable Long taskId) {
        return ResponseEntity.ok(ApiResponse.ok(taskService.getComments(taskId)));
    }
}
```

---

## WikiController.java

```java
package com.devapp.controller;

import com.devapp.dto.*;
import com.devapp.service.WikiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/wiki")
@RequiredArgsConstructor
public class WikiController {

    private final WikiService wikiService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<WikiPageTreeDto>>> getPageTree(@PathVariable Long projectId) {
        return ResponseEntity.ok(ApiResponse.ok(wikiService.getPageTree(projectId)));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<ApiResponse<WikiPageDto>> getPage(
            @PathVariable Long projectId, @PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.ok(wikiService.getPageBySlug(projectId, slug)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WikiPageDto>> createPage(
            @PathVariable Long projectId,
            @Valid @RequestBody CreateWikiPageRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(wikiService.createPage(projectId, req, user.getUsername())));
    }

    @PutMapping("/{slug}")
    public ResponseEntity<ApiResponse<WikiPageDto>> updatePage(
            @PathVariable Long projectId,
            @PathVariable String slug,
            @Valid @RequestBody UpdateWikiPageRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(wikiService.updatePage(projectId, slug, req, user.getUsername())));
    }

    @GetMapping("/{slug}/versions")
    public ResponseEntity<ApiResponse<List<WikiVersionDto>>> getVersions(
            @PathVariable Long projectId, @PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.ok(wikiService.getVersions(projectId, slug)));
    }

    @DeleteMapping("/{slug}")
    public ResponseEntity<ApiResponse<Void>> deletePage(
            @PathVariable Long projectId, @PathVariable String slug) {
        wikiService.deletePage(projectId, slug);
        return ResponseEntity.ok(ApiResponse.ok(null, "Page deleted"));
    }
}
```

---

## CommitController.java (with Webhook)

```java
package com.devapp.controller;

import com.devapp.dto.*;
import com.devapp.service.CommitService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class CommitController {

    private final CommitService commitService;

    @GetMapping("/api/v1/projects/{projectId}/commits")
    public ResponseEntity<ApiResponse<Page<CommitDto>>> getCommits(
            @PathVariable Long projectId, Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(commitService.getByProject(projectId, pageable)));
    }

    @PatchMapping("/api/v1/commits/{commitId}/link")
    public ResponseEntity<ApiResponse<CommitDto>> linkToTask(
            @PathVariable Long commitId, @RequestBody LinkTaskRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(commitService.linkToTask(commitId, req.getTaskId())));
    }

    // GitHub/GitLab Webhook endpoint — no auth required, validated by secret header
    @PostMapping("/api/v1/webhooks/commits")
    public ResponseEntity<Void> receiveWebhook(
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
            @RequestBody String payload) {
        commitService.processWebhook(signature, payload);
        return ResponseEntity.ok().build();
    }
}
```

---

## DashboardController.java

```java
package com.devapp.controller;

import com.devapp.dto.*;
import com.devapp.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<DashboardStatsDto>> getStats(
            @RequestParam(required = false) Long projectId,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getStats(projectId, user.getUsername())));
    }

    @GetMapping("/burndown")
    public ResponseEntity<ApiResponse<BurndownChartDto>> getBurndown(@RequestParam Long sprintId) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getBurndown(sprintId)));
    }

    @GetMapping("/activity")
    public ResponseEntity<ApiResponse<java.util.List<ActivityDto>>> getActivity(
            @RequestParam(required = false) Long projectId,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getActivity(projectId, user.getUsername())));
    }
}
```
