import fs from 'node:fs';
import path from 'node:path';

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

let changed = 0;
for (const file of walk('src/assets')) {
  if (!file.endsWith('.css')) continue;
  const old = fs.readFileSync(file, 'utf8');
  const next = old.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n{4,}/g, '\n\n\n');
  if (next !== old) {
    fs.writeFileSync(file, next, 'utf8');
    changed++;
  }
}

for (const file of ['index.html']) {
  const old = fs.readFileSync(file, 'utf8');
  const next = old.replace(/<!--[\s\S]*?-->/g, '').replace(/\n{4,}/g, '\n\n\n');
  if (next !== old) {
    fs.writeFileSync(file, next, 'utf8');
    changed++;
  }
}
console.log(`Stripped CSS/HTML comments in ${changed} files.`);
