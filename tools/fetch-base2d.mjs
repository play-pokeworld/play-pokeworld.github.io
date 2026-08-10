#!/usr/bin/env node
// ============================================================================
// Download of the "Pokemon Emerald" 2D decoration sprites (phase 34)
// ----------------------------------------------------------------------------
// Source: pret/pokeemerald repo (official GBA graphics).
// tools/base2d-assets.json = list of folders + catalog alias -> file.
// Output: src/assets/images/secret-base/emerald/<name>.png  +  src/assets/images/secret-base/manifest.render2d.json
//          ({ catalog slug -> { emerald?, icon2d? } } — the ORAS 2D-icon
//          fallback (Serebii/Models Resource) is handled here for the 2D renderer).
//
// Usage : node tools/fetch-base2d.mjs
// ============================================================================
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

const execFileP = promisify(execFile);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'base2d-assets.json'), 'utf8'));
const OUT = path.join(ROOT, 'src', 'assets', 'images', 'secret-base', 'emerald');
const API = 'https://api.github.com/repos/pret/pokeemerald/contents';
const UA = 'PokeWorldAssetDownloader/1.0 (+sprites 2D bases secrètes)';

fs.mkdirSync(OUT, { recursive: true });

async function curl(url) {
  const { stdout } = await execFileP('curl', [
    '-sL', '--compressed', '--connect-timeout', '15', '--max-time', '40',
    '-A', UA, url,
  ], { maxBuffer: 32 * 1024 * 1024, encoding: 'buffer' });
  return stdout;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ——— 1) Repo folder inventory ———
const files = new Map(); // PNG name (no ext) -> raw URL
for (const dir of CFG.checkedDirs) {
  const list = JSON.parse((await curl(`${API}/${dir}`)).toString('utf8'));
  if (!Array.isArray(list)) throw new Error(`listing failed for ${dir}: ${JSON.stringify(list).slice(0, 120)}`);
  for (const f of list) {
    if (!f.name.endsWith('.png')) continue;
    const base = f.name.replace(/\.png$/, '');
    if (base.startsWith('unused_') || (base.startsWith('big_') && base !== 'big_plant')) continue; // duplicates/unused
    if ((CFG.skipList || []).includes(base)) continue;   // e.g. put_away_cursor (UI, non-decoration)
    if (!files.has(base)) files.set(base, `${CFG.raw}/${dir}/${f.name}`);
  }
  await sleep(300);
}
console.log(`${files.size} sprites 2D Émeraude référencés.`);

// ——— 2) Idempotent download ———
let got = 0, skip = 0, err = 0;
for (const [name, url] of files) {
  const dest = path.join(OUT, `${name}.png`);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 100) { skip++; continue; }
  try {
    const buf = await curl(url);
    if (buf.length < 100 || buf.slice(1, 4).toString() !== 'PNG') throw new Error('not a PNG');
    fs.writeFileSync(dest, buf);
    got++;
  } catch (e) {
    err++;
    console.error(`✖ ${name}: ${e.message}`);
  }
  await sleep(120);
}
console.log(`${got} téléchargés, ${skip} déjà présents, ${err} échecs.`);

// ——— 3) Manifeste renderer 2D —————————————————————————————————————————————
// Game catalog (126 objects) — read directly from the data.
const src = fs.readFileSync(path.join(ROOT, 'src', 'data', 'base-items-data.js'), 'utf8');
const body = src.slice(src.indexOf('const BASE_ITEMS'), src.indexOf('];', src.indexOf('const BASE_ITEMS')));
const slugs = [...new Set([...body.matchAll(/\{ s:'([a-z0-9_]+)'/g)].map((m) => m[1]))].sort();

const emerald = new Set(fs.readdirSync(OUT).filter((f) => f.endsWith('.png')).map((f) => f.replace(/\.png$/, '')));

// Phase 42/45: NO MORE ORAS fallback. The two icon staging folders
// (`icons/` Models Resource, `icons-serebii/` Serebii) were purged: every
// catalog slug is served by a NATIVE Emerald sprite (DecorGfx metatiles
// or official objgfx, baked by tools/bake-emerald-bgs.py). The manifest
// therefore keeps a single key per entry: `emerald`.
const render = {};
let nEmerald = 0;
const nIcon = 0;
for (const slug of slugs) {
  const entry = {};
  const eName = (slug in CFG.alias) ? CFG.alias[slug] : slug;
  if (eName && emerald.has(eName)) { entry.emerald = `src/assets/images/secret-base/emerald/${eName}.png`; nEmerald++; }
  if (Object.keys(entry).length) render[slug] = entry;
}
const manifest = {
  'comment': 'Renderer 2D — emerald: sprite GBA officiel (pre/pokeemerald) ; icon2d: repli icône ORAS. Généré par tools/fetch-base2d.mjs.',
  'stats': { catalog: slugs.length, emerald: nEmerald, icon2d: nIcon, covered: Object.keys(render).length,
    uncovered: slugs.filter((s) => !render[s]) },
  'items': render,
};
fs.writeFileSync(path.join(ROOT, 'src', 'assets', 'images', 'secret-base', 'manifest.render2d.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(`manifest.render2d.json: ${nEmerald} Emerald sprites + ${nIcon} 2D icons = ${Object.keys(render).length}/${slugs.length} covered.`);
console.log('Not covered (procedural rendering):', manifest.stats.uncovered.join(', ') || 'none');

