@echo off
:: ============================================================
:: DevSync — Local ZIP Mode Startup
:: Keycloak extracted from C:\comic\keycloak-24.0.0.zip
:: MySQL + Portainer still run in Docker (lightweight).
:: Backend + Frontend run natively.
:: ============================================================
setlocal EnableDelayedExpansion

set "ROOT=%~dp0.."
set "KC_ZIP=C:\comic\keycloak-24.0.0.zip"
set "KC_EXTRACT_DIR=%ROOT%\.keycloak-local"
set "KC_HOME=%KC_EXTRACT_DIR%\keycloak-24.0.0"
set "KC_THEME_SRC=%ROOT%\keycloak\themes\devsync"
set "KC_REALM_JSON=%ROOT%\keycloak\realm-config\devsync-realm.json"
set "KC_PORT=8280"
set "BACKEND_DIR=%ROOT%\backend"
set "FRONTEND_DIR=%ROOT%\frontend"
set "LOG_DIR=%ROOT%\logs"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo.
echo  ========================================
echo   DevSync  ^|  Local ZIP Mode
echo   Keycloak: %KC_ZIP%
echo  ========================================
echo.

:: ── 1. Check Docker (for MySQL only) ─────────────────────────
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. MySQL runs in Docker — start Docker Desktop first.
    pause & exit /b 1
)
echo [OK] Docker is running

:: ── 2. Check ZIP exists ───────────────────────────────────────
if not exist "%KC_ZIP%" (
    echo [ERROR] Keycloak ZIP not found at %KC_ZIP%
    echo         Place keycloak-24.0.0.zip at that path and retry.
    pause & exit /b 1
)
echo [OK] Keycloak ZIP found

:: ── 3. Extract Keycloak (only if not already extracted) ───────
if not exist "%KC_HOME%\bin\kc.bat" (
    echo.
    echo [1/6] Extracting Keycloak from ZIP...
    if not exist "%KC_EXTRACT_DIR%" mkdir "%KC_EXTRACT_DIR%"
    powershell -NoProfile -Command ^
      "Expand-Archive -LiteralPath '%KC_ZIP%' -DestinationPath '%KC_EXTRACT_DIR%' -Force"
    if errorlevel 1 (
        echo [ERROR] Extraction failed.
        pause & exit /b 1
    )
    echo [OK] Extracted to %KC_HOME%
) else (
    echo [1/6] Keycloak already extracted — skipping
)

:: ── 4. Copy DevSync theme into local KC ───────────────────────
echo.
echo [2/6] Copying DevSync theme...
if not exist "%KC_HOME%\themes\devsync" mkdir "%KC_HOME%\themes\devsync"
xcopy /E /Y /I /Q "%KC_THEME_SRC%" "%KC_HOME%\themes\devsync" >nul
echo [OK] Theme installed at %KC_HOME%\themes\devsync

:: ── 5. Start MySQL + Portainer in Docker ──────────────────────
echo.
echo [3/6] Starting MySQL + Portainer via Docker...
cd /d "%ROOT%"
docker-compose up -d mysql portainer
if errorlevel 1 (
    echo [ERROR] docker-compose failed for MySQL/Portainer.
    pause & exit /b 1
)

:: Wait for MySQL
echo     Waiting for MySQL...
:wait_mysql
docker exec devapp-mysql mysqladmin ping -h localhost -u root -proot --silent >nul 2>&1
if errorlevel 1 (
    echo     ... still waiting
    timeout /t 3 /nobreak >nul
    goto wait_mysql
)
echo [OK] MySQL healthy

:: ── 6. Start Keycloak locally ─────────────────────────────────
echo.
echo [4/6] Starting Keycloak locally on port %KC_PORT% ...
set "KC_HTTP_PORT=%KC_PORT%"
start "DevSync Keycloak" /D "%KC_HOME%\bin" cmd /c ^
    "kc.bat start-dev --http-port=%KC_PORT% > "%LOG_DIR%\keycloak.log" 2>&1"
echo [OK] Keycloak starting — logs: logs\keycloak.log

:: Wait for Keycloak to be ready
echo     Waiting for Keycloak at http://localhost:%KC_PORT% ...
:wait_kc
timeout /t 5 /nobreak >nul
curl -s -o nul -w "%%{http_code}" "http://localhost:%KC_PORT%/realms/master" 2>nul | findstr "200" >nul
if errorlevel 1 (
    echo     ... still waiting
    goto wait_kc
)
echo [OK] Keycloak is up

:: Import realm via kcadm
echo     Importing devsync realm...
copy /Y "%KC_REALM_JSON%" "%KC_HOME%\bin\devsync-realm.json" >nul
cd /d "%KC_HOME%\bin"
call kcadm.bat config credentials ^
    --server "http://localhost:%KC_PORT%" ^
    --realm master ^
    --user admin --password admin >nul 2>&1
call kcadm.bat create realms -f devsync-realm.json >nul 2>&1
if errorlevel 1 (
    echo [INFO] Realm may already exist — skipping import
) else (
    echo [OK] devsync realm imported
)
cd /d "%ROOT%"

:: ── 7. Start Backend ──────────────────────────────────────────
echo.
echo [5/6] Starting Spring Boot backend...
start "DevSync Backend" /D "%BACKEND_DIR%" cmd /c ^
    "mvn spring-boot:run > "%LOG_DIR%\backend.log" 2>&1"
echo [OK] Backend starting — logs: logs\backend.log

:: ── 8. Start Frontend ─────────────────────────────────────────
echo.
echo [6/6] Starting Angular frontend...
start "DevSync Frontend" /D "%FRONTEND_DIR%" cmd /c ^
    "node start.js > "%LOG_DIR%\frontend.log" 2>&1"
echo [OK] Frontend starting — logs: logs\frontend.log

:: ── Done ──────────────────────────────────────────────────────
echo.
echo  ========================================
echo   All services started! (Local ZIP Mode)
echo  ----------------------------------------
echo   App          http://localhost:4300
echo   Backend API  http://localhost:9090
echo   Keycloak     http://localhost:%KC_PORT%
echo   Portainer    http://localhost:9000
echo   MySQL        localhost:3309
echo  ----------------------------------------
echo   Keycloak ZIP source: %KC_ZIP%
echo   Keycloak home:       %KC_HOME%
echo   Keycloak admin:      admin / admin
echo   App admin user:      admin@devapp.com / Admin@123
echo  ----------------------------------------
echo   Logs folder: %LOG_DIR%
echo  ========================================
echo.
pause
