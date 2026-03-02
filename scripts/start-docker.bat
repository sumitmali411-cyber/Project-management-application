@echo off
:: ============================================================
:: DevSync — Docker Mode Startup
:: All services (MySQL, Keycloak, Portainer) run in Docker.
:: Backend + Frontend run natively via Maven / Node.
:: ============================================================
setlocal EnableDelayedExpansion

set "ROOT=%~dp0.."
set "KC_THEME_SRC=%ROOT%\keycloak\themes\devsync"
set "KC_REALM_JSON=%ROOT%\keycloak\realm-config\devsync-realm.json"
set "KC_CONTAINER=devapp-keycloak"
set "KC_URL=http://localhost:8180"
set "BACKEND_DIR=%ROOT%\backend"
set "FRONTEND_DIR=%ROOT%\frontend"
set "LOG_DIR=%ROOT%\logs"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo.
echo  ========================================
echo   DevSync  ^|  Docker Startup Mode
echo  ========================================
echo.

:: ── 1. Check Docker ──────────────────────────────────────────
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Start Docker Desktop first.
    pause & exit /b 1
)
echo [OK] Docker is running

:: ── 2. Start MySQL + Portainer (Keycloak shared — see below) ─
echo.
echo [1/5] Starting MySQL + Portainer...
cd /d "%ROOT%"
docker-compose up -d mysql portainer
if errorlevel 1 (
    echo [ERROR] docker-compose failed.
    pause & exit /b 1
)

:: ── 3. Wait for MySQL ─────────────────────────────────────────
echo.
echo [2/5] Waiting for MySQL to be healthy...
:wait_mysql
docker exec devapp-mysql mysqladmin ping -h localhost -u root -proot --silent >nul 2>&1
if errorlevel 1 (
    echo     ... still waiting
    timeout /t 3 /nobreak >nul
    goto wait_mysql
)
echo [OK] MySQL is healthy

:: ── 4. Keycloak: reuse JIRA-Clone's or start standalone ───────
echo.
echo [3/5] Checking Keycloak at %KC_URL% ...
curl -s -o nul -w "%%{http_code}" "%KC_URL%/realms/master" 2>nul | findstr "200" >nul
if not errorlevel 1 (
    echo [OK] Keycloak already running — reusing shared instance (JIRA-Clone's Keycloak)
    goto keycloak_ready
)
echo     Keycloak not running — starting standalone DevSync Keycloak...
docker-compose --profile standalone-keycloak up -d keycloak
:wait_kc
timeout /t 5 /nobreak >nul
curl -s -o nul -w "%%{http_code}" "%KC_URL%/realms/master" 2>nul | findstr "200" >nul
if errorlevel 1 (
    echo     ... still waiting
    goto wait_kc
)
echo [OK] Keycloak is up
:keycloak_ready

:: Copy custom theme into container
echo     Copying DevSync theme into Keycloak container...
docker cp "%KC_THEME_SRC%" "%KC_CONTAINER%:/opt/keycloak/themes/devsync" >nul 2>&1
if errorlevel 1 (
    echo [WARN] Theme copy failed — Keycloak will use default theme
) else (
    echo [OK] Theme copied
)

:: Import realm (ignore error if realm already exists)
echo     Importing devsync realm...
docker exec -i "%KC_CONTAINER%" /opt/keycloak/bin/kc.sh import --file /tmp/devsync-realm.json >nul 2>&1
docker cp "%KC_REALM_JSON%" "%KC_CONTAINER%:/tmp/devsync-realm.json" >nul 2>&1
docker exec "%KC_CONTAINER%" /opt/keycloak/bin/kcadm.sh config credentials ^
    --server http://localhost:8080 --realm master ^
    --user admin --password admin >nul 2>&1
docker exec "%KC_CONTAINER%" /opt/keycloak/bin/kcadm.sh create realms ^
    -f /tmp/devsync-realm.json >nul 2>&1
if errorlevel 1 (
    echo [INFO] Realm may already exist — skipping import
) else (
    echo [OK] Realm imported
)

:: ── 5. Start Backend ──────────────────────────────────────────
echo.
echo [4/5] Starting Spring Boot backend...
start "DevSync Backend" /D "%BACKEND_DIR%" cmd /c "mvn spring-boot:run > "%LOG_DIR%\backend.log" 2>&1"
echo [OK] Backend starting — logs: logs\backend.log

:: ── 6. Start Frontend ─────────────────────────────────────────
echo.
echo [5/5] Starting Angular frontend...
start "DevSync Frontend" /D "%FRONTEND_DIR%" cmd /c "node start.js > "%LOG_DIR%\frontend.log" 2>&1"
echo [OK] Frontend starting — logs: logs\frontend.log

:: ── Done ──────────────────────────────────────────────────────
echo.
echo  ========================================
echo   All services started!
echo  ----------------------------------------
echo   App          http://localhost:4300
echo   Backend API  http://localhost:9090
echo   Keycloak     http://localhost:8180 (shared with JIRA-Clone)
echo   Portainer    http://localhost:9000
echo   MySQL        localhost:3309
echo  ----------------------------------------
echo   Keycloak admin:  admin / admin
echo   App admin user:  admin@devapp.com / Admin@123
echo  ========================================
echo.
echo  Press any key to tail backend logs (Ctrl+C to stop tailing)
pause >nul
type "%LOG_DIR%\backend.log"
