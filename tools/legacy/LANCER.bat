@echo off
chcp 65001 >nul
title PokéWorld - Lancement
color 0A

echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo                     ⚡ POKÉWORLD ⚡                           ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 🚀 Démarrage du serveur de jeu...
echo.

REM Vérifier Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo ❌ Python n'est pas trouvé !
    echo.
    echo 📥 Téléchargez Python depuis : https://www.python.org/downloads/
    echo    ⚠️ Cochez "Add Python to PATH" pendant l'installation
    echo.
    pause
    exit /b 1
)

echo ✅ Python trouvé :
python --version
echo.
echo 🌐 Le jeu s'ouvrira à : http://localhost:8000
echo.
echo ⏳ Ouverture du navigateur...
timeout /t 2 /nobreak >nul

REM Ouvrir le navigateur
start "" http://localhost:8000

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo   Serveur actif ! Ne fermez pas cette fenêtre.               ║
echo ║  Le jeu est accessible sur : http://localhost:8000          ║
echo ║                                                              ║
echo ║  Pour arrêter : appuyez sur Ctrl+C dans cette fenêtre       ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Lancer le serveur
python -m http.server 8000
