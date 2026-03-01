# 18 — Kubernetes: Production Deployment

> **All open-source:** Kubernetes · Helm · cert-manager · ingress-nginx · Sealed Secrets  
> **Target:** Any K8s cluster (minikube local dev / EKS / GKE / bare metal)  
> **Namespace:** `devapp`

---

## Cluster Architecture

```
                         ┌──────────────────────────────────────────┐
                         │           Kubernetes Cluster              │
                         │                                           │
Internet ──► Ingress ──► │  ┌──────────┐   ┌──────────────────────┐│
               (nginx)   │  │ frontend │   │      devapp NS        ││
                         │  │ :80      │   │                       ││
                         │  └──────────┘   │  backend  :8080       ││
                         │                 │  keycloak :8080       ││
                         │                 │  apiman   :8080/:8081 ││
                         │                 │  mysql    :3306       ││
                         │                 └──────────────────────┘│
                         └──────────────────────────────────────────┘

DNS (example):
  devapp.example.com       → frontend
  api.devapp.example.com   → backend / apiman gateway
  auth.devapp.example.com  → keycloak
  gateway.devapp.example.com → apiman
```

---

## Prompt for AI Code Generation

```
Generate complete Kubernetes manifests for DevSync production deployment.

STRUCTURE:
k8s/
├── namespace.yaml
├── secrets/
│   ├── mysql-secret.yaml        (SealedSecret or plain Secret for dev)
│   ├── keycloak-secret.yaml
│   ├── apiman-secret.yaml
│   └── backend-secret.yaml
├── configmaps/
│   ├── backend-config.yaml
│   └── nginx-config.yaml
├── mysql/
│   ├── statefulset.yaml         (MySQL 8 StatefulSet with PVC)
│   └── service.yaml             (ClusterIP)
├── keycloak/
│   ├── deployment.yaml          (2 replicas, liveness/readiness probes)
│   ├── service.yaml
│   └── configmap-realm.yaml     (realm import JSON)
├── apiman/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── configmap-bootstrap.yaml
├── backend/
│   ├── deployment.yaml          (3 replicas, rolling update)
│   ├── service.yaml
│   └── hpa.yaml                 (HPA: cpu >70% → scale to 6)
├── frontend/
│   ├── deployment.yaml          (2 replicas)
│   ├── service.yaml
│   └── configmap-nginx.yaml
└── ingress/
    ├── ingress.yaml             (ingress-nginx, TLS via cert-manager)
    └── certificate.yaml         (cert-manager Certificate resource)

REQUIREMENTS:
- All containers run as non-root (securityContext: runAsNonRoot: true)
- Resource requests AND limits on every container
- Liveness + readiness probes on every Deployment
- PodDisruptionBudgets for backend and keycloak (minAvailable: 1)
- ConfigMaps for non-secret config, Secrets for credentials
- Rolling update strategy with maxSurge:1, maxUnavailable:0
- Namespace: devapp
- Labels: app, tier, version on every resource
```

---

## `k8s/namespace.yaml`

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: devapp
  labels:
    app.kubernetes.io/managed-by: kubectl
    environment: production
```

---

## `k8s/secrets/backend-secret.yaml` (dev — use SealedSecrets in production)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: backend-secrets
  namespace: devapp
type: Opaque
stringData:
  MYSQL_PASSWORD:          "change_me_devapp"
  JWT_SECRET:              "change_me_jwt_256bit"
  KEYCLOAK_CLIENT_SECRET:  "change_me_client_secret"
```

---

## `k8s/mysql/statefulset.yaml`

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: devapp
  labels:
    app: mysql
    tier: database
spec:
  serviceName: mysql
  replicas: 1
  selector:
    matchLabels: { app: mysql }
  template:
    metadata:
      labels: { app: mysql, tier: database }
    spec:
      securityContext:
        runAsNonRoot: false   # mysql requires root internally
        fsGroup: 999
      containers:
        - name: mysql
          image: mysql:8.0
          ports:
            - containerPort: 3306
          env:
            - name:  MYSQL_DATABASE
              value: devapp
            - name:  MYSQL_USER
              value: devapp
            - name:  MYSQL_PASSWORD
              valueFrom:
                secretKeyRef: { name: mysql-secrets, key: MYSQL_PASSWORD }
            - name:  MYSQL_ROOT_PASSWORD
              valueFrom:
                secretKeyRef: { name: mysql-secrets, key: MYSQL_ROOT_PASSWORD }
          resources:
            requests: { cpu: "250m",  memory: "512Mi" }
            limits:   { cpu: "1000m", memory: "1Gi"   }
          livenessProbe:
            exec:
              command: ["mysqladmin", "ping", "-h", "localhost"]
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 5
          readinessProbe:
            exec:
              command: ["mysql", "-u", "devapp", "-pchange_me_devapp", "-e", "SELECT 1"]
            initialDelaySeconds: 20
            periodSeconds: 5
          volumeMounts:
            - name: mysql-data
              mountPath: /var/lib/mysql
  volumeClaimTemplates:
    - metadata:
        name: mysql-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 20Gi
```

---

## `k8s/mysql/service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: devapp
spec:
  selector: { app: mysql }
  ports:
    - port: 3306
      targetPort: 3306
  type: ClusterIP
  clusterIP: None   # headless for StatefulSet
```

---

## `k8s/keycloak/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: keycloak
  namespace: devapp
  labels: { app: keycloak, tier: auth }
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxSurge: 1, maxUnavailable: 0 }
  selector:
    matchLabels: { app: keycloak }
  template:
    metadata:
      labels: { app: keycloak, tier: auth }
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: keycloak
          image: quay.io/keycloak/keycloak:24.0
          args: ["start", "--import-realm"]
          ports:
            - containerPort: 8080
          env:
            - { name: KC_DB,              value: mysql }
            - { name: KC_DB_URL,          value: "jdbc:mysql://keycloak-mysql:3306/keycloak" }
            - { name: KC_DB_USERNAME,     value: keycloak }
            - { name: KC_DB_PASSWORD,     valueFrom: { secretKeyRef: { name: keycloak-secrets, key: KC_DB_PASSWORD } } }
            - { name: KC_HOSTNAME_STRICT, value: "false" }
            - { name: KC_HTTP_ENABLED,    value: "true" }
            - { name: KC_PROXY,           value: edge }
            - { name: KEYCLOAK_ADMIN,     value: admin }
            - { name: KEYCLOAK_ADMIN_PASSWORD, valueFrom: { secretKeyRef: { name: keycloak-secrets, key: KEYCLOAK_ADMIN_PASSWORD } } }
            - { name: JAVA_OPTS_APPEND,   value: "-Xms512m -Xmx1024m -XX:+UseContainerSupport" }
          resources:
            requests: { cpu: "500m",  memory: "768Mi" }
            limits:   { cpu: "1500m", memory: "1.5Gi" }
          livenessProbe:
            httpGet: { path: /health/live, port: 8080 }
            initialDelaySeconds: 120
            periodSeconds: 30
            failureThreshold: 5
          readinessProbe:
            httpGet: { path: /health/ready, port: 8080 }
            initialDelaySeconds: 90
            periodSeconds: 15
          volumeMounts:
            - name: realm-config
              mountPath: /opt/keycloak/data/import
              readOnly: true
      volumes:
        - name: realm-config
          configMap: { name: keycloak-realm-config }
```

---

## `k8s/backend/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: devapp
  labels: { app: backend, tier: api, version: v1 }
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxSurge: 1, maxUnavailable: 0 }
  selector:
    matchLabels: { app: backend }
  template:
    metadata:
      labels: { app: backend, tier: api }
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/path:   "/actuator/prometheus"
        prometheus.io/port:   "8080"
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      terminationGracePeriodSeconds: 60
      containers:
        - name: backend
          image: devapp/backend:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 8080
          env:
            - { name: SPRING_DATASOURCE_URL,      value: "jdbc:mysql://mysql:3306/devapp" }
            - { name: SPRING_DATASOURCE_USERNAME,  value: devapp }
            - { name: SPRING_DATASOURCE_PASSWORD,  valueFrom: { secretKeyRef: { name: backend-secrets, key: MYSQL_PASSWORD } } }
            - { name: JWT_SECRET,                  valueFrom: { secretKeyRef: { name: backend-secrets, key: JWT_SECRET } } }
            - { name: KEYCLOAK_CLIENT_SECRET,      valueFrom: { secretKeyRef: { name: backend-secrets, key: KEYCLOAK_CLIENT_SECRET } } }
            - { name: SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI, value: "https://auth.devapp.example.com/realms/devapp" }
          resources:
            requests: { cpu: "250m", memory: "512Mi" }
            limits:   { cpu: "1.0",  memory: "1Gi"   }
          livenessProbe:
            httpGet: { path: /actuator/health/liveness,  port: 8080 }
            initialDelaySeconds: 60
            periodSeconds: 15
            failureThreshold: 3
          readinessProbe:
            httpGet: { path: /actuator/health/readiness, port: 8080 }
            initialDelaySeconds: 45
            periodSeconds: 10
          lifecycle:
            preStop:
              exec:
                command: ["sh", "-c", "sleep 10"]
```

---

## `k8s/backend/hpa.yaml`

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: devapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

---

## `k8s/backend/pdb.yaml`

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: backend-pdb
  namespace: devapp
spec:
  minAvailable: 2
  selector:
    matchLabels: { app: backend }
```

---

## `k8s/frontend/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: devapp
  labels: { app: frontend, tier: web }
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxSurge: 1, maxUnavailable: 0 }
  selector:
    matchLabels: { app: frontend }
  template:
    metadata:
      labels: { app: frontend, tier: web }
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 101   # nginx default non-root
      containers:
        - name: frontend
          image: devapp/frontend:latest
          imagePullPolicy: Always
          ports: [{ containerPort: 80 }]
          resources:
            requests: { cpu: "100m", memory: "128Mi" }
            limits:   { cpu: "500m", memory: "256Mi" }
          livenessProbe:
            httpGet: { path: /, port: 80 }
            periodSeconds: 15
          readinessProbe:
            httpGet: { path: /, port: 80 }
            initialDelaySeconds: 5
            periodSeconds: 5
          volumeMounts:
            - name: nginx-config
              mountPath: /etc/nginx/conf.d/default.conf
              subPath: default.conf
      volumes:
        - name: nginx-config
          configMap: { name: frontend-nginx-config }
```

---

## `k8s/ingress/ingress.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: devapp-ingress
  namespace: devapp
  annotations:
    kubernetes.io/ingress.class:             nginx
    cert-manager.io/cluster-issuer:          letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    # Rate limit at ingress level (backup to Apiman)
    nginx.ingress.kubernetes.io/limit-rps:   "50"
    nginx.ingress.kubernetes.io/limit-connections: "20"
spec:
  tls:
    - hosts:
        - devapp.example.com
        - api.devapp.example.com
        - auth.devapp.example.com
        - gateway.devapp.example.com
      secretName: devapp-tls-cert
  rules:
    - host: devapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port: { number: 80 }

    - host: api.devapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: backend
                port: { number: 8080 }

    - host: auth.devapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: keycloak
                port: { number: 8080 }

    - host: gateway.devapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: apiman
                port: { number: 8081 }
```

---

## `k8s/ingress/certificate.yaml`

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: devapp-tls
  namespace: devapp
spec:
  secretName: devapp-tls-cert
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - devapp.example.com
    - api.devapp.example.com
    - auth.devapp.example.com
    - gateway.devapp.example.com
```

---

## kubectl: Full Deployment Commands

```bash
# ── Prerequisites ───────────────────────────────────────────────
# 1. Build and push Docker images
docker build -t devapp/backend:latest  ./backend
docker build -t devapp/frontend:latest ./frontend
docker push devapp/backend:latest
docker push devapp/frontend:latest

# ── Install Cluster Addons (once per cluster) ───────────────────
# ingress-nginx
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx --create-namespace

# cert-manager
helm upgrade --install cert-manager cert-manager \
  --repo https://charts.jetstack.io \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true

# ClusterIssuer (Let's Encrypt)
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ops@devapp.example.com
    privateKeySecretRef: { name: letsencrypt-prod }
    solvers:
      - http01:
          ingress:
            class: nginx
EOF

# ── Deploy DevSync ───────────────────────────────────────────────
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets/           # create secrets first
kubectl apply -f k8s/configmaps/
kubectl apply -f k8s/mysql/
kubectl apply -f k8s/keycloak/
kubectl apply -f k8s/apiman/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/ingress/

# ── Check rollout ────────────────────────────────────────────────
kubectl rollout status deployment/backend  -n devapp
kubectl rollout status deployment/keycloak -n devapp
kubectl rollout status deployment/frontend -n devapp

# ── Useful debugging ─────────────────────────────────────────────
kubectl get all -n devapp
kubectl describe pod -l app=backend -n devapp
kubectl logs -l app=backend -n devapp --tail=100 -f
kubectl top pods -n devapp

# ── Minikube local dev ───────────────────────────────────────────
minikube start --cpus=4 --memory=8g --driver=docker
minikube addons enable ingress
minikube addons enable metrics-server
eval $(minikube docker-env)   # build images directly into minikube
```

---

## Local Dev with Minikube: `/etc/hosts`

```
# Add these after running: minikube ip
192.168.49.2  devapp.local
192.168.49.2  api.devapp.local
192.168.49.2  auth.devapp.local
192.168.49.2  gateway.devapp.local
```
