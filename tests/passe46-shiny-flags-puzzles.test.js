import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessIsEsm, harnessBundleSource } from '../tools/harness-bundle.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeRequiredHatchKos } from '../src/domain/breeding/hatchery-rules.js';

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
  sandbox.computeRequiredHatchKos = computeRequiredHatchKos; // hatchery rule port (wave 33)
  vm.createContext(sandbox);
  // Vague 41 — hybride individuelle (collection ESM = bundle isolé, globales via shim).
  {
    const f = 'src/application/world/collection.js';
    const src = R(f);
    vm.runInContext(harnessIsEsm(src) ? harnessBundleSource([f]) : src, sandbox, { filename: 'collection.js' });
  }
  return sandbox;
}

test('phase 46 A: base shiny rate 1/4096 without regional charm', () => {
  const sb = loadCollectionSandbox();
  assert.ok(Math.abs(sb.getShinyRateForSpecies(25) - 1/4096) < 1e-12);
  sb.Math.random = () => 0.999;
  assert.equal(sb.rollShiny(25), false);
  // Just below threshold → shiny
  sb.Math.random = () => (1/4096) - 1e-15;
  assert.equal(sb.rollShiny(25), true);
});

test('phase 46 B: regional Shiny Charm — 1/2048 only if the region\'s dex is OK', () => {
  const sb = loadCollectionSandbox({
    G: {
      inventory: { shiny_charm: 1 },
      shinyCharmRegions: { kanto: Date.now() },
      team: [], collection: {}, pokedex: {}, hatchery: [], training: [], lang: 'fr',
    },
  });
  // Kanto species (#25) → 1/2048
  assert.ok(Math.abs(sb.getShinyRateForSpecies(25) - 1/2048) < 1e-12, 'Kanto + charme + dex = 1/2048');
  // Hoenn species (#252) without hoenn dex → 1/4096
  assert.ok(Math.abs(sb.getShinyRateForSpecies(252) - 1/4096) < 1e-12, 'Hoenn without 100% dex = 1/4096');
  // Without species → base
  assert.ok(Math.abs(sb.getShinyRateForSpecies(null) - 1/4096) < 1e-12);
});

test('phase 46 C: syncShinyCharmProgress unlocks the charm at the 1st 100% dex', () => {
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

test('phase 46 D: ORAS flags — no shinyBonus, moneyMult capped', () => {
  const src = R('src/ui/game/base/base-dialog.js');
  assert.ok(src.includes("shinyBonus: 0"), 'all ranks shinyBonus 0');
  assert.ok(!src.includes('shinyBonus: 1') && !src.includes('shinyBonus: 2'), 'plus de +1/+2 shiny');
  assert.ok(src.includes('moneyMult: 1.08') || src.includes('moneyMult: 1.05'), 'moderate money');
  assert.ok(src.includes('dropBonus'), 'bonus butin de route');
  assert.ok(src.includes('applySecretBaseMoneyBonus'), 'money helper exposed');
  assert.ok(src.includes('24 * 3600 * 1000'), 'cooldown 24h');
});

test('phase 46 E: Shiny Charm removed from the Safari quest (id 60)', () => {
  const src = R('src/data/story-quests.js');
  // Find quest 60 block
  const m = src.match(/"id"\s*:\s*60[\s\S]{0,400}/);
  assert.ok(m, 'quest 60 present');
  assert.ok(!m[0].includes('shiny_charm'), 'no more shiny_charm as quest 60 reward');
});

test('phase 46 F: puzzle-exploration module present and coherent', () => {
  const src = R('src/application/world/puzzle-explorations.js');
  assert.ok(src.includes('PUZZLE_EXPLORATIONS'));
  assert.ok(src.includes('regirock_seal') || src.includes('regirock_braille'));
  assert.ok(src.includes('alph_panel_escape') || src.includes('alph_chamber_a') || src.includes('alph_unown_circle') || src.includes('alph_mirror_path'));
  assert.ok(src.includes('submitPuzzleAnswer'));
  const loader = R('src/main.js');
  assert.ok(loader.includes('puzzle-explorations.js'), 'loaded by src/main.js');
  // locations regi
  const hoenn = R('src/data/locations-hoenn.js');
  assert.ok(hoenn.includes('desert_ruins'));
  assert.ok(hoenn.includes('island_cave'));
  assert.ok(hoenn.includes('ancient_tomb'));
});

test('phase 46 G: shiny roll at spawn time (visible in combat) — NO catch rate bonus', () => {
  const enc = R('src/application/combat/battle-encounter.js');
  const systems = R('src/application/ecs-gameplay-systems.js');
  const catchSrc = R('src/application/combat/catch.js');
  assert.ok(/rollShiny/.test(enc), 'battle-encounter rolls shiny at spawn time');
  assert.ok(/rollShiny/.test(systems), 'ECS spawn rolls shiny at spawn time');
  assert.ok(!/rollShiny/.test(catchSrc), 'capture no longer performs shiny roll');
  const hatch = R('src/application/breeding/hatchery.js');
  assert.ok(/rollShiny/.test(hatch), 'hatchery roll at hatching');
});

test('phase 46 H: Delta Episode still locked behind Kalos', () => {
  const src = R('src/data/story-quests-hoenn.js');
  assert.ok(src.includes('isKalosCompleted'));
  const helpers = R('src/data/game-helpers.js');
  assert.ok(helpers.includes('function isKalosCompleted'));
});

test('phase 46 I: no more Base 3D renderer in the runtime project', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'src/game/base/base3d-view.js')));
  assert.ok(!fs.existsSync(path.join(ROOT, 'src/game/base/base3d-window.js')));
  const idx = R('index.html');
  assert.ok(!idx.includes('win-base3d'));
});

test('phase 46 J: SHINY_CHANCE config aligned to 1/4096', () => {
  // Single canonical engine config (legacy src/game/Config.js removed)
  assert.ok(R('src/data/game-config.js').includes('SHINY_CHANCE: 1/4096'));
  // Hoenn merged into the canonical config
  assert.ok(R('src/data/game-config.js').includes('HOENN_STARTERS: [252, 255, 258]'));
  assert.ok(R('src/data/game-config.js').includes("hoenn: { name: 'Hoenn', start: 252, end: 386, badges: 8 }"));
});

