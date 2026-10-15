#!/usr/bin/env sh
# PokeWorld — lanceur local (Linux / macOS). Équivalent de launch_local_server.bat.
#   ./launch_local_server.sh          jouer (dist statique, zéro installation)
#   ./launch_local_server.sh 8085     jouer sur un port précis
#   ./launch_local_server.sh dev      mode développeur (npm + vite)
set -e
cd "$(dirname "$0")"
MODE=play; PORT=8080
if [ "$1" = "dev" ]; then MODE=dev; [ -n "$2" ] && PORT="$2"; elif [ -n "$1" ]; then PORT="$1"; fi

if [ "$MODE" = "dev" ]; then
  command -v npm >/dev/null 2>&1 || { echo "[ERREUR] Node.js / npm introuvable (https://nodejs.org)"; exit 1; }
  [ -d node_modules ] || npm install
  exec npx vite --port "$PORT" --strictPort --clearScreen false
fi

# V7-R3c : le zip ne contient plus dist/src/assets (copie de src/assets, ~33 Mo) :
# on le reconstitue ici (seulement les fichiers nouveaux ou plus récents).
if [ -d src/assets ] && [ -f dist/index.html ]; then
  echo "[INFO] Synchronisation des images / sons vers dist/src/assets ..."
  mkdir -p dist/src/assets
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --update src/assets/ dist/src/assets/
  else
    cp -Ru src/assets/. dist/src/assets/ 2>/dev/null || cp -R src/assets/. dist/src/assets/
  fi
fi

URL="http://localhost:$PORT/"
echo "PokeWorld : $URL  (Ctrl+C pour arrêter)"
if command -v node >/dev/null 2>&1; then
  ( sleep 2; command -v xdg-open >/dev/null 2>&1 && xdg-open "$URL" || { command -v open >/dev/null 2>&1 && open "$URL"; } ) >/dev/null 2>&1 &
  exec node tools/win-static-server.mjs --port "$PORT"
fi
if command -v python3 >/dev/null 2>&1; then
  DIR=.; [ -f dist/index.html ] && DIR=dist
  ( sleep 2; command -v xdg-open >/dev/null 2>&1 && xdg-open "$URL" || { command -v open >/dev/null 2>&1 && open "$URL"; } ) >/dev/null 2>&1 &
  exec python3 -m http.server "$PORT" --directory "$DIR"
fi
echo "[ERREUR] Ni Node.js ni Python 3 trouvés : installez Node.js LTS (https://nodejs.org)."
exit 1
