@echo off
echo ========================================
echo   PokeWorld - Serveur Local
echo ========================================
echo.
echo Demarrage du serveur HTTP sur le port 8080
echo.
echo Ouvre http://localhost:8080 dans ton navigateur
echo.
echo Pour arreter le serveur : Ctrl+C
echo.
echo ========================================
echo.
python3 -m http.server 8080 --directory "%~dp0"
pause
