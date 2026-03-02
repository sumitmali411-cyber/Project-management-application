package com.devapp.controller;

import com.devapp.dto.ApiResponse;
import com.devapp.repository.TaskRepository;
import com.devapp.repository.WikiPageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class SearchController {

    private final TaskRepository taskRepo;
    private final WikiPageRepository wikiRepo;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> search(
            @RequestParam String q,
            @RequestParam(required = false) String type) {
        Map<String, Object> results = new HashMap<>();
        // Simplified: production uses full-text search or Elasticsearch
        results.put("query", q);
        results.put("type", type);
        results.put("tasks", taskRepo.findAll(PageRequest.of(0, 5)).getContent()
            .stream().filter(t -> t.getTitle().toLowerCase().contains(q.toLowerCase()))
            .toList());
        return ResponseEntity.ok(ApiResponse.ok(results));
    }
}
