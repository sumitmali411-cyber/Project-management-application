# 15 — Docker: Containerise Everything

> **All open-source images used:**  
> `eclipse-temurin:21-jre-alpine` · `node:20-alpine` · `nginx:1.25-alpine`  
> `mysql:8.0` · `quay.io/keycloak/keycloak:24.0` · `apiman/apiman-docker:3.1.0.Final`  
> `confluentinc/cp-zookeeper`, `confluentinc/cp-kafka` (optional async events)

---

## Prompt for AI Code Generation

```
Generate production-ready Dockerfiles and a full docker-compose.yml for DevSync.

SERVICES (docker-compose):
1. mysql          — MySQL 8.0, persisted volume, init script
2. keycloak       — Keycloak 24 (OIDC provider), MySQL backend, realm import
3. apiman         — Apiman 3 API Gateway, MySQL backend
4. backend        — Spring Boot 3 JAR (multi-stage build, eclipse-temurin:21)
5. frontend       — Angular 17 (multi-stage: node:20-alpine build → nginx:1.25-alpine serve)
6. nginx-gateway  — Optional outer reverse proxy (nginx:1.25-alpine), routes:
                    /auth     → keycloak:8080
                    /gateway  → apiman:8080
                    /api      → backend:8080
                    /         → frontend:80

REQUIREMENTS:
- Multi-stage Dockerfiles (builder + runtime)
- Non-root USER in every container
- Health checks on every service
- Named volumes for persistence (mysql-data, keycloak-data)
- Environment variables via .env file (never hardcode secrets)
- Networks: devapp-internal (backend services), devapp-frontend (frontend only)
- Resource limits on each service
```

---

## .env (Template — commit `.env.example`, gitignore `.env`)

```dotenv
# MySQL
MYSQL_ROOT_PASSWORD=change_me_root
MYSQL_DATABASE=devapp
MYSQL_USER=devapp
MYSQL_PASSWORD=change_me_devapp

# Keycloak
KC_DB_PASSWORD=change_me_kc
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=change_me_kc_admin

# Apiman
APIMAN_DB_PASSWORD=change_me_apiman

# Backend JWT (still used for service-to-service)
JWT_SECRET=change_me_jwt_256_bit_secret_replace_in_production

# Backend Keycloak OIDC
KEYCLOAK_REALM=devapp
KEYCLOAK_CLIENT_ID=devapp-backend
KEYCLOAK_CLIENT_SECRET=change_me_client_secret

# Apiman Gateway URL (used by backend to register APIs)
APIMAN_GATEWAY_URL=http://apiman:8080/apiman-gateway

# Frontend
FRONTEND_PORT=4200
```

---

## `backend/Dockerfile`

```dockerfile
# ── Stage 1: Build ─────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /build

# Cache Maven dependencies first
COPY pom.xml .
COPY .mvn/ .mvn/
COPY mvnw .
RUN chmod +x mvnw && ./mvnw dependency:go-offline -q

# Build jar
COPY src/ src/
RUN ./mvnw package -DskipTests -q

# ── Stage 2: Runtime ───────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# Non-root user
RUN addgroup -S devapp && adduser -S devapp -G devapp

# Copy fat jar
COPY --from=builder /build/target/*.jar app.jar

# JVM flags for containers
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 \
               -XX:+HeapDumpOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"

USER devapp
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

---

## `frontend/Dockerfile`

```dockerfile
# ── Stage 1: Build Angular ─────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Cache node_modules
COPY package*.json ./
RUN npm ci --prefer-offline

# Build production bundle
COPY . .
RUN npm run build -- --configuration production

# ── Stage 2: Serve with Nginx ──────────────────────────────────
FROM nginx:1.25-alpine AS runtime

# Non-root nginx config
RUN addgroup -S devapp && adduser -S devapp -G devapp && \
    chown -R devapp:devapp /var/cache/nginx /var/run /var/log/nginx

COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

USER devapp
EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s \
  CMD wget -qO- http://localhost:80/ || exit 1
```

---

## `frontend/nginx/default.conf`

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Angular SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API to backend (when using docker-compose directly without outer gateway)
    location /api/ {
        proxy_pass         http://backend:8080/api/;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Proxy Keycloak auth
    location /auth/ {
        proxy_pass         http://keycloak:8080/auth/;
        proxy_set_header   Host $host;
        proxy_buffer_size  128k;
        proxy_buffers      4 256k;
    }

    # Gzip
    gzip on;
    gzip_types text/plain application/javascript application/json text/css;

    # Cache static assets
    location ~* \.(js|css|png|ico|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## `docker-compose.yml`

```yaml
version: "3.9"

###############################################################
# NETWORKS
###############################################################
networks:
  devapp-internal:
    driver: bridge
  devapp-frontend:
    driver: bridge

###############################################################
# VOLUMES
###############################################################
volumes:
  mysql-data:
  keycloak-mysql-data:
  apiman-mysql-data:

###############################################################
# SERVICES
###############################################################
services:

  # ──────────────────────────────────────────────────────────
  # 1. MySQL — Application DB
  # ──────────────────────────────────────────────────────────
  mysql:
    image: mysql:8.0
    container_name: devapp-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE:      ${MYSQL_DATABASE}
      MYSQL_USER:          ${MYSQL_USER}
      MYSQL_PASSWORD:      ${MYSQL_PASSWORD}
    volumes:
      - mysql-data:/var/lib/mysql
      - ./infra/mysql/init.sql:/docker-entrypoint-initdb.d/00-init.sql:ro
    networks: [devapp-internal]
    ports: ["3306:3306"]
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost",
             "-u", "root", "-p${MYSQL_ROOT_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 10
    deploy:
      resources:
        limits: { cpus: "1.0", memory: 1G }

  # ──────────────────────────────────────────────────────────
  # 2. MySQL — Keycloak DB
  # ──────────────────────────────────────────────────────────
  keycloak-mysql:
    image: mysql:8.0
    container_name: keycloak-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${KC_DB_PASSWORD}
      MYSQL_DATABASE:      keycloak
      MYSQL_USER:          keycloak
      MYSQL_PASSWORD:      ${KC_DB_PASSWORD}
    volumes:
      - keycloak-mysql-data:/var/lib/mysql
    networks: [devapp-internal]
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${KC_DB_PASSWORD}"]
      interval: 10s
      retries: 10
    deploy:
      resources:
        limits: { cpus: "0.5", memory: 512M }

  # ──────────────────────────────────────────────────────────
  # 3. Keycloak 24 — OIDC / SSO Provider
  # ──────────────────────────────────────────────────────────
  keycloak:
    image: quay.io/keycloak/keycloak:24.0
    container_name: devapp-keycloak
    restart: unless-stopped
    command:
      - start-dev
      - --import-realm
    environment:
      KC_DB:                mysql
      KC_DB_URL:            jdbc:mysql://keycloak-mysql:3306/keycloak
      KC_DB_USERNAME:       keycloak
      KC_DB_PASSWORD:       ${KC_DB_PASSWORD}
      KC_HOSTNAME_STRICT:   "false"
      KC_HTTP_ENABLED:      "true"
      KC_PROXY:             edge
      KEYCLOAK_ADMIN:       ${KEYCLOAK_ADMIN}
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
    volumes:
      - ./infra/keycloak/devapp-realm.json:/opt/keycloak/data/import/devapp-realm.json:ro
    ports: ["8180:8080"]
    networks: [devapp-internal, devapp-frontend]
    depends_on:
      keycloak-mysql: { condition: service_healthy }
    healthcheck:
      test: ["CMD-SHELL",
             "exec 3<>/dev/tcp/localhost/8080 && echo -e 'GET /health/ready HTTP/1.1\r\nHost: localhost\r\n\r\n' >&3 && cat <&3 | grep -q '200 OK'"]
      interval: 30s
      timeout: 10s
      start_period: 90s
      retries: 5
    deploy:
      resources:
        limits: { cpus: "1.0", memory: 1G }

  # ──────────────────────────────────────────────────────────
  # 4. MySQL — Apiman DB
  # ──────────────────────────────────────────────────────────
  apiman-mysql:
    image: mysql:8.0
    container_name: apiman-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${APIMAN_DB_PASSWORD}
      MYSQL_DATABASE:      apiman
      MYSQL_USER:          apiman
      MYSQL_PASSWORD:      ${APIMAN_DB_PASSWORD}
    volumes:
      - apiman-mysql-data:/var/lib/mysql
    networks: [devapp-internal]
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${APIMAN_DB_PASSWORD}"]
      interval: 10s
      retries: 10
    deploy:
      resources:
        limits: { cpus: "0.5", memory: 512M }

  # ──────────────────────────────────────────────────────────
  # 5. Apiman 3 — API Management Gateway
  # ──────────────────────────────────────────────────────────
  apiman:
    image: apiman/apiman-docker:3.1.0.Final
    container_name: devapp-apiman
    restart: unless-stopped
    environment:
      APIMAN_DB_DRIVER_CLASS:  com.mysql.cj.jdbc.Driver
      APIMAN_DB_URL:           jdbc:mysql://apiman-mysql:3306/apiman
      APIMAN_DB_USERNAME:      apiman
      APIMAN_DB_PASSWORD:      ${APIMAN_DB_PASSWORD}
      APIMAN_KEYCLOAK_URL:     http://keycloak:8080
      APIMAN_KEYCLOAK_REALM:   ${KEYCLOAK_REALM}
    ports:
      - "8280:8080"   # Apiman UI / Manager API
      - "8290:8081"   # Apiman Gateway
    networks: [devapp-internal, devapp-frontend]
    depends_on:
      apiman-mysql: { condition: service_healthy }
      keycloak:     { condition: service_healthy }
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8080/apiman || exit 1"]
      interval: 30s
      timeout: 10s
      start_period: 120s
      retries: 5
    deploy:
      resources:
        limits: { cpus: "1.0", memory: 1G }

  # ──────────────────────────────────────────────────────────
  # 6. Spring Boot Backend
  # ──────────────────────────────────────────────────────────
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: runtime
    container_name: devapp-backend
    restart: unless-stopped
    environment:
      SPRING_DATASOURCE_URL:      jdbc:mysql://mysql:3306/${MYSQL_DATABASE}
      SPRING_DATASOURCE_USERNAME: ${MYSQL_USER}
      SPRING_DATASOURCE_PASSWORD: ${MYSQL_PASSWORD}
      JWT_SECRET:                 ${JWT_SECRET}
      KEYCLOAK_REALM:             ${KEYCLOAK_REALM}
      KEYCLOAK_CLIENT_ID:         ${KEYCLOAK_CLIENT_ID}
      KEYCLOAK_CLIENT_SECRET:     ${KEYCLOAK_CLIENT_SECRET}
      KEYCLOAK_AUTH_SERVER_URL:   http://keycloak:8080
      APIMAN_GATEWAY_URL:         ${APIMAN_GATEWAY_URL}
    ports: ["8080:8080"]
    networks: [devapp-internal]
    depends_on:
      mysql:     { condition: service_healthy }
      keycloak:  { condition: service_healthy }
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8080/actuator/health || exit 1"]
      interval: 20s
      timeout: 10s
      start_period: 60s
      retries: 5
    deploy:
      resources:
        limits: { cpus: "1.5", memory: 1G }

  # ──────────────────────────────────────────────────────────
  # 7. Angular Frontend (Nginx)
  # ──────────────────────────────────────────────────────────
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: runtime
    container_name: devapp-frontend
    restart: unless-stopped
    ports: ["80:80"]
    networks: [devapp-internal, devapp-frontend]
    depends_on:
      backend: { condition: service_healthy }
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:80/ || exit 1"]
      interval: 15s
      retries: 3
    deploy:
      resources:
        limits: { cpus: "0.5", memory: 256M }
```

---

## `infra/mysql/init.sql`

```sql
-- Create additional databases needed for separate schemas
-- Flyway handles devapp schema from Spring Boot startup
CREATE DATABASE IF NOT EXISTS devapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON devapp.* TO 'devapp'@'%';
FLUSH PRIVILEGES;
```

---

## `.dockerignore` (root level)

```
.git
.gitignore
**/node_modules
**/target
**/.angular
**/dist
**/*.log
infra/keycloak/*.json
.env
```

---

## Useful Docker Commands

```bash
# First run — build everything
docker compose --env-file .env up --build -d

# Tail logs
docker compose logs -f backend
docker compose logs -f keycloak

# Rebuild only backend after code change
docker compose up --build backend -d

# Stop everything
docker compose down

# Stop + wipe all data volumes
docker compose down -v

# Open Keycloak admin console
open http://localhost:8180/admin
# admin / value from KEYCLOAK_ADMIN_PASSWORD in .env

# Open Apiman UI
open http://localhost:8280/apiman-manager-ui/

# Access running container shell
docker exec -it devapp-backend sh
docker exec -it devapp-mysql mysql -u devapp -p devapp
```
