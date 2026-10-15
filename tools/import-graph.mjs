#!/usr/bin/env node
// tools/import-graph.mjs — V7 · DBT-02
// Graphe d'imports ESM à partir de `src/main.js` (imports statiques, dynamiques,
// `export … from`). Liste les fichiers de `src/` jamais atteints.
//
//   node tools/import-graph.mjs            → rapport (code de sortie 1 si fichier mort)
//   node tools/import-graph.mjs --json     → JSON { reached, unreached }
//
// Les fichiers listés dans ALLOW_UNREACHED sont volontairement hors graphe
// (points d'entrée secondaires, outils de test chargés par vm/esbuild).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const ENTRY = path.join(SRC, 'main.js');

// Fichiers atteints autrement que par import ESM depuis main.js.
export const ALLOW_UNREACHED = new Set([
  'src/version.js', // importé par main.js — gardé ici par sécurité si l'import devient indirect
]);

const IMPORT_RE =
  /(?:^|[^\w$.])import\s*(?:[\w${}\s,*]*?\s*from\s*)?['"]([^'"]+)['"]|(?:^|[^\w$.])import\s*\(\s*['"]([^'"]+)['"]\s*\)|(?:^|[^\w$.])export\s*(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s*from\s*['"]([^'"]+)['"]/g;

function listJs(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'assets') continue;
      listJs(p, out);
    } else if (ent.name.endsWith('.js') || ent.name.endsWith('.mjs')) out.push(p);
  }
  return out;
}

function resolveSpec(fromFile, spec) {
  if (!spec.startsWith('.') && !spec.startsWith('/')) return null; // paquet externe
  let p = path.resolve(path.dirname(fromFile), spec);
  if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  for (const ext of ['.js', '.mjs', '/index.js']) if (fs.existsSync(p + ext)) return p + ext;
  return null;
}

export function buildGraph(entry = ENTRY) {
  const edges = new Map();
  const reached = new Set();
  const stack = [entry];
  while (stack.length) {
    const f = stack.pop();
    if (reached.has(f)) continue;
    reached.add(f);
    const src = fs.readFileSync(f, 'utf8');
    const deps = [];
    IMPORT_RE.lastIndex = 0;
    let m;
    while ((m = IMPORT_RE.exec(src))) {
      const spec = m[1] || m[2] || m[3];
      const r = resolveSpec(f, spec);
      if (r) {
        deps.push(r);
        if (!reached.has(r)) stack.push(r);
      }
    }
    edges.set(f, deps);
  }
  const all = listJs(SRC);
  const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
  const unreached = all.filter((f) => !reached.has(f)).map(rel).filter((f) => !ALLOW_UNREACHED.has(f));
  return { reached: [...reached].map(rel).sort(), unreached: unreached.sort(), total: all.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const g = buildGraph();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(g, null, 1));
  } else {
    console.log(`[import-graph] ${g.reached.length} fichiers atteints depuis src/main.js sur ${g.total}.`);
    if (g.unreached.length) {
      console.log(`[import-graph] ${g.unreached.length} fichier(s) JAMAIS atteint(s) :`);
      for (const f of g.unreached) console.log('  - ' + f);
    } else console.log('[import-graph] OK — 0 fichier non atteint.');
  }
  process.exit(g.unreached.length ? 1 : 0);
}
