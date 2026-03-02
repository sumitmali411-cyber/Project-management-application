-- V2: GitHub webhook support
-- Adds repo_url to projects (used to match incoming push events to a project)
-- Adds webhook_deliveries table for idempotency (prevents duplicate processing on GitHub retries)

ALTER TABLE projects
    ADD COLUMN repo_url VARCHAR(1000) NULL COMMENT 'GitHub repository HTML URL, e.g. https://github.com/org/repo';

CREATE TABLE webhook_deliveries (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    delivery_id  VARCHAR(36)  NOT NULL UNIQUE COMMENT 'X-GitHub-Delivery UUID',
    processed_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_webhook_delivery_id (delivery_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
