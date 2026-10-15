#!/usr/bin/env node
/**
 * V7 · P0a · LNT-01 — generate the list of game globals for `no-undef`.
 *
 * The classic modules of PokéWorld share one global surface: a function
 * declared at top level in file A (or assigned on `window.X` / `globalThis.X`)
 * is used as a bare identifier in file B. ESLint cannot know that surface by
 * itself, so `no-undef` used to be switched OFF on half of `src/` — which is
 * how `startLegendaryEncounter` shipped with a reference to a variable that
 * exists nowhere (BUG-01).
 *
 * This script scans `src/` and writes `tools/src-globals.json`: every symbol
 * that REALLY exists somewhere on the shared surface. `eslint.config.js`
 * loads that file, so `no-undef: error` can run on the whole tree. A symbol
 * that is in no file at all is then reported — that is the whole point.
 *
 *   node tools/gen-src-globals.mjs          # rewrite tools/src-globals.json
 *   node tools/gen-src-globals.mjs --check  # exit 1 if the file is stale
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'tools', 'src-globals.json');

const TOP_DECL = /^(?:export\s+)?(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
const TOP_DESTR = /^(?:export\s+)?(?:const|let|var)\s*\{([^}]*)\}/gm;
const GLOB_ASSIGN = /(?:window|globalThis|self)\.([A-Za-z_$][\w$]*)\s*=[^=]/g;
const GLOB_BRACKET = /(?:window|globalThis)\[\s*['"]([A-Za-z_$][\w$]*)['"]\s*\]\s*=/g;
const ASSIGN_OBJ = /Object\.assign\(\s*(?:window|globalThis)\s*,\s*\{([^}]*)\}/g;

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'legacy' || e.name === 'legacy-es') continue;
      walk(p, acc);
    } else if (e.isFile() && e.name.endsWith('.js')) acc.push(p);
  }
  return acc;
}

export function collectGlobals() {
  const names = new Set();
  for (const file of walk(SRC)) {
    const s = fs.readFileSync(file, 'utf8');
    for (const m of s.matchAll(GLOB_ASSIGN)) names.add(m[1]);
    for (const m of s.matchAll(GLOB_BRACKET)) names.add(m[1]);
    for (const m of s.matchAll(TOP_DECL)) names.add(m[1]);
    for (const m of s.matchAll(TOP_DESTR)) {
      for (const part of m[1].split(',')) {
        const p = part.trim().split(':').pop().split('=')[0].trim();
        if (/^[A-Za-z_$][\w$]*$/.test(p)) names.add(p);
      }
    }
    for (const m of s.matchAll(ASSIGN_OBJ)) {
      for (const part of m[1].split(',')) {
        const p = part.trim().split(':')[0].trim();
        if (/^[A-Za-z_$][\w$]*$/.test(p)) names.add(p);
      }
    }
  }
  return [...names].sort();
}

const list = collectGlobals();
const json = JSON.stringify(list, null, 0).replace(/","/g, '",\n"').replace('["', '[\n"').replace('"]', '"\n]') + '\n';
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== json) {
    console.error(`[gen-src-globals] ${path.relative(ROOT, OUT)} is stale — run: node tools/gen-src-globals.mjs`);
    process.exit(1);
  }
  console.log(`[gen-src-globals] up to date (${list.length} symbols).`);
} else {
  fs.writeFileSync(OUT, json);
  console.log(`[gen-src-globals] ${list.length} symbols → ${path.relative(ROOT, OUT)}`);
}
