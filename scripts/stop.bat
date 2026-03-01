@echo off
:: DevSync — Stop all services
echo Stopping Docker services...
cd /d "%~dp0.."
docker-compose stop mysql keycloak portainer devapp-keycloak 2>nul

echo Killing backend / frontend windows (close the titled windows or use Task Manager)
taskkill /FI "WINDOWTITLE eq DevSync Backend" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq DevSync Frontend" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq DevSync Keycloak" /F >nul 2>&1
echo Done.
pause
