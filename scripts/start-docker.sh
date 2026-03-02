#!/usr/bin/env bash
# ============================================================
# DevSync — Docker Mode Startup (Linux / Mac / WSL)
# MySQL + Keycloak + Portainer in Docker.
# Backend + Frontend run natively.
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KC_THEME_SRC="$ROOT/keycloak/themes/devsync"
KC_REALM_JSON="$ROOT/keycloak/realm-config/devsync-realm.json"
KC_CONTAINER="devapp-keycloak"
KC_URL="http://localhost:8180"  # Shared port with JIRA-Clone (same Keycloak, separate realm)
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"

# colours
GRN='\033[0;32m'; YEL='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GRN}[OK]${NC} $*"; }
info() { echo -e "${YEL}[..] $*${NC}"; }
err()  { echo -e "${RED}[ERR]${NC} $*"; exit 1; }

echo ""
echo " ========================================"
echo "  DevSync  |  Docker Startup Mode"
echo " ========================================"
echo ""

# ── 1. Check Docker ──────────────────────────────────────────
docker info &>/dev/null || err "Docker is not running."
ok "Docker running"

# ── 2. Start MySQL + Portainer (Keycloak is shared — see below) ──────────────
info "Starting MySQL + Portainer..."
cd "$ROOT"
docker-compose up -d mysql portainer
ok "MySQL + Portainer started"

# ── 3. Wait for MySQL ─────────────────────────────────────────
info "Waiting for MySQL..."
until docker exec devapp-mysql mysqladmin ping -h localhost -u root -proot --silent &>/dev/null; do
    sleep 2
done
ok "MySQL healthy"

# ── 4. Keycloak: reuse JIRA-Clone's or start standalone ───────
# Both apps share one Keycloak on port 8180 with separate realms.
# JIRA-Clone's realm: jira-clone | DevSync's realm: devsync
if curl -sf "$KC_URL/realms/master" &>/dev/null; then
    ok "Keycloak already running at $KC_URL (shared with JIRA-Clone — skipping start)"
else
    info "Keycloak not running — starting standalone DevSync Keycloak..."
    docker-compose --profile standalone-keycloak up -d keycloak
    info "Waiting for Keycloak at $KC_URL ..."
    until curl -sf "$KC_URL/realms/master" &>/dev/null; do sleep 3; done
    ok "Keycloak up"
fi

# Copy theme
info "Copying DevSync theme into container..."
docker cp "$KC_THEME_SRC" "$KC_CONTAINER:/opt/keycloak/themes/devsync" && ok "Theme copied" \
    || echo "  [WARN] Theme copy failed — using default theme"

# Import realm
info "Importing devsync realm..."
docker cp "$KC_REALM_JSON" "$KC_CONTAINER:/tmp/devsync-realm.json"
docker exec "$KC_CONTAINER" /opt/keycloak/bin/kcadm.sh config credentials \
    --server http://localhost:8080 --realm master --user admin --password admin &>/dev/null
docker exec "$KC_CONTAINER" /opt/keycloak/bin/kcadm.sh create realms \
    -f /tmp/devsync-realm.json &>/dev/null && ok "Realm imported" \
    || echo "  [INFO] Realm may already exist — skipped"

# ── 5. Backend ────────────────────────────────────────────────
info "Starting Spring Boot backend..."
cd "$ROOT/backend"
nohup mvn spring-boot:run > "$LOG_DIR/backend.log" 2>&1 &
echo $! > "$LOG_DIR/backend.pid"
ok "Backend starting (PID $(cat "$LOG_DIR/backend.pid")) — logs/backend.log"

# ── 6. Frontend ───────────────────────────────────────────────
info "Starting Angular frontend..."
cd "$ROOT/frontend"
nohup node start.js > "$LOG_DIR/frontend.log" 2>&1 &
echo $! > "$LOG_DIR/frontend.pid"
ok "Frontend starting (PID $(cat "$LOG_DIR/frontend.pid")) — logs/frontend.log"

cd "$ROOT"
echo ""
echo " ========================================"
echo "  All services started!"
echo " ----------------------------------------"
echo "  App          http://localhost:4300"
echo "  Backend      http://localhost:9090"
echo "  Keycloak     http://localhost:8180 (shared with JIRA-Clone)"
echo "  Portainer    http://localhost:9000"
echo "  MySQL        localhost:3309"
echo " ----------------------------------------"
echo "  Keycloak:  admin / admin"
echo "  App user:  admin@devapp.com / Admin@123"
echo " ========================================"
echo ""
echo "  Tail logs:   tail -f logs/backend.log"
echo "  Stop all:    scripts/stop.sh"
echo ""
