package com.devapp.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class DashboardDtos {

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DashboardStatsDto {
        private long totalTasks;
        private long openTasks;
        private long inProgressTasks;
        private long doneTasks;
        private long totalProjects;
        private long totalMembers;
        private long totalCommits;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BurndownChartDto {
        private String sprintName;
        private List<BurndownPoint> points;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BurndownPoint {
        private String date;
        private int remaining;
        private int ideal;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ActivityDto {
        private Long id;
        private String action;
        private String entityType;
        private Long entityId;
        private AuthDtos.UserDto user;
        private LocalDateTime createdAt;
    }
}
