package com.devapp.dto;

import lombok.*;

import java.time.LocalDateTime;

public class CommitDtos {

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CommitDto {
        private Long id;
        private String commitHash;
        private String message;
        private String authorName;
        private String authorEmail;
        private LocalDateTime committedAt;
        private String repoUrl;
        private String branch;
        private Long linkedTaskId;
        private String linkedTaskTitle;
        private LocalDateTime createdAt;
    }

    @Data
    public static class LinkTaskRequest {
        private Long taskId;
    }
}
