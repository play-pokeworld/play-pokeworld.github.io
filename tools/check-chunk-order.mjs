#!/usr/bin/env node
// V7 · P2 (DBT-04 follow-up) — post-build guard on the chunk evaluation order.
//
// Why: the classic modules of the `gameplay` chunk (game-state.js, …) read
// `window.PokeWorldState` which is created by `engine/runtime/classic-bridge.js`
// (chunk `engine`). Rolldown decides the chunk order from the static import
// edges. A single static import from a deferred screen chunk (screen-atoll,
// screen-mine, …) towards `gameplay` is enough to pull `gameplay` BEFORE
// `engine` and the game no longer boots ("Cannot read properties of undefined
// (reading 'gameState')"). Unit tests cannot see this (they load files one by
// one), so the gate is applied on the real bundle, right after `vite build`.
//
// Usage: node tools/check-chunk-order.mjs [--dist dist] [--quiet]
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const distIdx = args.indexOf('--dist');
const distDir = path.resolve(distIdx > -1 ? args[distIdx + 1] : 'dist');
const assetsDir = path.join(distDir, 'assets');

if (!fs.existsSync(assetsDir)) {
  console.error(`[chunk-order] dossier introuvable : ${assetsDir} (lancer \`vite build\` d'abord)`);
  process.exit(1);
}

const chunkFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
const mainFile = chunkFiles.find((f) => /^main\./.test(f));
if (!mainFile) {
  console.error('[chunk-order] chunk principal `main.*.js` introuvable');
  process.exit(1);
}

/** Static imports of a chunk, in source order (ESM: evaluated before the body). */
function staticImports(file) {
  const src = fs.readFileSync(path.join(assetsDir, file), 'utf8');
  // Only the import preamble matters; stop at the first statement that is not an import.
  const head = src.slice(0, 20000);
  const out = [];
  const re = /import\s*(?:[^;'"]*?from\s*)?["']\.\/([^"']+)["']/g;
  let m;
  while ((m = re.exec(head))) out.push(m[1]);
  return out;
}

/** ESM evaluation order: depth-first, imports before body, each module once. */
const order = [];
const seen = new Set();
function visit(file) {
  if (seen.has(file)) return;
  seen.add(file);
  for (const dep of staticImports(file)) visit(dep);
  order.push(file);
}
visit(mainFile);

const nameOf = (f) => f.replace(/\.[A-Za-z0-9_-]+\.js$/, '');
const names = order.map(nameOf);
const idx = (n) => names.indexOf(n);

const problems = [];
const engineAt = idx('engine');
if (engineAt === -1) problems.push('chunk `engine` absent de la chaîne statique de main');
for (const late of ['gameplay', 'qa-systems']) {
  const at = idx(late);
  if (at !== -1 && engineAt !== -1 && at < engineAt) {
    problems.push(`chunk \`${late}\` évalué avant \`engine\` (position ${at} < ${engineAt})`);
  }
}
// Deferred screens must never be statically evaluated AFTER having dragged `gameplay` in:
// a screen-* chunk that statically imports `gameplay` is the exact regression we guard.
for (const f of chunkFiles) {
  if (!/^screen-/.test(f)) continue;
  const deps = staticImports(f).map(nameOf);
  if (deps.includes('gameplay') || deps.includes('qa-systems')) {
    problems.push(
      `écran différé \`${nameOf(f)}\` importe statiquement ${deps.filter((d) => d === 'gameplay' || d === 'qa-systems').join(', ')} — utiliser pwLateLink()`
    );
  }
}

if (problems.length) {
  console.error('[chunk-order] ordre d’évaluation des chunks invalide :');
  problems.forEach((p) => console.error('  - ' + p));
  console.error('  ordre statique depuis main : ' + names.join(' → '));
  process.exit(1);
}
if (!quiet) {
  console.log(`[chunk-order] OK — engine (#${engineAt}) précède gameplay (#${idx('gameplay')}) ; ordre : ${names.join(' → ')}`);
}
