#!/usr/bin/env bash
# ============================================================
# DevSync — Local ZIP Mode Startup (Linux / Mac / WSL)
# Keycloak extracted from C:\comic\keycloak-24.0.0.zip
# MySQL + Portainer still in Docker.
# Backend + Frontend run natively.
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ── Paths ─────────────────────────────────────────────────────
# On WSL Windows path is accessible via /mnt/c
KC_ZIP_WIN="C:\\comic\\keycloak-24.0.0.zip"
KC_ZIP_WSL="/mnt/c/comic/keycloak-24.0.0.zip"   # WSL path
KC_ZIP_NATIVE="/c/comic/keycloak-24.0.0.zip"    # Git Bash path

# Auto-detect which path works
KC_ZIP=""
[[ -f "$KC_ZIP_WSL"    ]] && KC_ZIP="$KC_ZIP_WSL"
[[ -f "$KC_ZIP_NATIVE" ]] && KC_ZIP="$KC_ZIP_NATIVE"
[[ -f "C:/comic/keycloak-24.0.0.zip" ]] && KC_ZIP="C:/comic/keycloak-24.0.0.zip"

KC_EXTRACT_DIR="$ROOT/.keycloak-local"
KC_HOME="$KC_EXTRACT_DIR/keycloak-24.0.0"
KC_THEME_SRC="$ROOT/keycloak/themes/devsync"
KC_REALM_JSON="$ROOT/keycloak/realm-config/devsync-realm.json"
KC_PORT=8280
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"

GRN='\033[0;32m'; YEL='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GRN}[OK]${NC} $*"; }
info() { echo -e "${YEL}[..] $*${NC}"; }
err()  { echo -e "${RED}[ERR]${NC} $*"; exit 1; }

echo ""
echo " ========================================"
echo "  DevSync  |  Local ZIP Mode"
echo " ========================================"
echo ""

# ── 1. Validate ZIP ───────────────────────────────────────────
[[ -n "$KC_ZIP" ]] || err "Keycloak ZIP not found. Expected: $KC_ZIP_WIN"
ok "ZIP found: $KC_ZIP"

# ── 2. Check Docker ───────────────────────────────────────────
docker info &>/dev/null || err "Docker is not running (needed for MySQL)."
ok "Docker running"

# ── 3. Extract Keycloak ───────────────────────────────────────
if [[ ! -f "$KC_HOME/bin/kc.sh" ]]; then
    info "Extracting Keycloak..."
    mkdir -p "$KC_EXTRACT_DIR"
    unzip -q "$KC_ZIP" -d "$KC_EXTRACT_DIR"
    chmod +x "$KC_HOME/bin/kc.sh" "$KC_HOME/bin/kcadm.sh" 2>/dev/null || true
    ok "Extracted to $KC_HOME"
else
    ok "Keycloak already extracted — skipping"
fi

# ── 4. Install theme ──────────────────────────────────────────
info "Copying DevSync theme..."
mkdir -p "$KC_HOME/themes/devsync"
cp -r "$KC_THEME_SRC/." "$KC_HOME/themes/devsync/"
ok "Theme installed"

# ── 5. MySQL + Portainer ──────────────────────────────────────
info "Starting MySQL + Portainer..."
cd "$ROOT"
docker-compose up -d mysql portainer
until docker exec devapp-mysql mysqladmin ping -h localhost -u root -proot --silent &>/dev/null; do
    sleep 2
done
ok "MySQL healthy"

# ── 6. Start Keycloak locally ─────────────────────────────────
info "Starting Keycloak on port $KC_PORT ..."
nohup "$KC_HOME/bin/kc.sh" start-dev --http-port="$KC_PORT" \
    > "$LOG_DIR/keycloak.log" 2>&1 &
echo $! > "$LOG_DIR/keycloak.pid"
ok "Keycloak starting (PID $(cat "$LOG_DIR/keycloak.pid")) — logs/keycloak.log"

# Wait until ready
info "Waiting for Keycloak at http://localhost:$KC_PORT ..."
until curl -sf "http://localhost:$KC_PORT/realms/master" &>/dev/null; do sleep 3; done
ok "Keycloak up"

# ── 7. Import realm ───────────────────────────────────────────
info "Importing devsync realm..."
cp "$KC_REALM_JSON" "$KC_HOME/bin/devsync-realm.json"
cd "$KC_HOME/bin"
./kcadm.sh config credentials \
    --server "http://localhost:$KC_PORT" --realm master \
    --user admin --password admin &>/dev/null
./kcadm.sh create realms -f devsync-realm.json &>/dev/null && ok "Realm imported" \
    || echo "  [INFO] Realm already exists — skipped"
cd "$ROOT"

# ── 8. Backend ────────────────────────────────────────────────
info "Starting Spring Boot backend..."
cd "$ROOT/backend"
nohup mvn spring-boot:run > "$LOG_DIR/backend.log" 2>&1 &
echo $! > "$LOG_DIR/backend.pid"
ok "Backend starting — logs/backend.log"

# ── 9. Frontend ───────────────────────────────────────────────
info "Starting Angular frontend..."
cd "$ROOT/frontend"
nohup node start.js > "$LOG_DIR/frontend.log" 2>&1 &
echo $! > "$LOG_DIR/frontend.pid"
ok "Frontend starting — logs/frontend.log"

cd "$ROOT"
echo ""
echo " ========================================"
echo "  All services started! (Local ZIP Mode)"
echo " ----------------------------------------"
echo "  App          http://localhost:4300"
echo "  Backend      http://localhost:9090"
echo "  Keycloak     http://localhost:$KC_PORT"
echo "  Portainer    http://localhost:9000"
echo "  MySQL        localhost:3309"
echo " ----------------------------------------"
echo "  KC ZIP:    $KC_ZIP"
echo "  KC Home:   $KC_HOME"
echo "  KC admin:  admin / admin"
echo "  App user:  admin@devapp.com / Admin@123"
echo " ========================================"
echo ""
