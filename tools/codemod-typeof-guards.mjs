#!/usr/bin/env node
// V7 · DBT-04 — Codemod : remplace les gardes `typeof X === 'function'` d'un
// dossier par des dépendances EXPLICITES.
//
//   • X déclaré au niveau module du fichier (fonction, import, const)  → garde supprimée (toujours vraie) ;
//   • X exporté par un autre fichier du MÊME dossier                   → `import { X } from './fichier.js'` + garde supprimée ;
//   • X d'une autre couche (module différé / UI / globale de harnais)   → `pwLateLink('X')` (un seul résolveur, src/core/late-link.js) ;
//   • X paramètre / variable locale (callback)                          → inchangé (test légitime).
//
//   node tools/codemod-typeof-guards.mjs --dir application/combat [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const args = process.argv.slice(2);
const DIR = args[args.indexOf('--dir') + 1] || 'application/combat';
const DRY = args.includes('--dry');
const TARGET = path.join(SRC, DIR);

const parse = (src) => acorn.parse(src, { ecmaVersion: 2024, sourceType: 'module', locations: true, ranges: true });

function walk(n, fn, parent = null) {
  if (!n || typeof n.type !== 'string') return;
  n._parent = parent;
  fn(n);
  for (const key of Object.keys(n)) {
    if (key === '_parent') continue;
    const v = n[key];
    if (Array.isArray(v)) v.forEach((c) => walk(c, fn, n));
    else if (v && typeof v.type === 'string') walk(v, fn, n);
  }
}
function patternNames(p, out) {
  if (!p) return out;
  switch (p.type) {
    case 'Identifier': out.add(p.name); break;
    case 'ObjectPattern': for (const pr of p.properties) patternNames(pr.type === 'RestElement' ? pr.argument : pr.value, out); break;
    case 'ArrayPattern': for (const el of p.elements) patternNames(el, out); break;
    case 'RestElement': patternNames(p.argument, out); break;
    case 'AssignmentPattern': patternNames(p.left, out); break;
    default: break;
  }
  return out;
}
/** Names declared at module level (function / class / import / const-let-var). */
function topLevelNames(ast) {
  const out = new Set();
  for (const st of ast.body) {
    const s = st.type === 'ExportNamedDeclaration' && st.declaration ? st.declaration : st;
    if (s.type === 'FunctionDeclaration' || s.type === 'ClassDeclaration') { if (s.id) out.add(s.id.name); }
    else if (s.type === 'VariableDeclaration') for (const d of s.declarations) patternNames(d.id, out);
    else if (s.type === 'ImportDeclaration') for (const sp of s.specifiers) out.add(sp.local.name);
  }
  return out;
}
/** Names exported by a module (`export function x` / `export const x` / `export { a, b as c }`). */
function exportedNames(ast) {
  const out = new Set();
  for (const st of ast.body) {
    if (st.type !== 'ExportNamedDeclaration') continue;
    if (st.declaration) {
      const d = st.declaration;
      if (d.id) out.add(d.id.name);
      else if (d.declarations) for (const dd of d.declarations) patternNames(dd.id, out);
    }
    for (const sp of st.specifiers || []) out.add(sp.exported.name || sp.exported.value);
  }
  return out;
}
/** Is `name` declared by an enclosing function/block/catch of `node` (param or local)? */
function declaredInScope(node, name) {
  for (let p = node._parent; p; p = p._parent) {
    if (p.type === 'FunctionDeclaration' || p.type === 'FunctionExpression' || p.type === 'ArrowFunctionExpression') {
      const s = new Set(); for (const prm of p.params) patternNames(prm, s);
      if (p.id && p.id.name === name) s.add(name);
      if (s.has(name)) return true;
      if (p.body && p.body.type === 'BlockStatement' && blockDeclares(p.body, name, true)) return true;
    } else if (p.type === 'BlockStatement' || p.type === 'Program') {
      if (blockDeclares(p, name, false)) return true;
    } else if (p.type === 'CatchClause') {
      const s = patternNames(p.param, new Set()); if (s.has(name)) return true;
    } else if (p.type === 'ForStatement' || p.type === 'ForOfStatement' || p.type === 'ForInStatement') {
      const init = p.init || p.left;
      if (init && init.type === 'VariableDeclaration') { const s = new Set(); for (const d of init.declarations) patternNames(d.id, s); if (s.has(name)) return true; }
    }
  }
  return false;
}
function blockDeclares(block, name, deepVar) {
  let found = false;
  (function look(n, depth) {
    if (found || !n || typeof n.type !== 'string') return;
    if (n !== block && (n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression')) {
      if (n.type === 'FunctionDeclaration' && n.id && n.id.name === name && depth === 1) found = true;
      return; // do not descend into nested functions
    }
    if (n.type === 'VariableDeclaration') {
      const s = new Set(); for (const d of n.declarations) patternNames(d.id, s);
      if (s.has(name) && (depth === 1 || (deepVar && n.kind === 'var'))) found = true;
    }
    for (const key of Object.keys(n)) {
      if (key === '_parent') continue;
      const v = n[key];
      if (Array.isArray(v)) v.forEach((c) => look(c, depth + 1)); else if (v && typeof v.type === 'string') look(v, depth + 1);
    }
  })(block, 0);
  return found;
}

// ── lazy modules (deferred screens of main.js) : never imported statically ──
const MAIN = fs.readFileSync(path.join(SRC, 'main.js'), 'utf8');
const LAZY = new Set([...MAIN.matchAll(/__pwDeferredScreens\.push\('\.\/([^']+)'/g)].map((m) => path.join(SRC, m[1])));

// ── inventory of the directory ───────────────────────────────────────────────
const files = fs.readdirSync(TARGET).filter((f) => f.endsWith('.js')).map((f) => path.join(TARGET, f));
const info = new Map(); // file → { ast, top, exported }
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const ast = parse(src);
  info.set(f, { src, top: topLevelNames(ast), exported: exportedNames(ast) });
}
// sibling provider: name → file (prefer a file that exports it, else any file defining it at top level as a function)
function siblingProvider(name, self) {
  let fallback = null;
  if (LAZY.has(self)) return null; // un module différé garde des liens tardifs vers ses voisins (harnais isolés)
  for (const [f, i] of info) {
    if (f === self || LAZY.has(f)) continue;
    if (i.exported.has(name)) return f;
    if (i.top.has(name) && !fallback) fallback = f;
  }
  return fallback;
}

const report = { removed: 0, imported: 0, late: 0, skipped: 0, review: [] };
const importsToAdd = new Map(); // file → Map(provider → Set(names))
const exportsToAdd = new Map(); // provider → Set(names)

function nodeText(src, n) { return src.slice(n.start, n.end); }
function unwrap(src, stmt) {
  if (stmt.type === 'BlockStatement') return src.slice(stmt.start + 1, stmt.end - 1).trim();
  return nodeText(src, stmt);
}

function transformFile(file) {
  let src = info.get(file).src;
  let guard = 0;
  for (;;) {
    if (++guard > 5000) throw new Error('codemod: boucle infinie sur ' + file);
    const ast = parse(src);
    const top = topLevelNames(ast);
    let target = null;
    const candidates = [];
    walk(ast, (n) => {
      if (n.type === 'BinaryExpression' && n.left.type === 'UnaryExpression' && n.left.operator === 'typeof'
        && n.left.argument.type === 'Identifier' && n.right.type === 'Literal' && n.right.value === 'function'
        && (n.operator === '===' || n.operator === '!==')) candidates.push(n);
    });
    // innermost first: a candidate that contains no other candidate
    for (const c of candidates) {
      const name = c.left.argument.name;
      if (c._skip) continue;
      { // pre-order = outermost first; inner guards survive inside the kept branch and are handled next round
        // classify
        let kind;
        if (top.has(name)) kind = 'static';
        else if (declaredInScope(c, name)) kind = 'skip';
        else if (siblingProvider(name, file)) kind = 'sibling';
        else kind = 'late';
        if (kind === 'skip') { report.skipped++; continue; }
        target = { node: c, name, kind };
        break;
      }
    }
    if (!target) break;
    const { node: T, name, kind } = target;
    const neg = T.operator === '!==';
    const P = T._parent;
    if (kind === 'late') {
      const rep = (neg ? '!' : '') + `pwLateLink('${name}')`;
      src = src.slice(0, T.start) + rep + src.slice(T.end);
      report.late++;
      continue;
    }
    if (kind === 'sibling') {
      const prov = siblingProvider(name, file);
      if (!importsToAdd.has(file)) importsToAdd.set(file, new Map());
      const m = importsToAdd.get(file);
      if (!m.has(prov)) m.set(prov, new Set());
      m.get(prov).add(name);
      if (!info.get(prov).exported.has(name)) { if (!exportsToAdd.has(prov)) exportsToAdd.set(prov, new Set()); exportsToAdd.get(prov).add(name); }
      report.imported++;
    } else report.removed++;
    // structural simplification (the test is now statically TRUE, or FALSE when negated)
    let s = T.start, e = T.end, rep = null;
    if (P.type === 'ConditionalExpression' && P.test === T) {
      s = P.start; e = P.end; rep = nodeText(src, neg ? P.alternate : P.consequent);
      if (rep.includes('\n') === false && /^[^()]*,/.test(rep)) rep = '(' + rep + ')';
    } else if (P.type === 'IfStatement' && P.test === T) {
      s = P.start; e = P.end;
      const keep = neg ? P.alternate : P.consequent;
      const GP = P._parent;
      const inBlock = GP.type === 'BlockStatement' || GP.type === 'Program' || GP.type === 'SwitchCase';
      if (keep) rep = inBlock ? unwrap(src, keep) : nodeText(src, keep);
      else if (GP.type === 'IfStatement' && GP.alternate === P) { s = GP.consequent.end; rep = ''; }
      else rep = inBlock ? '' : '{}';
    } else if (P.type === 'LogicalExpression' && (P.left === T || P.right === T)) {
      const other = P.left === T ? P.right : P.left;
      const truthy = !neg;
      if ((P.operator === '&&' && truthy) || (P.operator === '||' && !truthy)) { s = P.start; e = P.end; rep = nodeText(src, other); }
      else {
        // `true || x` / `false && x` → constant → simplify the enclosing if/ternary when possible
        const GP = P._parent;
        const constVal = P.operator === '||';
        if (GP.type === 'IfStatement' && GP.test === P) {
          s = GP.start; e = GP.end; const keep = constVal ? GP.consequent : GP.alternate;
          const GGP = GP._parent; const inBlock = GGP.type === 'BlockStatement' || GGP.type === 'Program' || GGP.type === 'SwitchCase';
          if (keep) rep = inBlock ? unwrap(src, keep) : nodeText(src, keep);
          else if (GGP.type === 'IfStatement' && GGP.alternate === GP) { s = GGP.consequent.end; rep = ''; }
          else rep = inBlock ? '' : '{}';
        }
        else if (GP.type === 'ConditionalExpression' && GP.test === P) { s = GP.start; e = GP.end; rep = nodeText(src, constVal ? GP.consequent : GP.alternate); }
        else { s = T.start; e = T.end; rep = String(truthy); report.review.push(`${path.relative(ROOT, file)}:${T.loc.start.line} ${name} (constante ${truthy} dans ${P.operator})`); }
      }
    } else if (P.type === 'UnaryExpression' && P.operator === '!' ) {
      s = T.start; e = T.end; rep = String(!neg); report.review.push(`${path.relative(ROOT, file)}:${T.loc.start.line} ${name} (!typeof)`);
    } else {
      s = T.start; e = T.end; rep = String(!neg); report.review.push(`${path.relative(ROOT, file)}:${T.loc.start.line} ${name} (${P.type})`);
    }
    src = src.slice(0, s) + rep + src.slice(e);
  }
  return src;
}

const results = new Map();
for (const f of files) results.set(f, transformFile(f));

// add imports / exports
for (const [f, m] of importsToAdd) {
  let src = results.get(f);
  const lines = [];
  for (const [prov, names] of m) {
    const rel = './' + path.basename(prov);
    lines.push(`import { ${[...names].sort().join(', ')} } from '${rel}';`);
  }
  src = `// V7 · DBT-04 — dépendances explicites (ex-gardes typeof).\n${lines.join('\n')}\n` + src;
  results.set(f, src);
}
for (const [f, src0] of results) {
  let src = src0;
  if (src.includes("pwLateLink(") && !/import \{[^}]*\bpwLateLink\b[^}]*\} from '[^']*core\/late-link\.js'/.test(src)) {
    const rel = path.relative(path.dirname(f), path.join(SRC, 'core', 'late-link.js')).replace(/\\/g, '/');
    src = `import { pwLateLink } from '${rel.startsWith('.') ? rel : './' + rel}';\n` + src;
  }
  results.set(f, src);
}
for (const [prov, names] of exportsToAdd) {
  let src = results.get(prov);
  const i = src.lastIndexOf('export {');
  if (i < 0) { report.review.push(`${path.relative(ROOT, prov)}: pas de liste export — exporter ${[...names].join(', ')}`); continue; }
  src = src.slice(0, i + 'export {'.length) + `\n  // V7 · DBT-04 — utilisés par les autres fichiers du dossier (ex-gardes typeof).\n  ${[...names].sort().join(', ')},` + src.slice(i + 'export {'.length);
  results.set(prov, src);
}

if (!DRY) for (const [f, src] of results) if (src !== info.get(f).src) fs.writeFileSync(f, src);
console.log(`codemod typeof-guards — ${DIR}: ${report.removed} gardes supprimées (symbole local), ${report.imported} → import explicite, ${report.late} → pwLateLink, ${report.skipped} laissées (variable locale)`);
if (report.review.length) { console.log('À relire :'); for (const r of report.review) console.log('  ' + r); }
