package com.devapp.controller;

import com.devapp.dto.ApiResponse;
import com.devapp.dto.CommitDtos.*;
import com.devapp.security.WebhookIdempotencyStore;
import com.devapp.security.WebhookSignatureValidator;
import com.devapp.service.CommitService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Slf4j
public class CommitController {

    private final CommitService commitService;
    private final WebhookSignatureValidator signatureValidator;
    private final WebhookIdempotencyStore idempotencyStore;

    @GetMapping("/api/v1/projects/{projectId}/commits")
    public ResponseEntity<ApiResponse<Page<CommitDto>>> getCommits(
            @PathVariable Long projectId, Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(commitService.getByProject(projectId, pageable)));
    }

    @PatchMapping("/api/v1/commits/{commitId}/link")
    public ResponseEntity<ApiResponse<CommitDto>> linkToTask(
            @PathVariable Long commitId, @RequestBody LinkTaskRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(commitService.linkToTask(commitId, req.getTaskId())));
    }

    /**
     * GitHub push webhook receiver.
     *
     * Headers expected from GitHub:
     *   X-Hub-Signature-256 : sha256=<HMAC of body with webhook secret>
     *   X-GitHub-Event      : push  (we ignore all other event types)
     *   X-GitHub-Delivery   : <UUID> (used for idempotency)
     *
     * Always return 200 quickly — GitHub marks a delivery failed if no response
     * within 10 seconds, then retries up to 3 times. Idempotency store handles retries.
     */
    @PostMapping("/api/v1/webhooks/commits")
    public ResponseEntity<Void> receiveWebhook(
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
            @RequestHeader(value = "X-GitHub-Event",      defaultValue = "push") String event,
            @RequestHeader(value = "X-GitHub-Delivery",  required = false) String deliveryId,
            @RequestBody String payload) {

        // 1. Validate HMAC signature
        if (!signatureValidator.isValid(signature, payload)) {
            log.warn("Webhook delivery {} rejected: invalid signature", deliveryId);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // 2. Only process push events; acknowledge everything else silently
        if (!"push".equals(event)) {
            log.debug("Ignoring webhook event type '{}' (delivery={})", event, deliveryId);
            return ResponseEntity.ok().build();
        }

        // 3. Idempotency guard — skip if GitHub retried a delivery we already processed
        if (idempotencyStore.alreadyProcessed(deliveryId)) {
            log.info("Skipping duplicate webhook delivery {}", deliveryId);
            return ResponseEntity.ok().build();
        }

        // 4. Process commits and mark delivery as done
        commitService.processWebhook(deliveryId, payload);

        return ResponseEntity.ok().build();
    }
}
