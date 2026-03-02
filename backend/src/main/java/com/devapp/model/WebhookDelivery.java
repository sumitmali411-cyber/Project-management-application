package com.devapp.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Tracks processed GitHub webhook delivery IDs to prevent duplicate processing.
 * GitHub can retry deliveries (e.g. on 5xx response), so we must deduplicate by
 * the X-GitHub-Delivery UUID.
 */
@Entity
@Table(name = "webhook_deliveries")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WebhookDelivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "delivery_id", nullable = false, unique = true, length = 36)
    private String deliveryId;

    @CreationTimestamp
    @Column(name = "processed_at", nullable = false, updatable = false)
    private LocalDateTime processedAt;

    public WebhookDelivery(String deliveryId) {
        this.deliveryId = deliveryId;
    }
}
