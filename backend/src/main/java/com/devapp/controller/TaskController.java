package com.devapp.controller;

import com.devapp.dto.ApiResponse;
import com.devapp.dto.TaskDtos.*;
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
