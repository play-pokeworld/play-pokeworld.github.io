#!/usr/bin/env node
// PokeWorld — serveur statique ZÉRO DÉPENDANCE (Node >= 14, aucun npm install requis).
// Sert dist/ (build prêt à jouer) en priorité, la racine du projet sinon.
// Usage : node tools/win-static-server.mjs [--port 8080] [--root dist]
import http from 'node:http';
import { promises as fs, createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
function argValue(name, fallback) {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}
const PORT = Number(argValue('--port', 8080)) || 8080;

let root = path.resolve(PROJECT_ROOT, argValue('--root', 'dist'));
try {
  const st = await fs.stat(root);
  if (!st.isDirectory()) throw new Error('not a dir');
} catch {
  root = PROJECT_ROOT; // dist absent (checkout dev) : on sert la racine (mode modules ES source)
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.map': 'application/json', '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  let urlPath = '/';
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
    const filePath = path.resolve(root, '.' + urlPath);
    // Anti path-traversal : le fichier doit rester sous root.
    if (filePath !== root && !filePath.startsWith(root + path.sep)) {
      res.writeHead(403); res.end('403 Forbidden'); return;
    }
    let real = filePath;
    try {
      const st = await fs.stat(real);
      if (st.isDirectory()) real = path.join(real, 'index.html');
    } catch { /* pas trouvé : overlay plus bas */ }
    // Overlay : si la racine choisie est dist/ et que le fichier n'y existe
    // pas (assets runtime référencés "src/assets/..." tels quels), retenter
    // sous la racine du projet avant de déclarer un 404.
    try { await fs.access(real); } catch {
      const alt = path.resolve(PROJECT_ROOT, '.' + urlPath);
      if (alt.startsWith(PROJECT_ROOT + path.sep)) real = alt;
    }
    await fs.access(real);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(real).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    createReadStream(real).pipe(res);
  } catch {
    // Fallback SPA : toute route inconnue sans extension renvoie index.html.
    if (!path.extname(urlPath)) {
      try {
        const idx = path.join(root, 'index.html');
        await fs.access(idx);
        res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
        createReadStream(idx).pipe(res);
        return;
      } catch { /* ignore */ }
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found: ' + urlPath);
  }
});

// Dual-stack ::  (IPv6 + IPv4-mapped) : certains Windows résolvent
// "localhost" en ::1 — écouter uniquement 127.0.0.1 y casserait l'accès.
server.listen(PORT, '::', () => {
  console.log('=================================================');
  console.log('  PokeWorld - serveur local (Node, zero dependance)');
  console.log('=================================================');
  console.log('  URL      : http://localhost:' + PORT + '/');
  console.log('      ou   : http://127.0.0.1:' + PORT + '/');
  console.log('  Dossier  : ' + root);
  console.log('  Arret    : fermer cette fenetre ou Ctrl+C');
  console.log('=================================================');
});
server.on('error', (err) => {
  console.error('[ERREUR] ' + (err.code === 'EADDRINUSE'
    ? (`Le port ${PORT} est deja utilise. Fermez l'autre instance ou changez de port.`)
    : err.message));
  process.exit(1);
});

