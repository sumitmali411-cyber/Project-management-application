# 22 — Security & DevSecOps Best Practices

> Covers: Spring Security · Keycloak hardening · Apiman policies · K8s security ·  
> Secret management · OWASP compliance · Input sanitization

---

## 1. Keycloak Hardening (Production)

```json
// Additional realm settings for production — merge into devapp-realm.json
{
  "realm": "devapp",

  // ── Brute Force Protection ────────────────────────────────
  "bruteForceProtected": true,
  "permanentLockout": false,
  "maxFailureWaitSeconds": 900,
  "minimumQuickLoginWaitSeconds": 60,
  "waitIncrementSeconds": 60,
  "quickLoginCheckMilliSeconds": 1000,
  "maxDeltaTimeSeconds": 43200,
  "failureFactor": 5,

  // ── Token Settings (short-lived is safer) ─────────────────
  "accessTokenLifespan": 900,           // 15 min
  "accessTokenLifespanForImplicitFlow": 900,
  "ssoSessionIdleTimeout": 1800,        // 30 min idle
  "ssoSessionMaxLifespan": 36000,       // 10 hours max
  "offlineSessionIdleTimeout": 2592000, // 30 days offline
  "refreshTokenMaxReuse": 0,            // ← rotate refresh token on every use

  // ── Password Policy (enforce strong passwords) ────────────
  "passwordPolicy": "length(12) and upperCase(1) and lowerCase(1) and digits(1) and specialChars(1) and notUsername and notEmail and passwordHistory(5)",

  // ── OTP Required for admin role ───────────────────────────
  "requiredCredentials": ["password"],

  // ── HTTPS required in production ─────────────────────────
  "sslRequired": "all",   // change from "external" to "all"

  // ── Disable user-initiated registration (managed onboarding only) ─
  "registrationAllowed": false,

  // ── Event logging ─────────────────────────────────────────
  "eventsEnabled": true,
  "enabledEventTypes": [
    "LOGIN", "LOGIN_ERROR", "LOGOUT", "REGISTER",
    "UPDATE_PASSWORD", "RESET_PASSWORD_ERROR",
    "CLIENT_LOGIN", "CLIENT_LOGIN_ERROR"
  ],
  "adminEventsEnabled": true,
  "adminEventsDetailsEnabled": true
}
```

---

## 2. Spring Boot Security Hardening

```java
// SecurityHeadersConfig.java — HTTP security headers
@Configuration
public class SecurityHeadersConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // ... existing oauth2 config ...
            .headers(headers -> headers
                // Prevent clickjacking
                .frameOptions(frame -> frame.deny())
                // Force HTTPS
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000)
                )
                // Block MIME sniffing
                .contentTypeOptions(ct -> {})
                // Restrict referrer info
                .referrerPolicy(rp -> rp
                    .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)
                )
                // Content Security Policy
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives(
                        "default-src 'self'; " +
                        "script-src 'self' https://cdn.jsdelivr.net; " +
                        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                        "font-src 'self' https://fonts.gstatic.com; " +
                        "connect-src 'self' https://auth.devapp.example.com; " +
                        "img-src 'self' data: https:; " +
                        "frame-ancestors 'none'"
                    )
                )
            );
        return http.build();
    }
}
```

```java
// Project membership guard — verify user is member before ANY project operation
@Service
@RequiredArgsConstructor
public class ProjectAccessGuard {

    private final ProjectMemberRepository memberRepo;

    public void requireMember(Long projectId, String userEmail,
                               ProjectMember.Role... allowedRoles) {
        ProjectMember member = memberRepo.findByProjectIdAndUserEmail(projectId, userEmail)
            .orElseThrow(() -> new AccessDeniedException(
                "User is not a member of project " + projectId));

        if (allowedRoles.length > 0) {
            boolean allowed = Arrays.stream(allowedRoles)
                .anyMatch(r -> r == member.getRole());
            if (!allowed) {
                throw new AccessDeniedException(
                    "Role " + member.getRole() + " is not permitted for this operation");
            }
        }
    }
}

// Usage in any service
@Transactional
public TaskDto create(Long projectId, CreateTaskRequest req, String userEmail) {
    // ← always check membership before doing anything
    accessGuard.requireMember(projectId, userEmail,
        ProjectMember.Role.ADMIN, ProjectMember.Role.PM, ProjectMember.Role.DEV);
    // ... rest of logic
}
```

---

## 3. Input Sanitization (prevent XSS in wiki content)

```java
// WikiSanitizer.java — DOMPurify equivalent on the server side
// Uses OWASP Java HTML Sanitizer (open-source)
// pom.xml: <dependency><groupId>com.googlecode.owasp-java-html-sanitizer</groupId>
//           <artifactId>owasp-java-html-sanitizer</artifactId><version>20220608.1</version></dependency>

@Component
public class WikiSanitizer {

    private final PolicyFactory policy = new HtmlPolicyBuilder()
        .allowElements(
            "h1","h2","h3","h4","h5","h6",
            "p","br","hr","blockquote","pre","code",
            "ul","ol","li","dl","dt","dd",
            "strong","em","b","i","s","del","sup","sub",
            "a","img","table","thead","tbody","tr","th","td",
            "div","span"
        )
        .allowAttributes("href").onElements("a")
        .allowAttributes("src","alt","width","height").onElements("img")
        .allowAttributes("class").globally()
        .requireRelNofollowOnLinks()
        .allowUrlProtocols("http","https","mailto")
        .toFactory();

    public String sanitize(String rawHtml) {
        if (rawHtml == null) return null;
        return policy.sanitize(rawHtml);
    }
}

// WikiService — sanitize before storing
@Transactional
public WikiPageDto createPage(Long projectId, CreateWikiPageRequest req, String authorEmail) {
    String sanitizedHtml = sanitizer.sanitize(markdownRenderer.render(req.getContentMd()));

    WikiPage page = WikiPage.builder()
        .contentMd(req.getContentMd())     // store raw MD
        .contentHtml(sanitizedHtml)        // store sanitized HTML
        // ...
        .build();
    // ...
}
```

---

## 4. Webhook Security (prevent spoofed GitHub/GitLab commits)

```java
// WebhookAuthFilter.java — validate GitHub HMAC-SHA256 signature
@Component
@RequiredArgsConstructor
public class WebhookSignatureValidator {

    @Value("${webhook.github.secret:#{null}}")
    private String githubSecret;

    public boolean isValidGitHubSignature(String signature, String payload) {
        if (githubSecret == null || signature == null) return true; // skip if no secret configured

        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(githubSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String expected = "sha256=" + HexFormat.of().formatHex(hash);
            return MessageDigest.isEqual(expected.getBytes(), signature.getBytes());
        } catch (Exception e) {
            return false;
        }
    }
}

// In CommitController
@PostMapping("/api/v1/webhooks/commits")
public ResponseEntity<Void> receiveWebhook(
        @RequestHeader(value = "X-Hub-Signature-256", required = false) String sig,
        @RequestBody String payload) {

    if (!webhookValidator.isValidGitHubSignature(sig, payload)) {
        log.warn("Webhook signature validation failed");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    commitService.processWebhook(payload);
    return ResponseEntity.ok().build();
}
```

---

## 5. Secret Management

```yaml
# ── NEVER DO THIS ──────────────────────────────────────────────
# application.yml
spring:
  datasource:
    password: mypassword123   # ❌ NEVER hardcode secrets

# ── DO THIS INSTEAD ────────────────────────────────────────────
# application.yml
spring:
  datasource:
    password: ${MYSQL_PASSWORD}   # ✅ always env var

# .env (local dev only, gitignored)
MYSQL_PASSWORD=dev_only_password

# K8s (production)
# kubectl create secret generic backend-secrets \
#   --from-literal=MYSQL_PASSWORD=$(openssl rand -base64 32) \
#   --namespace=devapp
```

**Sealed Secrets (K8s — encrypt secrets in Git):**
```bash
# Install kubeseal CLI
brew install kubeseal

# Seal a secret (safe to commit to Git)
kubectl create secret generic backend-secrets \
  --from-literal=MYSQL_PASSWORD=my_password \
  --dry-run=client -o yaml | \
  kubeseal --controller-namespace kube-system > k8s/secrets/backend-sealed-secret.yaml

# Git commit k8s/secrets/backend-sealed-secret.yaml (encrypted, safe)
# The SealedSecrets controller decrypts it inside the cluster
```

---

## 6. Kubernetes Security Context (every Deployment)

```yaml
# Pod-level security context — apply to ALL deployments
spec:
  securityContext:
    runAsNonRoot:        true
    runAsUser:           1001
    fsGroup:             1001
    seccompProfile:
      type:              RuntimeDefault

  containers:
    - name: backend
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem:   true
        capabilities:
          drop: ["ALL"]
        runAsNonRoot:   true
        runAsUser:      1001
      volumeMounts:
        # readOnlyRootFilesystem=true means we need writable mounts for temp files
        - name: tmp-dir
          mountPath: /tmp
  volumes:
    - name: tmp-dir
      emptyDir: {}
```

**NetworkPolicy — zero-trust between pods:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-netpol
  namespace: devapp
spec:
  podSelector:
    matchLabels: { app: backend }
  policyTypes: [Ingress, Egress]
  ingress:
    # Only accept traffic from apiman gateway
    - from:
        - podSelector: { matchLabels: { app: apiman } }
      ports: [{ port: 8080 }]
  egress:
    # Only talk to mysql and keycloak
    - to:
        - podSelector: { matchLabels: { app: mysql } }
      ports: [{ port: 3306 }]
    - to:
        - podSelector: { matchLabels: { app: keycloak } }
      ports: [{ port: 8080 }]
    # DNS
    - to: [{}]
      ports: [{ port: 53, protocol: UDP }]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: mysql-netpol
  namespace: devapp
spec:
  podSelector:
    matchLabels: { app: mysql }
  policyTypes: [Ingress]
  ingress:
    # Only accept from backend (NOT from frontend or internet)
    - from:
        - podSelector: { matchLabels: { app: backend } }
        - podSelector: { matchLabels: { app: keycloak } }
      ports: [{ port: 3306 }]
```

---

## 7. Apiman Security Policies (Production)

Add these additional policies to the bootstrap.sh API policy chain:

```bash
# ── IP Allowlist / Blocklist ─────────────────────────────────────
curl -sf -X POST "$VER/policies" -u "$AUTH" -H "Content-Type: application/json" -d '{
  "policyDefinitionId": "IPBlacklistPolicy",
  "configuration": "{\"ipList\": [], \"httpHeader\": \"X-Forwarded-For\"}"
}' || true

# ── Request Size Limit (prevent payload bomb attacks) ────────────
curl -sf -X POST "$VER/policies" -u "$AUTH" -H "Content-Type: application/json" -d '{
  "policyDefinitionId": "TransferQuotaPolicy",
  "configuration": "{
    \"limit\": 10485760,
    \"direction\": \"request\",
    \"granularity\": \"Api\",
    \"period\": \"Minute\",
    \"errorCode\": 413,
    \"errorMessage\": \"Request payload too large\"
  }"
}' || true
```

---

## 8. Dependency Vulnerability Scanning

```bash
# Backend — OWASP Dependency Check (run in CI)
cd backend && ./mvnw org.owasp:dependency-check-maven:check \
  -DfailBuildOnCVSS=7 \
  -DsuppressionFile=owasp-suppressions.xml

# Frontend — npm audit
cd frontend && npm audit --audit-level=high

# Docker images — Trivy (open-source image scanner)
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image --exit-code 1 --severity HIGH,CRITICAL devapp/backend:latest

docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image --exit-code 1 --severity HIGH,CRITICAL devapp/frontend:latest
```

Add Trivy to GitHub Actions CI:
```yaml
  security-scan:
    runs-on: ubuntu-latest
    needs: docker-build
    steps:
      - name: Scan backend image
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: devapp/backend:latest
          format: table
          exit-code: 1
          severity: HIGH,CRITICAL
```
