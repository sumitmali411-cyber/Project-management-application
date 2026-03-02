package com.devapp.controller;

import com.devapp.dto.ApiResponse;
import com.devapp.dto.DashboardDtos.*;
import com.devapp.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<DashboardStatsDto>> getStats(
            @RequestParam(required = false) Long projectId,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getStats(projectId, user.getUsername())));
    }

    @GetMapping("/burndown")
    public ResponseEntity<ApiResponse<BurndownChartDto>> getBurndown(@RequestParam Long sprintId) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getBurndown(sprintId)));
    }

    @GetMapping("/activity")
    public ResponseEntity<ApiResponse<List<ActivityDto>>> getActivity(
            @RequestParam(required = false) Long projectId,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getActivity(projectId, user.getUsername())));
    }
}
