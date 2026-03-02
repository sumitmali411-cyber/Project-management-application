package com.devapp.service;

import com.devapp.dto.CommitDtos.*;
import com.devapp.exception.ResourceNotFoundException;
import com.devapp.model.Commit;
import com.devapp.model.Project;
import com.devapp.model.Task;
import com.devapp.repository.CommitRepository;
import com.devapp.repository.ProjectRepository;
import com.devapp.repository.TaskRepository;
import com.devapp.security.WebhookIdempotencyStore;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommitService {

    private final CommitRepository commitRepo;
    private final ProjectRepository projectRepo;
    private final TaskRepository taskRepo;
    private final WebhookIdempotencyStore idempotencyStore;
    private final ObjectMapper objectMapper;

    // Matches #123 or fixes #123 anywhere in the commit message
    private static final Pattern TASK_REF = Pattern.compile("(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)?\\s*#(\\d+)",
            Pattern.CASE_INSENSITIVE);

    @Transactional(readOnly = true)
    public Page<CommitDto> getByProject(Long projectId, Pageable pageable) {
        return commitRepo.findByProjectIdAndIsDeletedFalseOrderByCommittedAtDesc(projectId, pageable)
                .map(this::toDto);
    }

    @Transactional
    public CommitDto linkToTask(Long commitId, Long taskId) {
        Commit commit = commitRepo.findById(commitId)
                .orElseThrow(() -> new ResourceNotFoundException("Commit", commitId));
        Task task = taskRepo.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task", taskId));
        commit.setLinkedTask(task);
        return toDto(commitRepo.save(commit));
    }

    /**
     * Processes a validated GitHub push webhook payload.
     *
     * Project matching: we compare the repository's HTML URL in the payload against
     * project.repoUrl. Only one project will be matched per push; if none matches,
     * we log a warning and bail out. This prevents the old bug of writing every
     * commit to every project.
     *
     * Idempotency: deliveryId is recorded after successful processing so that
     * GitHub retries (on our 5xx or timeout) don't create duplicate commits.
     *
     * Auto-linking: if the commit message contains #<number> (with optional
     * "fixes/closes/resolves" prefix), we attempt to link the referenced task.
     */
    @Transactional
    public void processWebhook(String deliveryId, String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);

            // GitHub sends either html_url or url; prefer html_url
            String repoHtmlUrl = root.path("repository").path("html_url").asText("");
            if (repoHtmlUrl.isBlank()) {
                repoHtmlUrl = root.path("repository").path("url").asText("");
            }

            String branch = root.path("ref").asText("").replace("refs/heads/", "");
            JsonNode commitsNode = root.path("commits");
            if (!commitsNode.isArray() || commitsNode.isEmpty()) {
                log.debug("Webhook delivery {} has no commits array — ignoring", deliveryId);
                idempotencyStore.markProcessed(deliveryId);
                return;
            }

            // Match exactly one project by repo URL
            final String finalRepoUrl = repoHtmlUrl;
            Optional<Project> projectOpt = projectRepo.findAll().stream()
                    .filter(p -> finalRepoUrl.equalsIgnoreCase(p.getRepoUrl()))
                    .findFirst();

            if (projectOpt.isEmpty()) {
                log.warn("Webhook delivery {}: no project matched repo URL '{}'. " +
                         "Set project.repoUrl in the Project settings.", deliveryId, finalRepoUrl);
                // Still mark processed so GitHub stops retrying the same delivery
                idempotencyStore.markProcessed(deliveryId);
                return;
            }

            Project project = projectOpt.get();
            int saved = 0;

            for (JsonNode c : commitsNode) {
                String hash = c.path("id").asText("").trim();
                if (hash.isBlank()) continue;

                // Skip commits already in DB (idempotency at commit level)
                if (commitRepo.existsByCommitHash(hash)) {
                    log.debug("Commit {} already exists — skipping", hash);
                    continue;
                }

                // Parse the actual commit timestamp; fall back to now() if absent
                LocalDateTime committedAt = parseTimestamp(c.path("timestamp").asText(null));

                Commit commit = Commit.builder()
                        .project(project)
                        .commitHash(hash)
                        .message(c.path("message").asText(""))
                        .authorName(c.path("author").path("name").asText(""))
                        .authorEmail(c.path("author").path("email").asText(""))
                        .committedAt(committedAt)
                        .repoUrl(finalRepoUrl)
                        .branch(branch)
                        .build();

                // Auto-link task if message references #<id>
                autoLinkTask(commit, project.getId());
                commitRepo.save(commit);
                saved++;
            }

            log.info("Webhook delivery {}: saved {} new commit(s) for project '{}' (branch: {})",
                    deliveryId, saved, project.getName(), branch);

            // Mark delivery processed AFTER successful save (same transaction)
            idempotencyStore.markProcessed(deliveryId);

        } catch (Exception e) {
            log.error("Webhook processing error (delivery={}): {}", deliveryId, e.getMessage(), e);
            // Do NOT mark processed on error — let GitHub retry
            throw new RuntimeException("Webhook processing failed", e);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private LocalDateTime parseTimestamp(String iso) {
        if (iso == null || iso.isBlank()) return LocalDateTime.now();
        try {
            return LocalDateTime.ofInstant(Instant.parse(iso), ZoneOffset.UTC);
        } catch (Exception e) {
            log.debug("Could not parse commit timestamp '{}', using now()", iso);
            return LocalDateTime.now();
        }
    }

    private void autoLinkTask(Commit commit, Long projectId) {
        Matcher m = TASK_REF.matcher(commit.getMessage());
        while (m.find()) {
            long taskId = Long.parseLong(m.group(1));
            Optional<Task> task = taskRepo.findById(taskId);
            if (task.isPresent() && task.get().getProject().getId().equals(projectId)) {
                commit.setLinkedTask(task.get());
                log.debug("Auto-linked commit {} → task #{}", commit.getCommitHash(), taskId);
                return; // link only the first matching reference
            }
        }
    }

    private CommitDto toDto(Commit c) {
        return CommitDto.builder()
                .id(c.getId())
                .commitHash(c.getCommitHash())
                .message(c.getMessage())
                .authorName(c.getAuthorName())
                .authorEmail(c.getAuthorEmail())
                .committedAt(c.getCommittedAt())
                .repoUrl(c.getRepoUrl())
                .branch(c.getBranch())
                .linkedTaskId(c.getLinkedTask() != null ? c.getLinkedTask().getId() : null)
                .linkedTaskTitle(c.getLinkedTask() != null ? c.getLinkedTask().getTitle() : null)
                .createdAt(c.getCreatedAt())
                .build();
    }
}
