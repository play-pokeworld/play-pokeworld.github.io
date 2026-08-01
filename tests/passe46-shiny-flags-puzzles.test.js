import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const R = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function loadCollectionSandbox(extra = {}) {
  const sandbox = {
    console,
    Math,
    Date,
    window: {},
    G: {
      inventory: {},
      team: [],
      collection: {},
      pokedex: {},
      hatchery: [],
      training: [],
      shinyCharmRegions: {},
      lang: 'fr',
      ...extra.G,
    },
    REGION_ORDER: ['kanto', 'johto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'galar', 'paldea'],
    REGION_POKE_RANGES: {
      kanto: { start: 1, end: 151 },
      johto: { start: 152, end: 251 },
      hoenn: { start: 252, end: 386 },
      sinnoh: { start: 387, end: 493 },
      unova: { start: 494, end: 649 },
      kalos: { start: 650, end: 721 },
      alola: { start: 722, end: 809 },
      galar: { start: 810, end: 905 },
      paldea: { start: 906, end: 1025 },
    },
    isPokemonNativeToRegion(id, region) {
      const m = sandbox.REGION_POKE_RANGES[region];
      const n = Number(id);
      return m && n >= m.start && n <= m.end;
    },
    isRegionDexComplete(region) {
      return !!(sandbox.G.shinyCharmRegions && sandbox.G.shinyCharmRegions[region]);
    },
    getRegionDisplayName(r) { return r; },
    notify() {},
    ...extra,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(R('src/game/world/collection.js'), sandbox, { filename: 'collection.js' });
  return sandbox;
}

test('passe 46 A : taux shiny de base 1/4096 sans charme régional', () => {
  const sb = loadCollectionSandbox();
  assert.ok(Math.abs(sb.getShinyRateForSpecies(25) - 1/4096) < 1e-12);
  sb.Math.random = () => 0.999;
  assert.equal(sb.rollShiny(25), false);
  // Just below threshold → shiny
  sb.Math.random = () => (1/4096) - 1e-15;
  assert.equal(sb.rollShiny(25), true);
});

test('passe 46 B : Charme Chroma régional — 1/2048 seulement si dex de la région OK', () => {
  const sb = loadCollectionSandbox({
    G: {
      inventory: { shiny_charm: 1 },
      shinyCharmRegions: { kanto: Date.now() },
      team: [], collection: {}, pokedex: {}, hatchery: [], training: [], lang: 'fr',
    },
  });
  // Kanto species (#25) → 1/2048
  assert.ok(Math.abs(sb.getShinyRateForSpecies(25) - 1/2048) < 1e-12, 'Kanto + charme + dex = 1/2048');
  // Hoenn species (#252) sans dex hoenn → 1/4096
  assert.ok(Math.abs(sb.getShinyRateForSpecies(252) - 1/4096) < 1e-12, 'Hoenn sans dex 100% = 1/4096');
  // Sans espèce → base
  assert.ok(Math.abs(sb.getShinyRateForSpecies(null) - 1/4096) < 1e-12);
});

test('passe 46 C : syncShinyCharmProgress débloque le charme au 1er dex 100%', () => {
  const sb = loadCollectionSandbox({
    G: {
      inventory: {},
      shinyCharmRegions: {},
      team: [], collection: {}, pokedex: {}, hatchery: [], training: [], lang: 'fr',
    },
    isRegionDexComplete(region) { return region === 'kanto'; },
  });
  const res = sb.syncShinyCharmProgress();
  assert.equal(res.unlocked, true);
  assert.ok(sb.G.inventory.shiny_charm > 0);
  assert.ok(sb.G.shinyCharmRegions.kanto);
  assert.equal(res.newly.length, 1);
  assert.equal(res.newly[0], 'kanto');
});

test('passe 46 D : drapeaux ORAS — aucun shinyBonus, moneyMult plafonné', () => {
  const src = R('src/game/base/base-dialog.js');
  assert.ok(src.includes("shinyBonus: 0"), 'tous les rangs shinyBonus 0');
  assert.ok(!src.includes('shinyBonus: 1') && !src.includes('shinyBonus: 2'), 'plus de +1/+2 shiny');
  assert.ok(src.includes('moneyMult: 1.08') || src.includes('moneyMult: 1.05'), 'argent modéré');
  assert.ok(src.includes('dropBonus'), 'bonus butin de route');
  assert.ok(src.includes('applySecretBaseMoneyBonus'), 'helper argent exposé');
  assert.ok(src.includes('24 * 3600 * 1000'), 'cooldown 24h');
});

test('passe 46 E : Charme Chroma retiré de la quête Safari (id 60)', () => {
  const src = R('src/data/story-quests.js');
  // Find quest 60 block
  const m = src.match(/"id"\s*:\s*60[\s\S]{0,400}/);
  assert.ok(m, 'quête 60 présente');
  assert.ok(!m[0].includes('shiny_charm'), 'plus de shiny_charm en récompense de la quête 60');
});

test('passe 46 F : module explorations à énigmes présent et cohérent', () => {
  const src = R('src/game/world/puzzle-explorations.js');
  assert.ok(src.includes('PUZZLE_EXPLORATIONS'));
  assert.ok(src.includes('regirock_seal') || src.includes('regirock_braille'));
  assert.ok(src.includes('alph_panel_escape') || src.includes('alph_chamber_a') || src.includes('alph_unown_circle') || src.includes('alph_mirror_path'));
  assert.ok(src.includes('submitPuzzleAnswer'));
  const loader = R('src/loader.js');
  assert.ok(loader.includes('puzzle-explorations.js'), 'chargé par loader.js');
  // locations regi
  const hoenn = R('src/data/locations-hoenn.js');
  assert.ok(hoenn.includes('desert_ruins'));
  assert.ok(hoenn.includes('island_cave'));
  assert.ok(hoenn.includes('ancient_tomb'));
});

test('passe 46 G : shiny roll à la capture/hatch — PAS à l\'apparition wild', () => {
  const expl = R('src/game/display/exploration.js');
  const enc = R('src/game/combat/battle-encounter.js');
  const catchSrc = R('src/game/combat/catch.js');
  assert.ok(!/rollShiny\s*\(/.test(expl), 'exploration ne roll plus au spawn');
  assert.ok(/createPoke\([^)]*false/.test(enc), 'encounter spawn non-shiny');
  assert.ok(/rollShiny\s*\(/.test(catchSrc), 'capture effectue le roll');
  const hatch = R('src/game/breeding/hatchery.js');
  assert.ok(/rollShiny\s*\(/.test(hatch), 'hatchery roll à l\'éclosion');
});

test('passe 46 H : Épisode Delta toujours verrouillé derrière Kalos', () => {
  const src = R('src/data/story-quests-hoenn.js');
  assert.ok(src.includes('isKalosCompleted'));
  const helpers = R('src/data/game-helpers.js');
  assert.ok(helpers.includes('function isKalosCompleted'));
});

test('passe 46 I : plus de renderer Base 3D dans le projet runtime', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'src/game/base/base3d-view.js')));
  assert.ok(!fs.existsSync(path.join(ROOT, 'src/game/base/base3d-window.js')));
  const idx = R('index.html');
  assert.ok(!idx.includes('win-base3d'));
});

test('passe 46 J : SHINY_CHANCE config aligné sur 1/4096', () => {
  assert.ok(R('src/game/Config.js').includes('SHINY_CHANCE: 1/4096'));
  assert.ok(R('src/engine/Config.js').includes('SHINY_CHANCE: 1/4096'));
});
