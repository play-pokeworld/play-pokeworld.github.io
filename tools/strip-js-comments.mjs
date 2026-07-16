import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['src/legacy/scripts', 'src/core', 'src/ui', 'src/generated'];

function stripComments(source) {
  let out = '';
  let i = 0;
  let state = 'normal';
  while (i < source.length) {
    const c = source[i];
    const n = source[i + 1];
    if (state === 'normal') {
      if (c === '/' && n === '/') {
        i += 2;
        while (i < source.length && source[i] !== '\n' && source[i] !== '\r') i++;
        continue;
      }
      if (c === '/' && n === '*') {
        i += 2;
        while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
          if (source[i] === '\n') out += '\n';
          i++;
        }
        i += 2;
        continue;
      }
      if (c === "'") { state = 'single'; out += c; i++; continue; }
      if (c === '"') { state = 'double'; out += c; i++; continue; }
      if (c === '`') { state = 'template'; out += c; i++; continue; }
      out += c; i++; continue;
    }
    if (state === 'single') {
      out += c;
      if (c === '\\') { if (i + 1 < source.length) out += source[++i]; i++; continue; }
      if (c === "'") state = 'normal';
      i++; continue;
    }
    if (state === 'double') {
      out += c;
      if (c === '\\') { if (i + 1 < source.length) out += source[++i]; i++; continue; }
      if (c === '"') state = 'normal';
      i++; continue;
    }
    if (state === 'template') {
      out += c;
      if (c === '\\') { if (i + 1 < source.length) out += source[++i]; i++; continue; }
      if (c === '`') state = 'normal';
      i++; continue;
    }
  }
  return out;
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(full);
  }
  return files;
}

let changed = 0;
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const source = fs.readFileSync(file, 'utf8');
    const stripped = stripComments(source).replace(/\n{4,}/g, '\n\n\n');
    if (stripped !== source) {
      fs.writeFileSync(file, stripped, 'utf8');
      changed++;
    }
  }
}
console.log(`Stripped comments in ${changed} JavaScript files.`);
