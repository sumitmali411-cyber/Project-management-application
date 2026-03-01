package com.devapp.service;

import com.devapp.dto.SprintDtos.*;
import com.devapp.exception.ResourceNotFoundException;
import com.devapp.model.Project;
import com.devapp.model.Sprint;
import com.devapp.repository.ProjectRepository;
import com.devapp.repository.SprintRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SprintService {

    private final SprintRepository sprintRepo;
    private final ProjectRepository projectRepo;

    @Transactional(readOnly = true)
    public List<SprintDto> getByProject(Long projectId) {
        return sprintRepo.findByProjectIdAndIsDeletedFalse(projectId)
            .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public SprintDto create(Long projectId, CreateSprintRequest req) {
        Project project = projectRepo.findById(projectId)
            .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        Sprint sprint = Sprint.builder()
            .project(project)
            .name(req.getName())
            .goal(req.getGoal())
            .startDate(req.getStartDate())
            .endDate(req.getEndDate())
            .status(Sprint.SprintStatus.PLANNING)
            .build();
        return toDto(sprintRepo.save(sprint));
    }

    @Transactional
    public SprintDto startSprint(Long sprintId) {
        Sprint sprint = findSprint(sprintId);
        sprint.setStatus(Sprint.SprintStatus.ACTIVE);
        return toDto(sprintRepo.save(sprint));
    }

    @Transactional
    public SprintDto closeSprint(Long sprintId) {
        Sprint sprint = findSprint(sprintId);
        sprint.setStatus(Sprint.SprintStatus.COMPLETED);
        return toDto(sprintRepo.save(sprint));
    }

    @Transactional
    public void delete(Long sprintId) {
        Sprint sprint = findSprint(sprintId);
        sprint.setIsDeleted(true);
        sprintRepo.save(sprint);
    }

    private Sprint findSprint(Long id) {
        return sprintRepo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Sprint", id));
    }

    private SprintDto toDto(Sprint s) {
        return SprintDto.builder()
            .id(s.getId()).name(s.getName()).goal(s.getGoal())
            .startDate(s.getStartDate()).endDate(s.getEndDate())
            .status(s.getStatus().name())
            .projectId(s.getProject().getId())
            .createdAt(s.getCreatedAt())
            .build();
    }
}
