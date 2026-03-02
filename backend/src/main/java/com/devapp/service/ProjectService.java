package com.devapp.service;

import com.devapp.dto.AuthDtos.UserDto;
import com.devapp.dto.ProjectDtos.*;
import com.devapp.exception.ResourceNotFoundException;
import com.devapp.model.Project;
import com.devapp.model.ProjectMember;
import com.devapp.model.User;
import com.devapp.repository.ProjectMemberRepository;
import com.devapp.repository.ProjectRepository;
import com.devapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepo;
    private final ProjectMemberRepository memberRepo;
    private final UserRepository userRepo;

    @Transactional(readOnly = true)
    public Page<ProjectDto> getAllForUser(String email, Pageable pageable) {
        return projectRepo.findAllForUser(email, pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public ProjectDto getById(Long id) {
        return toDto(findProject(id));
    }

    @Transactional
    public ProjectDto create(CreateProjectRequest req, String ownerEmail) {
        User owner = userRepo.findByEmail(ownerEmail)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Project project = Project.builder()
            .name(req.getName())
            .slug(generateSlug(req.getName()))
            .description(req.getDescription())
            .color(req.getColor() != null ? req.getColor() : "#4F46E5")
            .icon(req.getIcon() != null ? req.getIcon() : "pi pi-folder")
            .owner(owner)
            .status(Project.ProjectStatus.ACTIVE)
            .build();
        projectRepo.save(project);

        memberRepo.save(ProjectMember.builder()
            .project(project)
            .user(owner)
            .role(ProjectMember.Role.ADMIN)
            .build());

        return toDto(project);
    }

    @Transactional
    public ProjectDto update(Long id, UpdateProjectRequest req) {
        Project project = findProject(id);
        if (req.getName() != null) project.setName(req.getName());
        if (req.getDescription() != null) project.setDescription(req.getDescription());
        if (req.getColor() != null) project.setColor(req.getColor());
        if (req.getIcon() != null) project.setIcon(req.getIcon());
        if (req.getStatus() != null) project.setStatus(Project.ProjectStatus.valueOf(req.getStatus()));
        return toDto(projectRepo.save(project));
    }

    @Transactional
    public void delete(Long id) {
        Project project = findProject(id);
        project.setIsDeleted(true);
        projectRepo.save(project);
    }

    @Transactional
    public void addMember(Long projectId, AddMemberRequest req) {
        Project project = findProject(projectId);
        User user = userRepo.findByEmail(req.getEmail())
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + req.getEmail()));
        if (memberRepo.existsByProjectIdAndUserEmail(projectId, req.getEmail())) {
            throw new IllegalArgumentException("User is already a member");
        }
        memberRepo.save(ProjectMember.builder()
            .project(project)
            .user(user)
            .role(ProjectMember.Role.valueOf(req.getRole()))
            .build());
    }

    @Transactional(readOnly = true)
    public List<MemberDto> getMembers(Long projectId) {
        return memberRepo.findByProjectId(projectId).stream()
            .map(this::toMemberDto)
            .collect(Collectors.toList());
    }

    private Project findProject(Long id) {
        return projectRepo.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Project", id));
    }

    private String generateSlug(String name) {
        String base = name.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
        String slug = base;
        int i = 1;
        while (projectRepo.findBySlug(slug).isPresent()) {
            slug = base + "-" + i++;
        }
        return slug;
    }

    private ProjectDto toDto(Project p) {
        return ProjectDto.builder()
            .id(p.getId())
            .name(p.getName())
            .slug(p.getSlug())
            .description(p.getDescription())
            .status(p.getStatus().name())
            .color(p.getColor())
            .icon(p.getIcon())
            .owner(toUserDto(p.getOwner()))
            .createdAt(p.getCreatedAt())
            .updatedAt(p.getUpdatedAt())
            .build();
    }

    private MemberDto toMemberDto(ProjectMember m) {
        return MemberDto.builder()
            .id(m.getId())
            .user(toUserDto(m.getUser()))
            .role(m.getRole().name())
            .joinedAt(m.getJoinedAt())
            .build();
    }

    private UserDto toUserDto(User u) {
        return UserDto.builder()
            .id(u.getId())
            .username(u.getUsername())
            .email(u.getEmail())
            .fullName(u.getFullName())
            .avatarUrl(u.getAvatarUrl())
            .role(u.getRole().name())
            .build();
    }
}
