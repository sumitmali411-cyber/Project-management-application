package com.devapp.controller;

import com.devapp.dto.ApiResponse;
import com.devapp.dto.ProjectDtos.*;
import com.devapp.service.ProjectService;
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
    public ResponseEntity<ApiResponse<List<MemberDto>>> getMembers(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(projectService.getMembers(id)));
    }
}
