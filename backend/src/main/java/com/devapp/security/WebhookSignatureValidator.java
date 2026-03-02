package com.devapp.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

/**
 * Validates the X-Hub-Signature-256 header sent by GitHub on every webhook delivery.
 * Uses constant-time comparison (MessageDigest.isEqual) to prevent timing attacks.
 *
 * If webhook.github.secret is not set, validation is skipped with a warning —
 * safe for local dev but MUST be configured in production.
 */
@Component
@Slf4j
public class WebhookSignatureValidator {

    @Value("${webhook.github.secret:#{null}}")
    private String githubSecret;

    /**
     * @param signature value of X-Hub-Signature-256 header, e.g. "sha256=abc123..."
     * @param rawPayload raw request body bytes (must not be decoded/re-encoded)
     * @return true if valid or if secret not configured; false if tampered
     */
    public boolean isValid(String signature, String rawPayload) {
        if (githubSecret == null || githubSecret.isBlank()) {
            log.warn("webhook.github.secret not configured — skipping signature check. Set it in production.");
            return true;
        }
        if (signature == null || !signature.startsWith("sha256=")) {
            log.warn("Webhook rejected: missing or malformed X-Hub-Signature-256 header");
            return false;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(githubSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] expectedBytes = mac.doFinal(rawPayload.getBytes(StandardCharsets.UTF_8));
            String expected = "sha256=" + HexFormat.of().formatHex(expectedBytes);
            // Constant-time comparison to prevent timing attacks
            return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                signature.getBytes(StandardCharsets.UTF_8)
            );
        } catch (Exception e) {
            log.error("Webhook signature validation error: {}", e.getMessage());
            return false;
        }
    }
}
