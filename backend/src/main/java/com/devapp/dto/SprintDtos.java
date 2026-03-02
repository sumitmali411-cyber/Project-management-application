package com.devapp.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class SprintDtos {

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SprintDto {
        private Long id;
        private String name;
        private String goal;
        private LocalDate startDate;
        private LocalDate endDate;
        private String status;
        private Long projectId;
        private LocalDateTime createdAt;
    }

    @Data
    public static class CreateSprintRequest {
        @NotBlank
        private String name;
        private String goal;
        private LocalDate startDate;
        private LocalDate endDate;
    }

    @Data
    public static class UpdateSprintRequest {
        private String name;
        private String goal;
        private LocalDate startDate;
        private LocalDate endDate;
    }
}
