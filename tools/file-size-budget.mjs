#!/usr/bin/env node
/**
 * V7 · DBT-09 — budget de taille des fichiers applicatifs.
 *
 * Règle cible de la feuille de route : aucun fichier applicatif > 1 000 lignes
 * (hors `src/data/`, hors dictionnaires `src/localization/`, hors `src/version.js`
 * généré). Les fichiers qui dépassent
 * encore sont listés NOMMÉMENT dans `tools/file-size-budget.json` avec leur
 * taille actuelle : c'est un cliquet — un fichier listé ne peut que maigrir,
 * un fichier non listé ne peut pas dépasser la limite, un nouveau fichier
 * doit respecter la limite.
 *
 *   node tools/file-size-budget.mjs            → vérifie (code 1 si dépassement)
 *   node tools/file-size-budget.mjs --write    → régénère le JSON (après une
 *                                                 passe qui a fait maigrir les fichiers)
 *   node tools/file-size-budget.mjs --list     → liste les fichiers > limite
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUDGET_FILE = path.join(ROOT, 'tools', 'file-size-budget.json');
const LIMIT = 1000;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

export function measure() {
  const files = walk(path.join(ROOT, 'src'))
    .map((p) => path.relative(ROOT, p).split(path.sep).join('/'))
    .filter((p) => !p.startsWith('src/data/') && !p.startsWith('src/localization/') && p !== 'src/version.js')
    .sort();
  const sizes = {};
  for (const f of files) sizes[f] = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').length;
  return sizes;
}

export function check() {
  const sizes = measure();
  const budget = fs.existsSync(BUDGET_FILE) ? JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8')) : { limit: LIMIT, exceptions: {} };
  const limit = budget.limit || LIMIT;
  const problems = [];
  for (const [f, n] of Object.entries(sizes)) {
    const allowed = budget.exceptions[f];
    if (allowed !== undefined) {
      if (n > allowed) problems.push(`${f} : ${n} lignes > plafond ${allowed} (cliquet : ne peut que baisser)`);
    } else if (n > limit) {
      problems.push(`${f} : ${n} lignes > limite ${limit} (fichier hors liste d'exceptions)`);
    }
  }
  const over = Object.entries(sizes).filter(([, n]) => n > limit).sort((a, b) => b[1] - a[1]);
  return { sizes, limit, problems, over };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  if (argv.includes('--write')) {
    const sizes = measure();
    const exceptions = {};
    for (const [f, n] of Object.entries(sizes)) if (n > LIMIT) exceptions[f] = n;
    fs.writeFileSync(BUDGET_FILE, JSON.stringify({ limit: LIMIT, exceptions }, null, 2) + '\n');
    console.log(`file-size-budget.json écrit : limite ${LIMIT}, ${Object.keys(exceptions).length} exceptions nommées.`);
    process.exit(0);
  }
  const r = check();
  if (argv.includes('--list')) {
    for (const [f, n] of r.over) console.log(`${String(n).padStart(6)}  ${f}`);
    console.log(`${r.over.length} fichier(s) applicatif(s) > ${r.limit} lignes`);
  }
  for (const p of r.problems) console.error('SIZE-BUDGET ✘ ' + p);
  if (r.problems.length) process.exit(1);
  console.log(`Size budget OK (${Object.keys(r.sizes).length} fichiers applicatifs, ${r.over.length} au-dessus de ${r.limit} l. tous plafonnés)`);
}
