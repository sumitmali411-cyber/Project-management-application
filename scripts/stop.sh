#!/usr/bin/env bash
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/logs"

echo "Stopping services..."
for svc in backend frontend keycloak; do
    pid_file="$LOG_DIR/$svc.pid"
    if [[ -f "$pid_file" ]]; then
        PID=$(cat "$pid_file")
        kill "$PID" 2>/dev/null && echo "  Stopped $svc (PID $PID)" || echo "  $svc not running"
        rm -f "$pid_file"
    fi
done
cd "$ROOT" && docker-compose stop mysql portainer keycloak 2>/dev/null || true
echo "Done."
