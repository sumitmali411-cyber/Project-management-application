package com.devapp.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;

public class ProjectDtos {

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProjectDto {
        private Long id;
        private String name;
        private String slug;
        private String description;
        private String status;
        private String color;
        private String icon;
        private String repoUrl;
        private AuthDtos.UserDto owner;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    public static class CreateProjectRequest {
        @NotBlank
        private String name;
        private String description;
        private String color;
        private String icon;
        private String repoUrl;
    }

    @Data
    public static class UpdateProjectRequest {
        private String name;
        private String description;
        private String status;
        private String color;
        private String icon;
        private String repoUrl;
    }

    @Data
    public static class AddMemberRequest {
        @NotBlank
        private String email;
        @NotBlank
        private String role;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MemberDto {
        private Long id;
        private AuthDtos.UserDto user;
        private String role;
        private LocalDateTime joinedAt;
    }
}
