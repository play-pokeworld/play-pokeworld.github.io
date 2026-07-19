@echo off
setlocal
cd /d "%~dp0"
set PORT=8000

echo Starting PokéWorld on http://127.0.0.1:%PORT%/
start "" "http://127.0.0.1:%PORT%/"

py -3 -m http.server %PORT%
if not errorlevel 1 goto :eof
python -m http.server %PORT%
if not errorlevel 1 goto :eof
python3 -m http.server %PORT%
if not errorlevel 1 goto :eof

echo.
echo Python is required to launch a local server automatically.
echo You can still open index.html directly, but some browsers show file:// security warnings.
pause
