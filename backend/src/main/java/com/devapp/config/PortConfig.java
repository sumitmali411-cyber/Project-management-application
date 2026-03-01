package com.devapp.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.ServerSocket;

/**
 * Tries to bind on the configured port (server.port / SERVER_PORT, default 9090).
 * If that port is already in use, scans upward (up to +20) for a free port
 * and switches Tomcat to use it automatically — no manual config change needed.
 */
@Component
@Slf4j
public class PortConfig implements WebServerFactoryCustomizer<TomcatServletWebServerFactory> {

    @Value("${server.port:9090}")
    private int configuredPort;

    private static final int MAX_OFFSET = 20;

    @Override
    public void customize(TomcatServletWebServerFactory factory) {
        int port = findAvailablePort(configuredPort);
        factory.setPort(port);
        if (port != configuredPort) {
            log.warn("Port {} is in use — started on port {} instead. " +
                     "Update proxy.conf.json target if running the Angular dev server.",
                     configuredPort, port);
        } else {
            log.info("Backend listening on port {}", port);
        }
    }

    static int findAvailablePort(int start) {
        for (int port = start; port <= start + MAX_OFFSET; port++) {
            if (isPortFree(port)) return port;
        }
        // Fall through to 0 → OS picks a random free port
        log.warn("No free port found in range [{}-{}]; letting the OS assign one.",
                 start, start + MAX_OFFSET);
        return 0;
    }

    private static boolean isPortFree(int port) {
        try (ServerSocket s = new ServerSocket(port)) {
            s.setReuseAddress(true);
            return true;
        } catch (IOException e) {
            return false;
        }
    }
}
