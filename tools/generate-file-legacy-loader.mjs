import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const loader = fs.readFileSync(path.join(root, 'src/loader.js'), 'utf8');
const skipped = new Set([
  'src/legacy/scripts/core/state.js',
  'src/legacy/scripts/core/event-bus.js',
  'src/legacy/scripts/core/util.js',
]);
const scriptPaths = [...loader.matchAll(/"(src\/[^"]+?\.js)"\s*\+\s*V/g)]
  .map((match) => match[1])
  .filter((scriptPath) => !skipped.has(scriptPath));

const content = `(function () {
  const scripts = ${JSON.stringify(scriptPaths, null, 2)};
  function loadScript(index) {
    if (index >= scripts.length) return;
    const script = document.createElement('script');
    script.src = scripts[index];
    script.async = false;
    script.onload = function () { loadScript(index + 1); };
    script.onerror = function () { console.error('[PokeWorld] Failed to load legacy script:', scripts[index]); loadScript(index + 1); };
    document.head.appendChild(script);
  }
  loadScript(0);
})();
`;
fs.writeFileSync(path.join(root, 'src/legacy-loader.js'), content, 'utf8');
console.log(`Generated src/legacy-loader.js from ${scriptPaths.length} scripts.`);
