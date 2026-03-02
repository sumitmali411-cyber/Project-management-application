package com.devapp.controller;

import com.devapp.dto.ApiResponse;
import com.devapp.dto.WikiDtos.*;
import com.devapp.service.WikiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/wiki")
@RequiredArgsConstructor
public class WikiController {

    private final WikiService wikiService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<WikiPageTreeDto>>> getPageTree(@PathVariable Long projectId) {
        return ResponseEntity.ok(ApiResponse.ok(wikiService.getPageTree(projectId)));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<ApiResponse<WikiPageDto>> getPage(
            @PathVariable Long projectId, @PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.ok(wikiService.getPageBySlug(projectId, slug)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WikiPageDto>> createPage(
            @PathVariable Long projectId,
            @Valid @RequestBody CreateWikiPageRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(wikiService.createPage(projectId, req, user.getUsername())));
    }

    @PutMapping("/{slug}")
    public ResponseEntity<ApiResponse<WikiPageDto>> updatePage(
            @PathVariable Long projectId,
            @PathVariable String slug,
            @Valid @RequestBody UpdateWikiPageRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok(wikiService.updatePage(projectId, slug, req, user.getUsername())));
    }

    @GetMapping("/{slug}/versions")
    public ResponseEntity<ApiResponse<List<WikiVersionDto>>> getVersions(
            @PathVariable Long projectId, @PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.ok(wikiService.getVersions(projectId, slug)));
    }

    @DeleteMapping("/{slug}")
    public ResponseEntity<ApiResponse<Void>> deletePage(
            @PathVariable Long projectId, @PathVariable String slug) {
        wikiService.deletePage(projectId, slug);
        return ResponseEntity.ok(ApiResponse.ok(null, "Page deleted"));
    }
}
