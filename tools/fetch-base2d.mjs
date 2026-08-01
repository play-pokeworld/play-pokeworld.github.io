#!/usr/bin/env node
// ============================================================================
// Téléchargement des sprites 2D « Pokémon Émeraude » des décorations (passe 34)
// ----------------------------------------------------------------------------
// Source : dépôt pret/pokeemerald (graphismes officiels GBA).
// tools/base2d-assets.json = liste des dossiers + alias catalogue -> fichier.
// Sortie : src/assets/images/secret-base/emerald/<nom>.png  +  src/assets/images/secret-base/manifest.render2d.json
//          ({ slug du catalogue -> { emerald?, icon2d? } } — le repli icône 2D
//          ORAS (Serebii/Models Resource) est géré ici pour le renderer 2D).
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

// ——— 1) Inventaire des dossiers du dépôt ——————————————————————————————————
const files = new Map(); // nom PNG (sans ext) -> URL raw
for (const dir of CFG.checkedDirs) {
  const list = JSON.parse((await curl(`${API}/${dir}`)).toString('utf8'));
  if (!Array.isArray(list)) throw new Error(`listing impossible pour ${dir}: ${JSON.stringify(list).slice(0, 120)}`);
  for (const f of list) {
    if (!f.name.endsWith('.png')) continue;
    const base = f.name.replace(/\.png$/, '');
    if (base.startsWith('unused_') || (base.startsWith('big_') && base !== 'big_plant')) continue; // doublons/inutilisés
    if ((CFG.skipList || []).includes(base)) continue;   // ex. put_away_cursor (UI, non-décoration)
    if (!files.has(base)) files.set(base, `${CFG.raw}/${dir}/${f.name}`);
  }
  await sleep(300);
}
console.log(`${files.size} sprites 2D Émeraude référencés.`);

// ——— 2) Téléchargement idempotent —————————————————————————————————————————
let got = 0, skip = 0, err = 0;
for (const [name, url] of files) {
  const dest = path.join(OUT, `${name}.png`);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 100) { skip++; continue; }
  try {
    const buf = await curl(url);
    if (buf.length < 100 || buf.slice(1, 4).toString() !== 'PNG') throw new Error('pas un PNG');
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
// Catalogue du jeu (126 objets) — lu directement depuis la data.
const src = fs.readFileSync(path.join(ROOT, 'src', 'data', 'base-items-data.js'), 'utf8');
const body = src.slice(src.indexOf('const BASE_ITEMS'), src.indexOf('];', src.indexOf('const BASE_ITEMS')));
const slugs = [...new Set([...body.matchAll(/\{ s:'([a-z0-9_]+)'/g)].map((m) => m[1]))].sort();

const emerald = new Set(fs.readdirSync(OUT).filter((f) => f.endsWith('.png')).map((f) => f.replace(/\.png$/, '')));

// Passe 42/45 : PLUS AUCUN repli ORAS. Les deux dossiers de staging d'icônes
// (`icons/` Models Resource, `icons-serebii/` Serebii) ont été purgés : chaque
// slug du catalogue est servi par un sprite Émeraude NATIF (métatiles DecorGfx
// ou objgfx officiels, cuits par tools/bake-emerald-bgs.py). Le manifeste ne
// contient donc plus qu'une seule clé par entrée : `emerald`.
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
console.log(`manifest.render2d.json: ${nEmerald} sprites Émeraude + ${nIcon} icônes 2D = ${Object.keys(render).length}/${slugs.length} couverts.`);
console.log('Non couverts (rendu procédural):', manifest.stats.uncovered.join(', ') || 'aucun');

