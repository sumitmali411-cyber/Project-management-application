package com.devapp.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class TaskDtos {

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TaskDto {
        private Long id;
        private String title;
        private String status;
        private String priority;
        private String taskType;
        private AuthDtos.UserDto assignee;
        private AuthDtos.UserDto reporter;
        private LocalDate dueDate;
        private Integer storyPoints;
        private Long projectId;
        private Long sprintId;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TaskDetailDto {
        private Long id;
        private String title;
        private String descriptionMd;
        private String status;
        private String priority;
        private String taskType;
        private AuthDtos.UserDto assignee;
        private AuthDtos.UserDto reporter;
        private LocalDate dueDate;
        private Integer storyPoints;
        private Long projectId;
        private Long sprintId;
        private List<CommentDto> comments;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class KanbanBoardDto {
        private List<TaskDto> backlog;
        private List<TaskDto> todo;
        private List<TaskDto> inProgress;
        private List<TaskDto> inReview;
        private List<TaskDto> done;
        private List<TaskDto> cancelled;
    }

    @Data
    public static class CreateTaskRequest {
        @NotBlank
        private String title;
        private String descriptionMd;
        private String status;
        private String priority;
        private String taskType;
        private Long assigneeId;
        private Long sprintId;
        private Long parentTaskId;
        private LocalDate dueDate;
        private Integer storyPoints;
    }

    @Data
    public static class UpdateTaskRequest {
        private String title;
        private String descriptionMd;
        private String status;
        private String priority;
        private String taskType;
        private Long assigneeId;
        private Long sprintId;
        private LocalDate dueDate;
        private Integer storyPoints;
    }

    @Data
    public static class StatusUpdateRequest {
        @NotBlank
        private String status;
    }

    @Data
    public static class CreateCommentRequest {
        @NotBlank
        private String contentMd;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CommentDto {
        private Long id;
        private String contentMd;
        private AuthDtos.UserDto author;
        private Boolean isEdited;
        private LocalDateTime createdAt;
    }
}
