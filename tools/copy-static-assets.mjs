import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const viteHtml = path.join(root, 'dist/index.vite.html');
const finalHtml = path.join(root, 'dist/index.html');
if (fs.existsSync(viteHtml)) fs.renameSync(viteHtml, finalHtml);

const from = path.join(root, 'src/assets');
const to = path.join(root, 'dist/src/assets');
fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
console.log('Copied runtime assets to dist/src/assets for legacy path compatibility.');

// Remove the temporary Vite input from the source tree after build.
// The source-root index.html is the file:// fallback; dist/index.html is production.
fs.rmSync(path.join(root, 'index.vite.html'), { force: true });
