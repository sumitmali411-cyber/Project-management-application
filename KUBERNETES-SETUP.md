# DevSync — Kubernetes Cluster Setup Guide

This document covers everything needed to run DevSync on Kubernetes — from a local
development cluster using kind, to production deployment on AWS EKS, GCP GKE, or
Azure AKS.


## Table of Contents

1. Prerequisites
2. Local Cluster (kind) — for development
3. Build and Push Docker Images
4. Cluster-Level Infrastructure (ingress-nginx, cert-manager)
5. Deploying DevSync
6. Production Cluster Options
7. GitHub Webhook Integration
8. Operating the Cluster (scaling, upgrades, troubleshooting)


---

## 1. Prerequisites

Install these tools on your workstation before starting.

```
Tool            Minimum Version   Install
──────────────  ───────────────   ──────────────────────────────────────────────
kubectl         1.29              https://kubernetes.io/docs/tasks/tools/
kind            0.22              brew install kind   /   choco install kind
helm            3.14              brew install helm   /   choco install kubernetes-helm
docker          24+               Docker Desktop (Windows/Mac) or Docker Engine
```

Verify:
```bash
kubectl version --client
kind version
helm version
docker version
```


---

## 2. Local Cluster with kind

kind (Kubernetes IN Docker) runs a real K8s cluster inside Docker containers.
Use this for local dev and CI.

### 2a. Create the cluster

Create a file called `kind-config.yaml`:

```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - containerPort: 80
        hostPort: 8090       # access the app at http://localhost:8090
        protocol: TCP
      - containerPort: 443
        hostPort: 8443
        protocol: TCP
  - role: worker
  - role: worker
```

```bash
kind create cluster --name devapp --config kind-config.yaml
kubectl cluster-info --context kind-devapp
```

### 2b. Install ingress-nginx for kind

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Wait for it to be ready
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s
```

### 2c. (Optional) Install cert-manager

For local dev you can skip TLS and use plain HTTP.
For staging/production, install cert-manager:

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true \
  --version v1.14.4
```

Create a ClusterIssuer for Let's Encrypt (production):

```yaml
# letsencrypt-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com      # <-- change this
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

```bash
kubectl apply -f letsencrypt-issuer.yaml
```

Note: Let's Encrypt requires your domain to be publicly reachable.
For local dev, skip cert-manager and remove TLS from k8s/05-ingress.yaml.


---

## 3. Build and Push Docker Images

### 3a. Backend image

The backend needs a Maven wrapper. If it is missing, generate it first:

```bash
cd backend
mvn wrapper:wrapper    # creates mvnw + .mvn/
```

Build and push:

```bash
# Set your container registry (GitHub Container Registry shown)
export REGISTRY=ghcr.io/YOUR_GITHUB_USERNAME

# Build
docker build -t $REGISTRY/devapp-backend:latest ./backend

# Push  (authenticate first: echo $CR_PAT | docker login ghcr.io -u USERNAME --password-stdin)
docker push $REGISTRY/devapp-backend:latest
```

### 3b. Frontend image

```bash
docker build -t $REGISTRY/devapp-frontend:latest ./frontend
docker push $REGISTRY/devapp-frontend:latest
```

### 3c. Update image references in manifests

Open k8s/03-backend.yaml and k8s/04-frontend.yaml and replace:

```
ghcr.io/YOUR_ORG/devapp-backend:latest
ghcr.io/YOUR_ORG/devapp-frontend:latest
```

with your actual registry paths.

### 3d. Load images into kind (skip if using a real registry)

If you are working locally and don't want to push to a registry:

```bash
kind load docker-image $REGISTRY/devapp-backend:latest  --name devapp
kind load docker-image $REGISTRY/devapp-frontend:latest --name devapp
```

Then in the Deployment specs, set `imagePullPolicy: Never` to prevent K8s
from trying to pull from the internet.


---

## 4. Deploying DevSync to the Cluster

### 4a. Encode your secrets

Every value in k8s/01-secrets.yaml must be base64-encoded:

```bash
# Example
echo -n 'my-super-secret-root-pass' | base64
# → bXktc3VwZXItc2VjcmV0LXJvb3QtcGFzcw==
```

Fill in the placeholders in k8s/01-secrets.yaml.

Generate a strong JWT secret (must be 32+ chars):
```bash
openssl rand -base64 48
```

Generate a GitHub webhook secret:
```bash
openssl rand -hex 32
```

### 4b. Apply all manifests in order

```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-secrets.yaml
kubectl apply -f k8s/02-mysql-statefulset.yaml

# Wait for MySQL to be ready before starting the backend
# (Flyway runs migrations on startup and needs the DB to be up)
kubectl rollout status statefulset/mysql -n devapp --timeout=120s

kubectl apply -f k8s/03-backend.yaml
kubectl apply -f k8s/04-frontend.yaml
kubectl apply -f k8s/05-ingress.yaml
```

### 4c. Verify everything is running

```bash
kubectl get all -n devapp
```

Expected output (all pods Running, all services up):

```
NAME                            READY   STATUS    RESTARTS   AGE
pod/mysql-0                     1/1     Running   0          2m
pod/backend-6c8b9d747f-k2pnx   1/1     Running   0          90s
pod/backend-6c8b9d747f-m7vqt   1/1     Running   0          90s
pod/frontend-74dfb88fd-jxtrv   1/1     Running   0          60s
pod/frontend-74dfb88fd-q9pbl   1/1     Running   0          60s

NAME                TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)
service/mysql       ClusterIP   None             <none>        3306/TCP
service/backend     ClusterIP   10.96.145.23     <none>        9090/TCP
service/frontend    ClusterIP   10.96.88.42      <none>        80/TCP
```

Check backend logs (Flyway migration output):
```bash
kubectl logs -n devapp deployment/backend --tail=50
```

Check that migrations ran:
```bash
kubectl exec -n devapp pod/mysql-0 -- mysql -u devapp -p devapp -e "SHOW TABLES;"
```

### 4d. Access the app (kind local cluster)

For kind, the ingress maps to localhost on ports 8090/8443 (set in kind-config.yaml).
Edit your /etc/hosts (C:\Windows\System32\drivers\etc\hosts on Windows):

```
127.0.0.1   app.devapp.local
127.0.0.1   api.devapp.local
```

Then update k8s/05-ingress.yaml to use `app.devapp.local` and `api.devapp.local`
instead of the real domain, and remove the cert-manager TLS section.

Open http://app.devapp.local:8090 in your browser.


---

## 5. Production Cluster Options

### Option A — AWS EKS

```bash
# Install eksctl
brew install eksctl   # or: choco install eksctl

# Create cluster (2 node groups: on-demand for stateful, spot for stateless)
eksctl create cluster \
  --name devapp-prod \
  --region ap-south-1 \
  --nodegroup-name standard \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 6 \
  --managed

# Install AWS Load Balancer Controller (for Ingress on EKS)
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=devapp-prod \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller

# OR use ingress-nginx (simpler, works the same as local):
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx --namespace ingress-nginx --create-namespace
```

Storage class for MySQL PVC on EKS — use gp3:
In k8s/02-mysql-statefulset.yaml, uncomment:
```yaml
storageClassName: gp3
```

And create the storage class if needed:
```bash
kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
reclaimPolicy: Retain
allowVolumeExpansion: true
EOF
```

### Option B — GCP GKE (Autopilot)

```bash
gcloud container clusters create-auto devapp-prod \
  --region asia-south1 \
  --release-channel stable

gcloud container clusters get-credentials devapp-prod --region asia-south1
```

GKE Autopilot automatically scales nodes, handles node security, and includes
a built-in ingress controller. Use the GKE Ingress class instead of ingress-nginx:

```yaml
# In k8s/05-ingress.yaml, change annotation:
kubernetes.io/ingress.class: "gce"
```

### Option C — Azure AKS

```bash
az group create --name devapp-rg --location eastus

az aks create \
  --resource-group devapp-rg \
  --name devapp-prod \
  --node-count 3 \
  --node-vm-size Standard_D2s_v3 \
  --enable-addons monitoring \
  --generate-ssh-keys

az aks get-credentials --resource-group devapp-rg --name devapp-prod
```

Install ingress-nginx on AKS:
```bash
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz
```


---

## 6. GitHub Webhook Integration

The webhook endpoint is `/api/v1/webhooks/commits` on the backend.

### Step 1 — Set the repository URL on your project

Log in to DevSync → open the project → Settings tab → paste the full GitHub
repository URL in the "Repository URL" field (e.g. https://github.com/yourorg/yourrepo).

The backend matches incoming push events to a project by comparing this URL
against the `repository.html_url` field in the webhook payload.

### Step 2 — Generate and save the webhook secret

```bash
openssl rand -hex 32
# Example output: a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1
```

On your Kubernetes cluster, update the backend-secret:
```bash
kubectl create secret generic backend-secret \
  --namespace devapp \
  --from-literal=jwt-secret='your-jwt-secret' \
  --from-literal=github-webhook-secret='the-hex-value-above' \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart backend to pick up the new secret
kubectl rollout restart deployment/backend -n devapp
```

For local dev (not K8s), set the env var before starting:
```bash
export GITHUB_WEBHOOK_SECRET=the-hex-value-above
mvn spring-boot:run
```

### Step 3 — Configure the webhook in GitHub

1. Go to your GitHub repository
2. Settings → Webhooks → Add webhook
3. Fill in:
   - Payload URL:  https://api.devapp.example.com/api/v1/webhooks/commits
   - Content type: application/json
   - Secret:       paste the same hex value from Step 2
   - Which events: select "Just the push event"
4. Click Add webhook
5. GitHub sends a ping event — check the backend logs:
   ```bash
   kubectl logs -n devapp deployment/backend --tail=20 -f
   ```
   You should see: "Ignoring webhook event type 'ping'"
   That is correct — only push events are processed.

### Step 4 — Verify auto-linking works

Push a commit with `#<task-id>` in the message, e.g.:
```
git commit -m "fixes #42 — null pointer in task service"
```

After the push, open DevSync → Commits → select the project.
The commit should appear with a linked task badge showing #42.

Supported keywords (case-insensitive):
- #42
- fixes #42
- fixed #42
- closes #42
- resolves #42

### Troubleshooting webhook

1. Check GitHub delivery logs:
   GitHub → Settings → Webhooks → click your webhook → Recent Deliveries
   Red X = backend returned non-200. Click the delivery to see the response body.

2. Check backend logs:
   ```bash
   kubectl logs -n devapp deployment/backend -f
   ```
   Look for lines starting with "Webhook".

3. Common issues:
   - "invalid signature" — GITHUB_WEBHOOK_SECRET env var doesn't match what you set in GitHub
   - "no project matched repo URL" — project's Repository URL field is empty or wrong
   - 401 Unauthorized — signature validation failed


---

## 7. Operating the Cluster

### Scaling

Scale backend manually:
```bash
kubectl scale deployment backend --replicas=4 -n devapp
```

The HPA (k8s/03-backend.yaml) auto-scales between 2 and 6 replicas when CPU > 70%.

### Rolling update (new image version)

```bash
# Build and push new image with a specific tag
docker build -t $REGISTRY/devapp-backend:v1.1.0 ./backend
docker push $REGISTRY/devapp-backend:v1.1.0

# Update the deployment (zero-downtime rolling update)
kubectl set image deployment/backend backend=$REGISTRY/devapp-backend:v1.1.0 -n devapp
kubectl rollout status deployment/backend -n devapp
```

Rollback if something goes wrong:
```bash
kubectl rollout undo deployment/backend -n devapp
```

### Database backups

```bash
# Manual backup
kubectl exec -n devapp pod/mysql-0 -- \
  mysqldump -u root -p devapp --single-transaction --quick | \
  gzip > devapp-backup-$(date +%Y%m%d).sql.gz

# Restore
gzip -dc devapp-backup-20260301.sql.gz | \
  kubectl exec -i -n devapp pod/mysql-0 -- mysql -u root -p devapp
```

For automated backups, add a CronJob that runs mysqldump and uploads to S3/GCS.

### View resource usage

```bash
kubectl top pods -n devapp
kubectl top nodes
```

### Useful troubleshooting commands

```bash
# Get all events (errors show here first)
kubectl get events -n devapp --sort-by='.lastTimestamp'

# Describe a failing pod
kubectl describe pod <pod-name> -n devapp

# Shell into the backend container
kubectl exec -it deployment/backend -n devapp -- /bin/sh

# Shell into MySQL
kubectl exec -it pod/mysql-0 -n devapp -- mysql -u devapp -p devapp

# Port-forward backend locally (skip ingress)
kubectl port-forward svc/backend 9090:9090 -n devapp

# Port-forward frontend locally
kubectl port-forward svc/frontend 8080:80 -n devapp
```

### Delete the cluster (kind only)

```bash
kind delete cluster --name devapp
```


---

## 8. File Reference

```
k8s/
├── 00-namespace.yaml          Namespace: devapp
├── 01-secrets.yaml            Secrets (fill in base64 values before applying)
├── 02-mysql-statefulset.yaml  MySQL 8 StatefulSet + headless Service + ConfigMap
├── 03-backend.yaml            Spring Boot Deployment + Service + HPA (2-6 replicas)
├── 04-frontend.yaml           Angular/nginx Deployment + Service + nginx ConfigMap
└── 05-ingress.yaml            Ingress (ingress-nginx) + cert-manager Certificate

backend/Dockerfile             Multi-stage build: eclipse-temurin:17 → JRE alpine
frontend/Dockerfile            Multi-stage build: node:20 → nginx:1.25
frontend/nginx/default.conf    nginx config for SPA routing + API proxy
```


---

## 9. Security Checklist Before Going Live

- [ ] Replace all placeholder secrets in k8s/01-secrets.yaml with real values
- [ ] Remove any default passwords from application.yml (JWT_SECRET, MYSQL_PASSWORD etc.)
- [ ] Set GITHUB_WEBHOOK_SECRET to the same value as configured in GitHub
- [ ] Update CORS_ALLOWED_ORIGINS in backend-config ConfigMap to your real frontend domain
- [ ] Update Ingress host fields from devapp.example.com to your real domain
- [ ] Verify TLS certificate was issued: `kubectl describe certificate devapp-tls -n devapp`
- [ ] Enable audit logging on your cloud provider's K8s control plane
- [ ] Consider sealed-secrets or Vault for production secret management
