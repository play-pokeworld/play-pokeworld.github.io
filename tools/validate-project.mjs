import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = [];
const warn = [];
const info = [];

function exists(p) { return fs.existsSync(path.join(root, p)); }
function read(p) { return fs.readFileSync(path.join(root, p), 'utf8'); }
function walk(dir, predicate = () => true) {
  const base = path.join(root, dir);
  if (!fs.existsSync(base)) return [];
  const out = [];
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    const full = path.join(base, entry.name);
    const rel = path.relative(root, full).replaceAll(path.sep, '/');
    if (entry.isDirectory()) out.push(...walk(rel, predicate));
    else if (entry.isFile() && predicate(rel)) out.push(rel);
  }
  return out;
}
function countFiles(dir) { return walk(dir).length; }
function countRegex(files, regex) {
  let count = 0;
  for (const file of files) {
    const text = read(file);
    const matches = text.match(regex);
    if (matches) count += matches.length;
  }
  return count;
}
function assertEqual(name, actual, expected) {
  if (actual !== expected) fail.push(`${name}: expected ${expected}, got ${actual}`);
  else info.push(`${name}: ${actual}`);
}
function assertAtLeast(name, actual, min) {
  if (actual < min) fail.push(`${name}: expected at least ${min}, got ${actual}`);
  else info.push(`${name}: ${actual}`);
}

const sourceFiles = [
  ...walk('src/legacy/scripts', (f) => f.endsWith('.js') && !f.endsWith('legacy-classic.js')),
  ...walk('src/localization', (f) => f.endsWith('.js')),
  'index.html',
].filter((file) => exists(file));
const legacyFiles = walk('src/legacy/scripts', (f) => f.endsWith('.js') && !f.endsWith('legacy-classic.js'));
const cssFiles = [...walk('src/assets/css', (f) => f.endsWith('.css')), ...walk('src/assets/styles', (f) => f.endsWith('.css'))];

assertEqual('old src/scripts directory exists', exists('src/scripts') ? 1 : 0, 0);
assertEqual('temporary index.vite.html exists', exists('index.vite.html') ? 1 : 0, 0);
assertEqual('root index module scripts', (read('index.html').match(/type="module"/g) || []).length, 0);
assertEqual('root inline style attributes', (read('index.html').match(/\sstyle="/g) || []).length, 0);
assertEqual('root inline event attributes', (read('index.html').match(/on(?:click|contextmenu|change|mousedown|input|mouseover|mouseout)=/g) || []).length, 0);
assertEqual('source inline event attributes', countRegex(sourceFiles, /on(?:click|contextmenu|change|mousedown|input|mouseover|mouseout)=/g), 0);
assertEqual('source inline style attributes', countRegex(sourceFiles, /\sstyle="/g), 0);
assertEqual('data-inline bridge attributes', countRegex(sourceFiles, /data-inline-/g), 0);
assertEqual('generic legacy-code bridge attributes', countRegex(sourceFiles, /data-action="legacy-code"|data-context-code=|data-hover-in=|data-hover-out=/g), 0);
assertEqual('language conditional refs in legacy scripts', countRegex(legacyFiles, /lang.*===.*en.*\?|lang===.*en|isEn ?\?|isEn\?|const isEn|G\.lang === 'en'|G\.lang==='en'/g), 0);
assertEqual('Date.now cache busting refs', countRegex(['src/loader.js', 'src/main.js', ...walk('tools', (f) => f.endsWith('.js') || f.endsWith('.mjs'))].filter(exists), /Date\.now\(\).*\?v=|\?v=.*Date\.now/g), 0);
assertEqual('CSS important declarations', countRegex(cssFiles, /!important/g), 0);
assertEqual('CSS block comments', countRegex(cssFiles, /\/\*/g), 0);
assertEqual('HTML comments in root index', (read('index.html').match(/<!--/g) || []).length, 0);

assertEqual('Pokemon front sprites', countFiles('src/assets/images/pokemon/front'), 251);
assertEqual('Pokemon back sprites', countFiles('src/assets/images/pokemon/back'), 251);
assertEqual('Pokemon front shiny sprites', countFiles('src/assets/images/pokemon/frontShiny'), 251);
assertEqual('Pokemon back shiny sprites', countFiles('src/assets/images/pokemon/backShiny'), 251);
assertAtLeast('item icons', countFiles('src/assets/images/items'), 72);
assertEqual('region maps', countFiles('src/assets/images/maps'), 2);
assertAtLeast('background images', countFiles('src/assets/images/bg'), 3);
assertAtLeast('trainer npc sprites', countFiles('src/assets/images/trainers/npcs'), 500);
assertAtLeast('trainer profile sprites', countFiles('src/assets/images/trainers/profil'), 163);

assertEqual('modern EventBus module', exists('src/core/event-bus.js') ? 1 : 0, 1);
assertEqual('core storage module', exists('src/core/storage.js') ? 1 : 0, 1);
assertEqual('core random module', exists('src/core/random.js') ? 1 : 0, 1);
assertAtLeast('UI component helper modules', walk('src/ui/components', (f) => f.endsWith('.js')).length, 2);

if (!exists('dist/index.html')) fail.push('dist/index.html missing; run npm run build');
else {
  const distHtml = read('dist/index.html');
  if (!/type="module"/.test(distHtml)) fail.push('dist/index.html does not reference a module bundle');
  if (!/assets\/.*\.[A-Za-z0-9_-]+\.js/.test(distHtml)) warn.push('dist/index.html module filename does not appear hashed');
}

const dataStyleCount = countRegex(sourceFiles, /data-style=/g);
if (dataStyleCount > 0) warn.push(`dynamic data-style bridges remain: ${dataStyleCount}`);
const legacyCallCount = countRegex(sourceFiles, /data-action="legacy-call"/g);
const contextCallCount = countRegex(sourceFiles, /data-context-call=/g);
const changeCallCount = countRegex(sourceFiles, /data-change-call=/g);
info.push(`semantic legacy-call attrs: ${legacyCallCount}`);
info.push(`semantic context-call attrs: ${contextCallCount}`);
info.push(`semantic change-call attrs: ${changeCallCount}`);

console.log('Pokeworld validation report');
console.log('===========================');
for (const line of info) console.log(`OK   ${line}`);
for (const line of warn) console.log(`WARN ${line}`);
if (fail.length) {
  for (const line of fail) console.error(`FAIL ${line}`);
  process.exit(1);
}
console.log('Validation passed.');

