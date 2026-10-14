@echo off
setlocal EnableExtensions
pushd "%~dp0"
title PokeWorld - regeneration dist

REM ============================================================
REM  PokeWorld - regen_dist.bat
REM    regenere le dossier dist (build de production) depuis le
REM    dossier du projet.
REM
REM    1. verifie que Node.js / npm sont presentes
REM    2. installe les dependances si node_modules est absent
REM    3. lance le build complet : vite build + copy-runtime-assets
REM    4. verifie que dist\index.html a bien ete genere
REM
REM    Ensuite, jouer : launch_local_server.bat
REM    Mode dev sans build : launch_local_server.bat dev
REM ============================================================

echo ========================================
echo   PokeWorld - Regeneration de dist
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ERREUR] Node.js introuvable.
    echo          Installez Node.js LTS - https://nodejs.org
    goto fail
)
where npm >nul 2>nul
if errorlevel 1 (
    echo [ERREUR] npm introuvable - il est normalement fourni avec Node.js.
    goto fail
)

REM ---------------- 1) dependances ----------------
if exist "node_modules\vite\" goto deps_ok
echo [1/3] Installation des dependances (premiere fois ou node_modules absent)...
call npm install --no-audit --no-fund
if errorlevel 1 (
    echo [ERREUR] npm install a echoue.
    goto fail
)
:deps_ok
echo [1/3] Dependances OK.
echo.

REM ---------------- 2) build ----------------
echo [2/3] Lancement du build : vite build + copie des assets runtime...
call npm run build
if errorlevel 1 (
    echo [ERREUR] Le build a echoue - voir les messages ci-dessus.
    goto fail
)
echo.

REM ---------------- 3) verification ----------------
echo [3/3] Verification de dist...
if exist "dist\index.html" goto dist_ok
echo [ERREUR] dist\index.html introuvable apres le build.
goto fail

:dist_ok
echo.
echo  ========================================
echo   Build OK : dist\index.html est a jour.
echo.
echo   Pour jouer  : launch_local_server.bat
echo   Pour le dev : launch_local_server.bat dev
echo  ========================================
echo.
popd
pause
exit /b 0

:fail
echo.
popd
pause
exit /b 1
