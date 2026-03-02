package com.devapp.controller;

import com.devapp.dto.ApiResponse;
import com.devapp.dto.SprintDtos.*;
import com.devapp.service.SprintService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/sprints")
@RequiredArgsConstructor
public class SprintController {

    private final SprintService sprintService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SprintDto>>> getSprints(@PathVariable Long projectId) {
        return ResponseEntity.ok(ApiResponse.ok(sprintService.getByProject(projectId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SprintDto>> create(
            @PathVariable Long projectId, @Valid @RequestBody CreateSprintRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(sprintService.create(projectId, req), "Sprint created"));
    }

    @PostMapping("/{sprintId}/start")
    public ResponseEntity<ApiResponse<SprintDto>> start(@PathVariable Long projectId, @PathVariable Long sprintId) {
        return ResponseEntity.ok(ApiResponse.ok(sprintService.startSprint(sprintId)));
    }

    @PostMapping("/{sprintId}/close")
    public ResponseEntity<ApiResponse<SprintDto>> close(@PathVariable Long projectId, @PathVariable Long sprintId) {
        return ResponseEntity.ok(ApiResponse.ok(sprintService.closeSprint(sprintId)));
    }

    @DeleteMapping("/{sprintId}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long projectId, @PathVariable Long sprintId) {
        sprintService.delete(sprintId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Sprint deleted"));
    }
}
