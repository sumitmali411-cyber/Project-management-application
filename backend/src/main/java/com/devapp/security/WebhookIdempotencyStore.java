package com.devapp.security;

import com.devapp.model.WebhookDelivery;
import com.devapp.repository.WebhookDeliveryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Prevents double-processing of GitHub webhook deliveries.
 *
 * GitHub retries a delivery if your endpoint returns a non-2xx response or times out.
 * We persist the X-GitHub-Delivery UUID so repeated retries are silently ignored.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebhookIdempotencyStore {

    private final WebhookDeliveryRepository deliveryRepo;

    /** Returns true if this deliveryId was already processed. */
    @Transactional(readOnly = true)
    public boolean alreadyProcessed(String deliveryId) {
        if (deliveryId == null || deliveryId.isBlank()) return false;
        return deliveryRepo.existsByDeliveryId(deliveryId);
    }

    /** Marks a deliveryId as processed; call inside the same transaction as the main work. */
    @Transactional
    public void markProcessed(String deliveryId) {
        if (deliveryId == null || deliveryId.isBlank()) return;
        try {
            deliveryRepo.save(new WebhookDelivery(deliveryId));
        } catch (Exception e) {
            // Unique constraint violation means a concurrent request already saved it — safe to ignore
            log.debug("Delivery {} already recorded (concurrent request): {}", deliveryId, e.getMessage());
        }
    }
}
