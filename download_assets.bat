@echo off
setlocal EnableExtensions
pushd "%~dp0"
title PokeWorld - telechargement des assets

REM ============================================================
REM  PokeWorld - download_assets.bat  (V7-R3 - SND-04)
REM    telecharge les ressources qui ne sont PAS dans le depot :
REM      1. sprites manquants (PokeAPI, PokeChill, Pokeclicker)
REM      2. cris officiels des Pokemon (depot PokeAPI/cries)
REM      3. musiques / effets des jeux officiels listes par VOUS
REM         dans tools\audio-sources.txt (destination = URL ou chemin)
REM      4. regeneration du manifeste audio (src\assets\audio\manifest.json)
REM
REM    Options :  download_assets.bat audio   -> audio seulement (rapide)
REM    Ensuite :  regen_dist.bat  puis  launch_local_server.bat
REM
REM    Les cris, musiques et effets officiels sont la propriete de
REM    Nintendo / Creatures / Game Freak : installes sur VOTRE poste
REM    uniquement (fan-game non commercial), jamais redistribues.
REM ============================================================

echo ========================================
echo   PokeWorld - Telechargement des assets
echo ========================================
echo.

set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY where python >nul 2>nul && set "PY=python"
if not defined PY where python3 >nul 2>nul && set "PY=python3"
if not defined PY (
    echo [ERREUR] Python 3 introuvable.
    echo          Installez Python 3 - https://www.python.org/downloads/
    echo          ^(cochez "Add python.exe to PATH" a l'installation^)
    goto fail
)

if /I "%~1"=="audio" (
    echo [1/2] Audio seulement : cris PokeAPI + sources de tools\audio-sources.txt
    %PY% tools\download_assets.py --audio-only
) else (
    echo [1/2] Sprites + audio ^(cris PokeAPI, sources de tools\audio-sources.txt^)
    %PY% tools\download_assets.py
)
if errorlevel 1 (
    echo [ERREUR] Le telechargement a echoue. Verifiez la connexion internet.
    goto fail
)

echo.
echo [2/2] Manifeste audio
where node >nul 2>nul
if errorlevel 1 (
    echo        ^(Node.js absent : manifeste ecrit par Python^)
) else (
    node tools\audio-manifest.mjs --list
)

echo.
echo ========================================
echo   Termine. Lancez regen_dist.bat puis launch_local_server.bat
echo   Pour vos musiques / effets officiels : editez tools\audio-sources.txt
echo   puis relancez  download_assets.bat audio
echo ========================================
echo.
pause
popd
exit /b 0

:fail
echo.
pause
popd
exit /b 1
