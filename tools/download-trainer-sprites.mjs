import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const manifestFiles = [
  path.join(root, 'tools', 'trainer-sprite-manifest.json'),
  path.join(root, 'tools', 'trainer-profile-manifest.json'),
];

const normalizeUrl = (url) => {
  const value = new URL(url);
  value.pathname = value.pathname
    .split('/')
    .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
    .join('/');
  return value.toString();
};

let downloaded = 0;
let skipped = 0;
for (const manifestPath of manifestFiles) {
  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch (_) {
    continue;
  }
  const outputDir = path.join(root, manifest.outputDir || 'src/assets/images/trainers/npcs');
  const rawBase = manifest.sourceBase || '';
  await fs.mkdir(outputDir, { recursive: true });

  for (const sprite of manifest.sprites || []) {
    const fileName = sprite.file;
    const sourceUrl = normalizeUrl(sprite.sourceUrl || `${rawBase.replace(/\/$/, '')}/${String(sprite.sourcePath || '').replace(/^\//, '')}`);
    const dest = path.join(outputDir, fileName);
    try {
      const stat = await fs.stat(dest);
      if (stat.size > 100) {
        skipped++;
        continue;
      }
    } catch (_) {}
    const spriteRes = await fetch(sourceUrl);
    if (!spriteRes.ok) throw new Error(`Failed ${fileName}: ${spriteRes.status} ${sourceUrl}`);
    const arrayBuffer = await spriteRes.arrayBuffer();
    await fs.writeFile(dest, Buffer.from(arrayBuffer));
    downloaded++;
  }
}
console.log(`Trainer asset download complete. Downloaded now: ${downloaded}, already present: ${skipped}`);
