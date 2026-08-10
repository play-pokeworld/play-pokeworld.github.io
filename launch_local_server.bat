@echo off
setlocal EnableExtensions
pushd "%~dp0"
title PokeWorld - serveur local

REM ============================================================
REM  PokeWorld - lanceur local Windows
REM    launch_local_server.bat          jouer - dist statique, ZERO installation
REM    launch_local_server.bat dev      mode developpeur - npm + vite
REM    launch_local_server.bat 8085     jouer sur un port precis
REM  Le navigateur ne s'ouvre qu'APRES verification que le port ecoute.
REM ============================================================

set "MODE=play"
set "PORT=8080"
if /I "%~1"=="dev" set "MODE=dev"
if /I "%~1"=="dev" if not "%~2"=="" set "PORT=%~2"
if /I not "%~1"=="dev" if not "%~1"=="" set "PORT=%~1"

if /I "%MODE%"=="dev" goto dev_mode

REM ---------------- MODE JOUER : servir dist en statique ----------------
echo ========================================
echo   PokeWorld - Serveur Local - jouer
echo ========================================
echo.

if exist "dist\index.html" goto play_have_dist
echo [INFO] dist introuvable - le jeu sera servi depuis la racine du projet.
echo        Pour un build optimal : npx vite build
echo.
:play_have_dist

netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul 2>nul
if not errorlevel 1 (
    echo.
    echo [ERREUR] Le port %PORT% est deja utilise par un autre programme.
    echo          Fermez l'autre instance ou relancez avec un autre port :
    echo          launch_local_server.bat 8085
    goto fail
)

REM -- 1) Node.js - serveur statique embarque - zero dependance, MIME garanti --
where node >nul 2>nul
if errorlevel 1 goto try_python
echo [Node.js detecte] Demarrage du serveur statique...
start "PokeWorld server - node" /min node "tools\win-static-server.mjs" --port %PORT%
goto open_browser

REM -- 2) Python en secours --
:try_python
where py >nul 2>nul
if errorlevel 1 goto try_python_exe
echo [Python detecte] Demarrage du serveur statique...
if exist "dist\index.html" goto py_dist_a
start "PokeWorld server - python" /min py -3 -m http.server %PORT%
goto open_browser
:py_dist_a
start "PokeWorld server - python" /min py -3 -m http.server %PORT% --directory dist
goto open_browser

:try_python_exe
where python >nul 2>nul
if errorlevel 1 goto try_powershell
echo [Python detecte] Demarrage du serveur statique...
if exist "dist\index.html" goto py_dist_b
start "PokeWorld server - python" /min python -m http.server %PORT%
goto open_browser
:py_dist_b
start "PokeWorld server - python" /min python -m http.server %PORT% --directory dist
goto open_browser

REM -- 3) PowerShell HttpListener en dernier recours --
:try_powershell
echo [PowerShell] Demarrage du serveur statique...
start "PokeWorld server - powershell" /min powershell -NoProfile -ExecutionPolicy Bypass -File "tools\win-server.ps1" -Port %PORT% -NoBrowser

:open_browser
call :wait_port %PORT% 60
if errorlevel 1 goto fail_listen
echo.
echo  PokeWorld tourne sur :  http://localhost:%PORT%/
echo  Ouverture du navigateur...
start "" "http://localhost:%PORT%/"
echo.
echo  Le serveur reste actif dans sa propre fenetre.
echo  Fermez la fenetre "PokeWorld server" pour arreter le jeu.
goto end

REM ---------------- MODE DEV : npm + vite ----------------
:dev_mode
echo ========================================
echo   PokeWorld - Serveur de developpement
echo ========================================
echo.
where npm >nul 2>nul
if errorlevel 1 goto fail_node
if exist "node_modules\" goto dev_port_ok
echo Installation des dependances - premiere fois...
call npm install
if errorlevel 1 goto fail
:dev_port_ok
netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul 2>nul
if not errorlevel 1 (
    echo.
    echo [ERREUR] Le port %PORT% est deja utilise par un autre programme.
    echo          Fermez l'autre instance ou relancez avec un autre port :
    echo          launch_local_server.bat 8085
    goto fail
)
echo Demarrage de Vite sur le port %PORT%...
start "PokeWorld dev server - vite" /min cmd /c "npx vite --port %PORT% --strictPort --clearScreen false"
call :wait_port %PORT% 90
if errorlevel 1 goto fail_listen
echo  PokeWorld - mode dev - sur :  http://localhost:%PORT%/
start "" "http://localhost:%PORT%/"
goto end

REM ============================================================
:ensure_port_free
netstat -ano | findstr /R /C:":%~1 .*LISTENING" >nul 2>nul
if errorlevel 1 exit /b 0
echo.
echo [ERREUR] Le port %~1 est deja utilise par un autre programme.
echo          Fermez l'autre instance ou relancez avec un autre port :
echo          launch_local_server.bat 8085
exit /b 1

:wait_port
set /a __TRIES=%~2
:wait_port_loop
netstat -ano | findstr /R /C:":%~1 .*LISTENING" >nul 2>nul
if not errorlevel 1 exit /b 0
set /a __TRIES-=1
if %__TRIES% leq 0 exit /b 1
timeout /t 1 /nobreak >nul
goto wait_port_loop

:fail_node
echo.
echo [ERREUR] Node.js introuvable pour le mode developpeur.
echo          Installez Node.js LTS - https://nodejs.org
goto fail

:fail_listen
echo.
echo [ERREUR] Le serveur n'ecoute pas sur le port %PORT% apres attente.
echo          Consultez la fenetre "PokeWorld server" pour l'erreur exacte.
goto fail

:fail
echo.
echo  Lancement impossible - voir le message ci-dessus.
echo  Secours manuel : py -3 -m http.server %PORT% --directory dist
echo                   puis ouvrez http://localhost:%PORT%/ dans le navigateur.
goto closes

:end
echo.
echo  Appuyez sur une touche pour fermer ce panneau - le serveur continue de tourner.

:closes
popd
pause
exit /b 0
