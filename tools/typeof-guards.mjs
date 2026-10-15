#!/usr/bin/env node
// V7 · DBT-04 — Compte les gardes `typeof X === 'function'` sur des symboles
// GLOBAUX (X n'est ni déclaré ni importé dans le fichier) : ce sont des
// dépendances implicites. Les tests sur un paramètre/une variable locale
// (`typeof cb === 'function'`) sont légitimes et ne comptent pas.
//
//   node tools/typeof-guards.mjs                 # tableau par dossier
//   node tools/typeof-guards.mjs --json          # { 'application/combat': n, … }
//   node tools/typeof-guards.mjs --budget        # sortie 1 si un dossier dépasse tools/typeof-guards.budget.json
//   node tools/typeof-guards.mjs --list <dir>    # détail symbole → occurrences
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');

function walkDir(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walkDir(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);
}

function declaredNames(ast) {
  const names = new Set();
  (function walk(n) {
    if (!n || typeof n.type !== 'string') return;
    switch (n.type) {
      case 'FunctionDeclaration': if (n.id) names.add(n.id.name); break;
      case 'ClassDeclaration': if (n.id) names.add(n.id.name); break;
      case 'VariableDeclarator': collectPattern(n.id, names); break;
      case 'ImportSpecifier': case 'ImportDefaultSpecifier': case 'ImportNamespaceSpecifier': names.add(n.local.name); break;
      case 'FunctionExpression': case 'ArrowFunctionExpression':
        if (n.id) names.add(n.id.name);
        for (const p of n.params) collectPattern(p, names);
        break;
      case 'CatchClause': if (n.param) collectPattern(n.param, names); break;
      default: break;
    }
    if (n.type === 'FunctionDeclaration') for (const p of n.params) collectPattern(p, names);
    for (const key of Object.keys(n)) {
      const v = n[key];
      if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === 'string') walk(v);
    }
  })(ast);
  return names;
}
function collectPattern(p, names) {
  if (!p) return;
  switch (p.type) {
    case 'Identifier': names.add(p.name); break;
    case 'ObjectPattern': for (const pr of p.properties) collectPattern(pr.type === 'RestElement' ? pr.argument : pr.value, names); break;
    case 'ArrayPattern': for (const el of p.elements) collectPattern(el, names); break;
    case 'RestElement': collectPattern(p.argument, names); break;
    case 'AssignmentPattern': collectPattern(p.left, names); break;
    default: break;
  }
}

/** @returns {{file:string, line:number, name:string}[]} global-symbol guards of one file */
export function fileGuards(file) {
  const src = fs.readFileSync(file, 'utf8');
  let ast;
  try { ast = acorn.parse(src, { ecmaVersion: 2024, sourceType: 'module', locations: true }); }
  catch (e) { return []; }
  const declared = declaredNames(ast);
  const out = [];
  (function walk(n) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'BinaryExpression' && n.left.type === 'UnaryExpression' && n.left.operator === 'typeof'
      && n.left.argument.type === 'Identifier' && n.right.type === 'Literal' && n.right.value === 'function'
      && !declared.has(n.left.argument.name)) {
      out.push({ file: path.relative(ROOT, file), line: n.loc.start.line, name: n.left.argument.name });
    }
    for (const key of Object.keys(n)) {
      const v = n[key];
      if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === 'string') walk(v);
    }
  })(ast);
  return out;
}

export function guardsByDir() {
  const by = {};
  for (const f of walkDir(SRC)) {
    const dir = path.relative(SRC, path.dirname(f)).split(path.sep).slice(0, 2).join('/') || '.';
    const g = fileGuards(f);
    by[dir] = (by[dir] || 0) + g.length;
  }
  return by;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--list')) {
    const dir = args[args.indexOf('--list') + 1] || 'application/combat';
    const counts = {};
    for (const f of walkDir(path.join(SRC, dir))) for (const g of fileGuards(f)) counts[g.name] = (counts[g.name] || 0) + 1;
    for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(String(v).padStart(4), k);
    console.log('TOTAL', Object.values(counts).reduce((a, b) => a + b, 0));
    process.exit(0);
  }
  const by = guardsByDir();
  if (args.includes('--json')) { console.log(JSON.stringify(by, null, 2)); process.exit(0); }
  const budgetFile = path.join(ROOT, 'tools', 'typeof-guards.budget.json');
  const budget = fs.existsSync(budgetFile) ? JSON.parse(fs.readFileSync(budgetFile, 'utf8')) : null;
  let bad = 0;
  const total = Object.values(by).reduce((a, b) => a + b, 0);
  for (const [dir, n] of Object.entries(by).sort((a, b) => b[1] - a[1])) {
    const b = budget ? budget[dir] ?? 0 : null;
    const over = b !== null && n > b;
    if (over) bad++;
    console.log(`${String(n).padStart(5)}  ${dir}${b !== null ? `  (budget ${b}${over ? ' ✗ DÉPASSÉ' : ''})` : ''}`);
  }
  console.log(`${String(total).padStart(5)}  TOTAL gardes typeof sur symboles globaux`);
  if (args.includes('--budget')) {
    if (!budget) { console.error('tools/typeof-guards.budget.json manquant'); process.exit(1); }
    if (bad) { console.error(`✗ typeof-guards : ${bad} dossier(s) au-dessus du budget (le budget ne peut que baisser).`); process.exit(1); }
    console.log('typeof-guards OK (budget respecté)');
  }
}
