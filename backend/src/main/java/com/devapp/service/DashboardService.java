package com.devapp.service;

import com.devapp.dto.DashboardDtos.*;
import com.devapp.model.Task;
import com.devapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TaskRepository taskRepo;
    private final ProjectRepository projectRepo;
    private final CommitRepository commitRepo;

    @Transactional(readOnly = true)
    public DashboardStatsDto getStats(Long projectId, String email) {
        if (projectId != null) {
            return DashboardStatsDto.builder()
                .totalTasks(taskRepo.countByProjectIdAndStatusAndIsDeletedFalse(projectId, null))
                .openTasks(taskRepo.countByProjectIdAndStatusAndIsDeletedFalse(projectId, Task.TaskStatus.TODO))
                .inProgressTasks(taskRepo.countByProjectIdAndStatusAndIsDeletedFalse(projectId, Task.TaskStatus.IN_PROGRESS))
                .doneTasks(taskRepo.countByProjectIdAndStatusAndIsDeletedFalse(projectId, Task.TaskStatus.DONE))
                .build();
        }
        return DashboardStatsDto.builder()
            .totalProjects(projectRepo.count())
            .totalTasks(taskRepo.count())
            .build();
    }

    @Transactional(readOnly = true)
    public BurndownChartDto getBurndown(Long sprintId) {
        // Simplified burndown — real implementation queries tasks by sprint + date range
        return BurndownChartDto.builder()
            .sprintName("Sprint " + sprintId)
            .points(List.of(
                BurndownPoint.builder().date("Day 1").remaining(20).ideal(20).build(),
                BurndownPoint.builder().date("Day 5").remaining(14).ideal(12).build(),
                BurndownPoint.builder().date("Day 10").remaining(5).ideal(0).build()
            ))
            .build();
    }

    @Transactional(readOnly = true)
    public List<ActivityDto> getActivity(Long projectId, String email) {
        // Simplified — returns empty list, full impl queries activity_log table
        return List.of();
    }
}
