import fs from 'node:fs';
import path from 'node:path';

const required = ['index.html', 'src/main.js', 'src/data/sprites.js', 'src/assets/styles/design-system.css'];
const missing = required.filter((file) => !fs.existsSync(path.resolve(file)));
if (missing.length) {
  console.error('Missing required files:', missing.join(', '));
  process.exit(1);
}
console.log('Project structure OK');

// Wave 39 — HTML-write sink contract: every innerHTML assignment goes through
// the canonical scroll-preserving sink (`pwSetHtml` / `_pwSetHtmlSafe`).
// Documented engine exceptions: the sinks themselves.
const SINK_EXEMPTIONS = new Set(['src/core/game-utils.js', 'src/engine/render/vdom.js']);
const rawAssign = [];
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(full);
    else if (entry.name.endsWith('.js')) {
      const rel = path.relative(process.cwd(), full).replace(/\\/g, '/');
      if (SINK_EXEMPTIONS.has(rel)) continue;
      const lines = fs.readFileSync(full, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (/\.innerHTML\s*=[^=]/.test(line) && !line.includes('_pwSetHtmlSafe = function') && !line.includes('pwSetHtml(')) {
          rawAssign.push(`${rel}:${i + 1}`);
        }
      });
    }
  }
}
scan(path.resolve('src'));
if (rawAssign.length) {
  console.error('[sink contract] raw innerHTML assignments outside the canonical sinks (use _pwSetHtmlSafe / pwSetHtml):');
  rawAssign.forEach((l) => console.error('  - ' + l));
  process.exit(1);
}
console.log('HTML sink contract OK (0 raw .innerHTML = outside the documented engine sinks)');


