# 17 — Apiman 3: API Management Gateway

> **Open-source:** `apiman/apiman-docker:3.1.0.Final` (Apache 2.0)  
> **Purpose:** Rate limiting · API versioning · Analytics · Request/response policies ·  
> OAuth2 token validation · API key management · Developer portal

---

## Architecture: Apiman in the Stack

```
                    ┌────────────────────────────────────────────┐
Internet / Angular  │                                            │
  ──────────────►   │  Apiman Gateway  :8081                     │
                    │  ┌─────────────────────────────────────┐   │
                    │  │ Policies (in order):                 │   │
                    │  │  1. Keycloak OAuth2 Token Validator  │   │
                    │  │  2. Rate Limiter (100 req/min/user)  │   │
                    │  │  3. IP Blocklist                     │   │
                    │  │  4. CORS Policy                      │   │
                    │  │  5. Request Logger                   │   │
                    │  └──────────────┬──────────────────────┘   │
                    │                 │                           │
                    │       route to backend service              │
                    └─────────────────┼──────────────────────────┘
                                      │
                                      ▼
                            Spring Boot :8080
                            /api/v1/*

    Apiman Manager UI  :8280   (admin, policy config, analytics)
    Apiman Gateway     :8290   (actual traffic gateway)
```

---

## Prompt for AI Code Generation

```
Configure Apiman 3 as the API Management Gateway for DevSync.

REQUIREMENTS:
1. Apiman Manager REST API config via curl/JSON (scriptable, idempotent)
2. Register DevSync backend as a Managed API in Apiman:
   - Organization: DevSync
   - API: devapp-api, version: 1.0
   - Implementation URL: http://backend:8080/api/v1
3. Policies to attach (in order):
   a) Keycloak OAuth2 Policy — validate token against devapp realm
   b) Rate Limiting Policy — 100 requests/minute per authenticated user
   c) CORS Policy — allow http://localhost:4200
   d) Ignored Resources Policy — skip /actuator/health, /webhooks/**
4. Create a Plan: BasicPlan (100 req/min)
5. Publish the API and create a Client App for the Angular frontend
6. Generate init script: infra/apiman/bootstrap.sh (idempotent, runs on startup)

SPRING BOOT CHANGE:
- Add ApimHealthIndicator that checks Apiman gateway reachability
- No code change needed — backend stays as-is, Apiman sits in front

ANGULAR CHANGE:
- Update apiUrl in environment.ts to point to Apiman gateway: http://localhost:8290/devapp/DevSync/devapp-api/1.0
- OR keep /api/v1 if using nginx to proxy through Apiman transparently
```

---

## `infra/apiman/bootstrap.sh`

```bash
#!/bin/bash
# ================================================================
# Apiman Bootstrap Script — registers DevSync API with all policies
# Run once after Apiman starts. Safe to re-run (idempotent via checks).
# ================================================================
set -euo pipefail

APIMAN_URL="${APIMAN_URL:-http://localhost:8280}"
APIMAN_ADMIN_USER="${APIMAN_ADMIN_USER:-admin}"
APIMAN_ADMIN_PASS="${APIMAN_ADMIN_PASS:-admin123!}"
BACKEND_URL="${BACKEND_URL:-http://backend:8080/api/v1}"
KEYCLOAK_URL="${KEYCLOAK_URL:-http://keycloak:8080}"
REALM="${KEYCLOAK_REALM:-devapp}"

AUTH="$APIMAN_ADMIN_USER:$APIMAN_ADMIN_PASS"
BASE="$APIMAN_URL/apiman"

echo "⏳ Waiting for Apiman to be ready..."
until curl -sf "$BASE/system/status" > /dev/null; do sleep 5; done
echo "✅ Apiman is ready"

# ── 1. Create Organization ───────────────────────────────────────
echo "Creating organization..."
curl -sf -X POST "$BASE/orgs" \
  -u "$AUTH" -H "Content-Type: application/json" \
  -d '{"name":"DevSync","description":"DevSync Project Management"}' || true

ORG="DevSync"

# ── 2. Create API ────────────────────────────────────────────────
echo "Creating API..."
curl -sf -X POST "$BASE/orgs/$ORG/apis" \
  -u "$AUTH" -H "Content-Type: application/json" \
  -d '{"name":"devapp-api","description":"DevSync REST API"}' || true

# ── 3. Create API Version ────────────────────────────────────────
echo "Creating API version 1.0..."
curl -sf -X POST "$BASE/orgs/$ORG/apis/devapp-api/versions" \
  -u "$AUTH" -H "Content-Type: application/json" \
  -d "{
    \"version\": \"1.0\",
    \"endpoint\": \"$BACKEND_URL\",
    \"endpointType\": \"rest\",
    \"endpointContentType\": \"json\",
    \"publicAPI\": false,
    \"parsePayload\": false
  }" || true

VER="$BASE/orgs/$ORG/apis/devapp-api/versions/1.0"

# ── 4. Add Keycloak OAuth2 Policy ───────────────────────────────
echo "Adding Keycloak OAuth2 policy..."
curl -sf -X POST "$VER/policies" \
  -u "$AUTH" -H "Content-Type: application/json" \
  -d "{
    \"policyDefinitionId\": \"KeycloakOauthPolicy\",
    \"configuration\": \"{
      \\\"realmUrl\\\": \\\"$KEYCLOAK_URL/realms/$REALM\\\",
      \\\"requiredRole\\\": \\\"developer\\\",
      \\\"delegateKerberosIdentity\\\": false,
      \\\"blacklistUnsafeTokens\\\": false
    }\"
  }" || true

# ── 5. Add Rate Limiting Policy ──────────────────────────────────
echo "Adding rate limiting policy (100 req/min/user)..."
curl -sf -X POST "$VER/policies" \
  -u "$AUTH" -H "Content-Type: application/json" \
  -d '{
    "policyDefinitionId": "RateLimitingPolicy",
    "configuration": "{
      \"limit\": 100,
      \"granularity\": \"User\",
      \"period\": \"Minute\",
      \"headerRemaining\": \"X-RateLimit-Remaining\",
      \"headerLimit\": \"X-RateLimit-Limit\",
      \"headerReset\": \"X-RateLimit-Reset\",
      \"errorCode\": 429,
      \"errorMessage\": \"Too Many Requests\"
    }"
  }' || true

# ── 6. Add CORS Policy ───────────────────────────────────────────
echo "Adding CORS policy..."
curl -sf -X POST "$VER/policies" \
  -u "$AUTH" -H "Content-Type: application/json" \
  -d '{
    "policyDefinitionId": "CORSPolicy",
    "configuration": "{
      \"errorOnCorsFailure\": false,
      \"allowOrigin\": \"http://localhost:4200\",
      \"allowCredentials\": true,
      \"exposeHeaders\": \"X-RateLimit-Remaining,X-RateLimit-Limit\",
      \"allowHeaders\": \"Authorization,Content-Type\",
      \"allowMethods\": \"GET,POST,PUT,DELETE,PATCH,OPTIONS\",
      \"maxAge\": 3600
    }"
  }' || true

# ── 7. Create Plan ───────────────────────────────────────────────
echo "Creating BasicPlan..."
curl -sf -X POST "$BASE/orgs/$ORG/plans" \
  -u "$AUTH" -H "Content-Type: application/json" \
  -d '{"name":"BasicPlan","description":"100 req/min standard plan"}' || true

curl -sf -X POST "$BASE/orgs/$ORG/plans/BasicPlan/versions" \
  -u "$AUTH" -H "Content-Type: application/json" \
  -d '{"version":"1.0"}' || true

# Lock plan
curl -sf -X POST "$BASE/orgs/$ORG/plans/BasicPlan/versions/1.0/lock" \
  -u "$AUTH" || true

# ── 8. Add plan to API ───────────────────────────────────────────
curl -sf -X POST "$VER/plans" \
  -u "$AUTH" -H "Content-Type: application/json" \
  -d '{"planId":"BasicPlan","version":"1.0"}' || true

# ── 9. Publish API ───────────────────────────────────────────────
echo "Publishing API..."
curl -sf -X POST "$VER/action" \
  -u "$AUTH" -H "Content-Type: application/json" \
  -d '{"type":"publishAPI"}' || true

# ── 10. Create Client App ────────────────────────────────────────
echo "Creating frontend client app..."
curl -sf -X POST "$BASE/orgs/$ORG/clients" \
  -u "$AUTH" -H "Content-Type: application/json" \
  -d '{"name":"devapp-angular","description":"Angular frontend client"}' || true

curl -sf -X POST "$BASE/orgs/$ORG/clients/devapp-angular/versions" \
  -u "$AUTH" -H "Content-Type: application/json" \
  -d '{"version":"1.0"}' || true

# Register client with API + plan
curl -sf -X POST "$BASE/orgs/$ORG/clients/devapp-angular/versions/1.0/contracts" \
  -u "$AUTH" -H "Content-Type: application/json" \
  -d "{
    \"apiOrgId\":     \"$ORG\",
    \"apiId\":        \"devapp-api\",
    \"apiVersion\":   \"1.0\",
    \"planId\":       \"BasicPlan\",
    \"planVersion\":  \"1.0\"
  }" || true

# Register / publish client
curl -sf -X POST "$BASE/orgs/$ORG/clients/devapp-angular/versions/1.0/action" \
  -u "$AUTH" -H "Content-Type: application/json" \
  -d '{"type":"registerClient"}' || true

echo ""
echo "✅ Apiman bootstrap complete!"
echo "   Manager UI : $APIMAN_URL/apiman-manager-ui/"
echo "   Gateway URL: ${APIMAN_URL%:8280}:8290/devapp/$ORG/devapp-api/1.0"
```

---

## `infra/apiman/Dockerfile` (bootstrap runner)

```dockerfile
FROM alpine:3.19
RUN apk add --no-cache curl bash
COPY bootstrap.sh /bootstrap.sh
RUN chmod +x /bootstrap.sh
CMD ["/bootstrap.sh"]
```

---

## Add apiman-bootstrap to docker-compose.yml

```yaml
  # One-shot bootstrap container
  apiman-bootstrap:
    build:
      context: ./infra/apiman
      dockerfile: Dockerfile
    container_name: apiman-bootstrap
    environment:
      APIMAN_URL:         http://apiman:8080
      APIMAN_ADMIN_USER:  admin
      APIMAN_ADMIN_PASS:  ${KEYCLOAK_ADMIN_PASSWORD}
      BACKEND_URL:        http://backend:8080/api/v1
      KEYCLOAK_URL:       http://keycloak:8080
      KEYCLOAK_REALM:     ${KEYCLOAK_REALM}
    networks: [devapp-internal]
    depends_on:
      apiman:  { condition: service_healthy }
      backend: { condition: service_healthy }
    restart: on-failure
```

---

## Spring Boot: Apiman Health Indicator

```java
package com.devapp.health;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component("apiman")
public class ApimanHealthIndicator implements HealthIndicator {

    @Value("${APIMAN_GATEWAY_URL:http://apiman:8080/apiman-gateway}")
    private String apimanUrl;

    @Override
    public Health health() {
        try {
            new RestTemplate().getForObject(apimanUrl + "/system/status", String.class);
            return Health.up().withDetail("gateway", apimanUrl).build();
        } catch (Exception e) {
            return Health.down().withDetail("gateway", apimanUrl)
                         .withDetail("error", e.getMessage()).build();
        }
    }
}
```

---

## Useful Apiman URLs

```
Manager UI:       http://localhost:8280/apiman-manager-ui/
Manager REST API: http://localhost:8280/apiman/
Gateway:          http://localhost:8290/devapp/DevSync/devapp-api/1.0/

Docs:             https://www.apiman.io/latest/user-guide.html
Policy catalog:   https://www.apiman.io/latest/policies-guide.html
```
