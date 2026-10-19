@echo off
rem ==========================================================================
rem PokeWorld - Windows launcher.
rem Rules: keep this file pure ASCII with CRLF line endings (.gitattributes).
rem No user-facing text here: messages come from server.js (localized) or
rem from tools\launcher\*.txt. Never use %%errorlevel%% inside ( ) blocks.
rem ==========================================================================
setlocal
cd /d "%~dp0"
title PokeWorld

where node >nul 2>&1
if errorlevel 1 goto node_missing

rem Serves the game on http://localhost:3000 (next free port if busy)
rem and opens the default browser.
node server.js
if errorlevel 1 goto server_failed
goto :eof

:node_missing
type "tools\launcher\node-missing.txt"
echo.
pause
exit /b 1

:server_failed
echo.
pause
exit /b 1
