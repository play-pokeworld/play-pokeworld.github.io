/**
 * @file SourceScanner.js
 * @brief Static source helpers for the rule tests: file listing, comment stripping, import resolution.
 */

import fs from 'fs';
import path from 'path';

/**
 * Recursively lists `.js` files.
 * @param {string} dir
 * @param {string[]} [excludeDirs=[]] - Paths (relative to `dir`, forward slashes) to skip
 * @returns {string[]} Paths relative to `dir`, forward slashes
 */
export function listJsFiles(dir, excludeDirs = []) {
  const out = [];
  const walk = (relative) => {
    for (const entry of fs.readdirSync(path.join(dir, relative), { withFileTypes: true })) {
      const rel = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!excludeDirs.includes(rel)) walk(rel);
      } else if (entry.name.endsWith('.js')) {
        out.push(rel);
      }
    }
  };
  walk('');
  return out.sort();
}

/**
 * Removes block and line comments while leaving string literals intact.
 * @param {string} code
 * @returns {string}
 */
export function stripComments(code) {
  let out = '';
  let i = 0;
  let quote = null;
  while (i < code.length) {
    const c = code[i];
    const next = code[i + 1];
    if (quote) {
      out += c;
      if (c === '\\') { out += next ?? ''; i += 2; continue; }
      if (c === quote) quote = null;
      i++;
    } else if (c === '/' && next === '*') {
      const end = code.indexOf('*/', i + 2);
      i = end < 0 ? code.length : end + 2;
    } else if (c === '/' && next === '/') {
      const end = code.indexOf('\n', i);
      i = end < 0 ? code.length : end;
    } else {
      if (c === '"' || c === "'" || c === '`') quote = c;
      out += c;
      i++;
    }
  }
  return out;
}

/**
 * Returns `file:line: text` for every line of the comment-free code matching `pattern`.
 * @param {string} root
 * @param {string[]} files
 * @param {RegExp} pattern
 * @returns {string[]}
 */
export function findMatches(root, files, pattern) {
  const hits = [];
  for (const file of files) {
    const lines = stripComments(fs.readFileSync(path.join(root, file), 'utf8')).split('\n');
    lines.forEach((line, index) => {
      if (pattern.test(line)) hits.push(`${file}:${index + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
  return hits;
}

/**
 * @param {string} file - Absolute path
 * @returns {Set<string>} Names exported by the module (static analysis)
 */
function exportsOf(file) {
  const code = fs.readFileSync(file, 'utf8');
  const names = new Set();
  for (const m of code.matchAll(/export\s+(?:default\s+)?(?:async\s+)?(?:const|let|var|class|function\*?)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of code.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const [name, alias] = part.trim().split(/\s+as\s+/);
      if (name) names.add((alias || name).trim());
    }
  }
  return names;
}

/**
 * Verifies that every relative import points to an existing file exporting the requested names.
 * @param {string} root
 * @param {string[]} files
 * @returns {string[]} Problems
 */
export function findBrokenImports(root, files) {
  const problems = [];
  const cache = new Map();
  for (const file of files) {
    const code = stripComments(fs.readFileSync(path.join(root, file), 'utf8'));
    for (const m of code.matchAll(/import\s*(?:\{([^}]*)\})?\s*(?:from\s*)?['"]([^'"]+)['"]/g)) {
      if (!m[2].startsWith('.')) continue;
      const target = path.resolve(path.dirname(path.join(root, file)), m[2]);
      if (!fs.existsSync(target)) { problems.push(`${file}: missing file ${m[2]}`); continue; }
      if (!m[1]) continue;
      if (!cache.has(target)) cache.set(target, exportsOf(target));
      for (const part of m[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/)[0].trim();
        if (name && !cache.get(target).has(name)) problems.push(`${file}: ${name} is not exported by ${m[2]}`);
      }
    }
  }
  return problems;
}
