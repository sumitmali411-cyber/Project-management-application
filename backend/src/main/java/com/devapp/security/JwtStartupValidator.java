package com.devapp.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class JwtStartupValidator implements ApplicationRunner {

    @Value("${application.jwt.secret}")
    private String jwtSecret;

    @Override
    public void run(ApplicationArguments args) {
        if (jwtSecret == null || jwtSecret.length() < 32) {
            throw new IllegalStateException(
                "FATAL: JWT_SECRET must be at least 32 characters. " +
                "Generate one with: openssl rand -base64 32");
        }
        if (jwtSecret.contains("change_me") || jwtSecret.contains("example")) {
            log.warn("JWT_SECRET looks like a placeholder. Replace before production.");
        }
        log.info("JWT secret validated ({} chars)", jwtSecret.length());
    }
}
