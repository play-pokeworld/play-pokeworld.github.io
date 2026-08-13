// Post-vite-build step: the game references runtime images via literal
// relative paths ("src/assets/images/..."), which Vite never rewrites.
// Copy those images into dist/ under the SAME relative path so a static
// serve of dist/ alone is fully self-contained (already true for dev).
// Idempotent (copy-if-newer).
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = [
  ['src/assets/images', 'dist/src/assets/images'],
];

let copied = 0, kept = 0;
for (const [relSrc, relDst] of SOURCES) {
  const srcDir = path.join(ROOT, relSrc);
  const dstDir = path.join(ROOT, relDst);
  const entries = await fs.readdir(srcDir, { withFileTypes: true, recursive: true });
  for (const e of entries) {
    if (!e.isFile()) continue;
    const src = path.join(e.parentPath || e.path, e.name);
    const rel = path.relative(srcDir, src);
    const dst = path.join(dstDir, rel);
    try {
      const [a, b] = await Promise.all([fs.stat(src), fs.stat(dst)]);
      if (a.mtimeMs <= b.mtimeMs && a.size === b.size) { kept++; continue; }
    } catch { /* dst absent */ }
    await fs.mkdir(path.dirname(dst), { recursive: true });
    await fs.copyFile(src, dst);
    copied++;
  }
}
console.log(`[runtime-assets] src/assets/images -> dist/src/assets/images : ${copied} copie(s), ${kept + copied} fichier(s) presents.`);

