#!/usr/bin/env node
// V7-R3 · SND-04 — MANIFESTE AUDIO (« drop-in » : fichiers déposés = sons joués).
//
// Inventorie src/assets/audio/{music,sfx,cries} et écrit
// src/assets/audio/manifest.json. Le moteur (src/core/audio.js) lit ce
// manifeste UNE fois après le premier geste : un effet qui a un fichier dans
// `sfx/` remplace la recette procédurale du même nom, une musique présente
// dans `music/` est jouée pour son contexte (voir la chaîne de repli ci-dessous),
// un cri présent dans `cries/<dex>.ogg` est joué à l'apparition / au K.O. /
// dans la fiche du Pokémon. Aucune sonde réseau (pas de 404 à l'aveugle).
//
//   node tools/audio-manifest.mjs           → écrit le manifeste + bilan
//   node tools/audio-manifest.mjs --check   → échoue si le manifeste n'est pas à jour
//   node tools/audio-manifest.mjs --list    → tableau des noms attendus (présent / absent)
//
// Lancé par `npm run build` (prebuild), par download_assets.bat et par
// tools/download_assets.py (audio) ; `npm run check` vérifie la synchronisation.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO_DIR = path.join(ROOT, 'src/assets/audio');
const OUT = path.join(AUDIO_DIR, 'manifest.json');
const MUSIC_EXT = ['.mp3', '.ogg', '.m4a', '.wav'];
const SFX_EXT = ['.ogg', '.mp3', '.wav', '.m4a'];
const CRY_EXT = ['.ogg', '.mp3', '.wav'];

/** Noms d'effets connus du moteur (recettes procédurales) : un fichier
 *  `sfx/<nom>.<ext>` les remplace. Gardé en phase avec AUDIO_SFX (audio.js). */
const SFX_NAMES = [
  'click', 'open', 'notify', 'error', 'buy', 'ko', 'faint', 'levelup', 'evolve', 'hatch',
  'throw', 'catch', 'catch_fail', 'badge', 'league', 'shiny', 'shiny_catch', 'boss', 'chest',
  'quest', 'treasure', 'roamer',
];
/** Contextes musicaux de base (chaîne de repli du moteur). */
const MUSIC_BASE = [
  'menu', 'map_kanto', 'map_johto', 'map_hoenn', 'town', 'town_johto', 'town_hoenn',
  'battle_wild', 'battle_trainer', 'battle_gym', 'battle_league', 'battle_legendary',
  'battle_roaming', 'battle_boss', 'dungeon', 'dungeon_tower', 'dungeon_forest', 'dungeon_plant',
  'dungeon_lair',
  // V7-R3c · SND-06 — villes natales / grandes villes / côtières, chenaux, routes de nuit
  'town_home', 'town_city', 'town_coast', 'sea', 'map_night',
];

function listFiles(sub, exts) {
  const dir = path.join(AUDIO_DIR, sub);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => exts.includes(path.extname(f).toLowerCase()) && !f.startsWith('.'))
    .sort();
}
/** Plusieurs extensions pour une même clé : on garde la mieux supportée. */
function pickByKey(files, exts) {
  const out = {};
  for (const f of files) {
    const key = f.replace(/\.[^.]+$/, '');
    const rank = exts.indexOf(path.extname(f).toLowerCase());
    if (!(key in out) || rank < exts.indexOf(path.extname(out[key]).toLowerCase())) out[key] = f;
  }
  return out;
}

export function buildManifest() {
  const music = pickByKey(listFiles('music', MUSIC_EXT), MUSIC_EXT);
  const sfx = pickByKey(listFiles('sfx', SFX_EXT), SFX_EXT);
  const cryFiles = pickByKey(listFiles('cries', CRY_EXT), CRY_EXT);
  const cries = {};
  for (const [key, f] of Object.entries(cryFiles)) if (/^\d+$/.test(key)) cries[key] = f;
  const sortObj = (o, numeric) =>
    Object.fromEntries(
      Object.keys(o)
        .sort(numeric ? (a, b) => Number(a) - Number(b) : undefined)
        .map((k) => [k, o[k]])
    );
  return {
    version: 1,
    music: sortObj(Object.fromEntries(Object.entries(music).map(([k, f]) => [k, 'music/' + f]))),
    sfx: sortObj(Object.fromEntries(Object.entries(sfx).map(([k, f]) => [k, 'sfx/' + f]))),
    cries: sortObj(cries, true),
  };
}

export function manifestJson(m) {
  return JSON.stringify(m, null, 0) + '\n';
}

function report(m) {
  const n = (o) => Object.keys(o).length;
  console.log(
    `[audio-manifest] ${n(m.music)} musique(s), ${n(m.sfx)} effet(s) fichier, ${n(m.cries)} cri(s) → src/assets/audio/manifest.json`
  );
}

function listExpected(m) {
  const row = (kind, key, present) => `${present ? '✔' : '·'} ${kind}/${key}`;
  console.log('Musiques (music/<clé>.mp3|ogg) — clé → contexte :');
  for (const k of MUSIC_BASE) console.log('  ' + row('music', k, !!m.music[k]));
  console.log('  + music/loc_<idLieu>.mp3 (zone précise), music/trainer_<idChampion>.mp3, music/dungeon_<idLieu>.mp3');
  console.log('Effets (sfx/<nom>.ogg|mp3|wav) :');
  for (const k of SFX_NAMES) console.log('  ' + row('sfx', k, !!m.sfx[k]));
  console.log(`Cris (cries/<numéroDex>.ogg) : ${Object.keys(m.cries).length} présent(s)`);
}

const args = process.argv.slice(2);
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const m = buildManifest();
  const json = manifestJson(m);
  if (args.includes('--check')) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (cur !== json) {
      console.error('[audio-manifest] ✘ manifest.json n\'est pas à jour : lance `node tools/audio-manifest.mjs`');
      process.exit(1);
    }
    report(m);
  } else {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, json);
    report(m);
  }
  if (args.includes('--list')) listExpected(m);
}
