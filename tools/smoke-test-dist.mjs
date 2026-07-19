import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function checkFile(relativePath) {
  if (!exists(relativePath)) failures.push(`Missing file: ${relativePath}`);
}

checkFile('index.html');
checkFile('dist/index.html');
checkFile('src/legacy-loader.js');
checkFile('src/file-preflight.js');
checkFile('src/file-postboot.js');
checkFile('src/assets/styles/extracted-index.css');
checkFile('src/assets/styles/extracted-templates.css');
checkFile('src/assets/styles/extracted-bridges.css');

checkFile('src/assets/font/WinkySans.ttf');
if (exists('src/assets/css/style.css')) {
  const css = read('src/assets/css/style.css');
  if (!css.includes('WinkySans.ttf')) failures.push('Source CSS does not reference WinkySans.ttf');
}


if (exists('index.html')) {
  const sourceIndex = read('index.html');
  for (const script of ['src/file-preflight.js', 'src/legacy-loader.js', 'src/file-postboot.js']) {
    if (!sourceIndex.includes(script)) failures.push(`Source index does not include ${script}`);
    checkFile(script);
  }
  if (sourceIndex.includes('/src/main.js')) failures.push('Source index still references /src/main.js');
}

if (exists('dist/index.html')) {
  const distIndex = read('dist/index.html');
  const scriptMatches = [...distIndex.matchAll(/src="\.\/(assets\/[^\"]+\.js)"/g)].map((match) => match[1]);
  if (!scriptMatches.length) failures.push('dist/index.html has no built JS asset reference');
  for (const asset of scriptMatches) checkFile(`dist/${asset}`);
  const cssMatches = [...distIndex.matchAll(/href="\.\/(assets\/[^\"]+\.css)"/g)].map((match) => match[1]);
  for (const asset of cssMatches) checkFile(`dist/${asset}`);
}

const pokemonDirs = ['front', 'back', 'frontShiny', 'backShiny'];
for (const dir of pokemonDirs) {
  const sourceDir = path.join(root, 'src/assets/images/pokemon', dir);
  const distDir = path.join(root, 'dist/src/assets/images/pokemon', dir);
  const sourceCount = fs.existsSync(sourceDir) ? fs.readdirSync(sourceDir).filter((name) => name.endsWith('.png')).length : 0;
  const distCount = fs.existsSync(distDir) ? fs.readdirSync(distDir).filter((name) => name.endsWith('.png')).length : 0;
  if (sourceCount !== 251) failures.push(`Expected 251 source ${dir} sprites, got ${sourceCount}`);
  if (distCount !== 251) failures.push(`Expected 251 dist ${dir} sprites, got ${distCount}`);
}

const sourceItemsDir = path.join(root, 'src/assets/images/items');
const distItemsDir = path.join(root, 'dist/src/assets/images/items');
const sourceItemCount = fs.existsSync(sourceItemsDir) ? fs.readdirSync(sourceItemsDir).filter((name) => name.endsWith('.png')).length : 0;
const distItemCount = fs.existsSync(distItemsDir) ? fs.readdirSync(distItemsDir).filter((name) => name.endsWith('.png')).length : 0;
if (sourceItemCount < 72) failures.push(`Expected at least 72 source item icons, got ${sourceItemCount}`);
if (distItemCount < 72) failures.push(`Expected at least 72 dist item icons, got ${distItemCount}`);

console.log('PokeWorld smoke test');
console.log('====================');
for (const warning of warnings) console.log(`WARN ${warning}`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
console.log('Smoke test passed.');

