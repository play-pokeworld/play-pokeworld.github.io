import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { computeRequiredHatchKos } from '../src/domain/breeding/hatchery-rules.js';
import { harnessRunMixed, harnessIsEsm, harnessBundleSource } from '../tools/harness-bundle.mjs';

// ── Passe 14 — fossiles Johto canoniques (Lilia #345 / Anorith #347),
// fossil anti-duplication in queues, ejection on mode change,
// day-care/auto button colors, training anti-flicker ─────────────────────────
const PD_DATA = fs.readFileSync(new URL('../src/data/pd-data.js', import.meta.url), 'utf8');
const ITEMS_DATA = fs.readFileSync(new URL('../src/data/items-data.js', import.meta.url), 'utf8');
// Vague 40 — lecteur production pour la boucle mixte ordonnée (T2-D généralisé).
const PROD_R = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const SPRITES = fs.readFileSync(new URL('../src/data/sprites.js', import.meta.url), 'utf8');
const I18N = fs.readFileSync(new URL('../src/localization/i18n.js', import.meta.url), 'utf8');
const HATCHERY = fs.readFileSync(new URL('../src/application/breeding/hatchery.js', import.meta.url), 'utf8');
const HATCHERY_UI = fs.readFileSync(new URL('../src/ui/game/hatchery-ui.js', import.meta.url), 'utf8');
const BOX_SELECTOR = fs.readFileSync(new URL('../src/ui/game/box-selector.js', import.meta.url), 'utf8');
const TRAINING = fs.readFileSync(new URL('../src/application/combat/training.js', import.meta.url), 'utf8');
const SAVE = fs.readFileSync(new URL('../src/application/save/save.js', import.meta.url), 'utf8');
const CSS = fs.readFileSync(new URL('../src/assets/styles/design-system.css', import.meta.url), 'utf8');
const FR_UI = fs.readFileSync(new URL('../src/localization/fr/ui.js', import.meta.url), 'utf8');
const EN_UI = fs.readFileSync(new URL('../src/localization/en/ui.js', import.meta.url), 'utf8');

function makeEnv(overrides = {}) {
  const notifs = [];
  const nodes = {};
  const fakeNode = () => ({
    innerHTML: '', textContent: '', value: '', replaceChildren() { this.innerHTML = ''; }, style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  });
  const sandbox = {
    console, notifs,
    document: { getElementById: (id) => nodes[id] || null },
    window: {},
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    notify: (m, c) => notifs.push([String(m), c]),
    addBattleLog: () => {}, saveGame: () => {}, updateHeader: () => {},
    renderTeamWindow: () => {}, renderHatcheryWindow: () => {},
    openHatcheryManagementMenu: () => {}, renderUnifiedGrid: () => {},
    t: (k) => k,
    tr: (k, o) => k + (o ? ':' + Object.values(o).join(',') : ''),
    rand: () => 0, rollShiny: () => false, xpForLevel: () => 0,
    recalcPokeStats: () => {},
    getItemName: (k) => 'ITEM_' + k, getPokeName: (id) => 'POKE_' + id,
    createPoke: (id, lvl, shiny) => ({ id, level: lvl, shinyActive: shiny, name: 'POKE_' + id, ivs: { hp: 3, atk: 3, def: 3, spa: 3, spd: 3, spe: 3 }, evs: {} }),
    unlockShinyForSpecies: () => {}, speciesOwned: () => false,
    spriteImg: () => '', itemIcon: () => '', isSpeciesShiny: () => false,
    PD: {},
    ITEMS: { helix_fossil: { type: 'fossil' }, root_fossil: { type: 'fossil' }, claw_fossil: { type: 'fossil' } },
    G: {
      lang: 'fr', money: 999999, team: [], collection: {},
      inventory: { helix_fossil: 1 },
      hatchery: [null], hatcheryMaxSlots: 2,
      hatcheryModes: ['breed', 'exp'], hatcheryQueues: [[], []],
      hatcheryAutomation: { slots: [
        { enabled: true, mode: 'breed', filterShiny: 'all', filterIv: 'all', sort: 'iv_desc', priority: 'pokemon', queue: [] },
        { enabled: true, mode: 'exp', filterShiny: 'all', filterIv: 'all', sort: 'iv_desc', priority: 'pokemon', queue: [] },
      ] },
      automation: { autoHatch: false, autoSeedHatchery: false },
      pokedex: {}, badges: ['koga', 'x', 'y', 'z'],
    },
  };
  Object.assign(sandbox.G, overrides.G || {});
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  sandbox.computeRequiredHatchKos = computeRequiredHatchKos; // hatchery rule port (wave 33)
  vm.createContext(sandbox);
  // Vague 41 — hybride individuelle : classique = texte vm direct ;
  // converti ESM (box-selector, vague 41) = bundle isolé, globales via shim.
  for (const [label, src] of [
    ['src/application/breeding/hatchery.js', HATCHERY],
    ['src/ui/game/box-selector.js', BOX_SELECTOR],
  ]) {
    vm.runInContext(harnessIsEsm(src) ? harnessBundleSource([label]) : src, sandbox, { filename: label });
  }
  return sandbox;
}

// ── 1. New playable species ───────────────────────────────────────────

test('PD : Lilia #345 (Roche/Plante) et Anorith #347 (Roche/Insecte) existent', () => {
  const sandbox = { window: {} };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  sandbox.computeRequiredHatchKos = computeRequiredHatchKos; // hatchery rule port (wave 33)
  vm.createContext(sandbox);
  vm.runInContext(PD_DATA, sandbox);
  const lileep = sandbox.PD[345];
  const anorith = sandbox.PD[347];
  assert.ok(lileep, 'PD[345] present');
  assert.ok(anorith, 'PD[347] present');
  assert.equal(lileep[0], 'Lileep');
  assert.deepEqual([lileep[1], lileep[2]], ['Rock', 'Grass']);
  assert.equal(anorith[0], 'Anorith');
  assert.deepEqual([anorith[1], anorith[2]], ['Rock', 'Bug']);
  // Canonical stats (Array.from: the PD arrays live in the vm,
  // strict deepEqual would fail otherwise — cross-realm pitfall)
  assert.deepEqual(Array.from(lileep.slice(3, 9)), [66, 41, 77, 61, 87, 23]);
  assert.deepEqual(Array.from(anorith.slice(3, 9)), [45, 95, 50, 40, 50, 75]);
  // The game's fossil convention (catch 45 / XP 60, like #138-142)
  assert.deepEqual(Array.from(lileep.slice(10, 12)), [45, 60]);
  assert.deepEqual(Array.from(anorith.slice(10, 12)), [45, 60]);
});

test('names: getPokeName gives Lilia/Anorith (FR) and Lileep/Anorith (EN)', () => {
  const block = I18N.match(/\/\/ Species outside dex[\s\S]*?\n\}\n/);
  assert.ok(block, 'override block + getPokeName extracted');
  const sandbox = {
    POKE_NAMES_EN: { 138: 'Omanyte' }, POKE_NAMES_FR: { 138: 'Amonita' },
    PD: { 345: ['Lileep'], 347: ['Anorith'], 138: ['Omanyte'] },
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  let lang = 'fr';
  sandbox.currentLang = () => lang;
  sandbox.computeRequiredHatchKos = computeRequiredHatchKos; // hatchery rule port (wave 33)
  vm.createContext(sandbox);
  vm.runInContext(block[0], sandbox);
  assert.equal(sandbox.getPokeName(345), 'Lilia', 'FR 345');
  assert.equal(sandbox.getPokeName(347), 'Anorith', 'FR 347');
  lang = 'en';
  assert.equal(sandbox.getPokeName(345), 'Lileep', 'EN 345');
  assert.equal(sandbox.getPokeName(347), 'Anorith', 'EN 347');
  assert.equal(sandbox.getPokeName(138), 'Omanyte', 'no classic dex regression');
});

test('revival map: root→345, claw→347 everywhere (map + items)', () => {
  const sandbox = { window: {} };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  sandbox.computeRequiredHatchKos = computeRequiredHatchKos; // hatchery rule port (wave 33)
  vm.createContext(sandbox);
  // Vague 40 — ex concat slice(hatchery) + items-data : mêmes sources, même
  // ordre ; le slice reste dans le flux classique, items-data (ESM) est bundlé.
  const SLICE = '__slice/hatchery FOSSIL_REVIVE_MAP→getFossilReviveId';
  for (const seg of harnessRunMixed(
    [SLICE, 'src/data/items-data.js'],
    (label) => (label === SLICE
      ? HATCHERY.match(/const FOSSIL_REVIVE_MAP[\s\S]*?function getFossilReviveId[\s\S]*?\n\}/)[0]
      : PROD_R(label))
  )) vm.runInContext(seg.source, sandbox, { filename: seg.filename });
  assert.equal(sandbox.getFossilReviveId('root_fossil'), 345);
  assert.equal(sandbox.getFossilReviveId('claw_fossil'), 347);
  assert.equal(sandbox.getFossilReviveId('fossil'), 138, 'generic fossil unchanged → Omanyte');
  assert.equal(sandbox.ITEMS.root_fossil.revive, 345, 'ITEMS.root_fossil.revive coherent');
  assert.equal(sandbox.ITEMS.claw_fossil.revive, 347, 'ITEMS.claw_fossil.revive coherent');
  // Copy exposed by the domain (file-preflight.js): must follow the same map
  const PREFLIGHT = [fs.readFileSync(new URL('../src/engine/input/action-dispatcher.js', import.meta.url), 'utf8'), fs.readFileSync(new URL('../src/engine/runtime/classic-bridge.js', import.meta.url), 'utf8')].join('\n');
  assert.ok(/root_fossil:345/.test(PREFLIGHT), 'domaine : root_fossil→345');
  assert.ok(/claw_fossil:347/.test(PREFLIGHT), 'domaine : claw_fossil→347');
  assert.ok(!/root_fossil:220/.test(PREFLIGHT + HATCHERY), 'no more 220 targets');
  assert.ok(!/claw_fossil:246/.test((PREFLIGHT + HATCHERY).replace(/\[220, 345\]|\[246, 347\]/g, '')), 'no more 246 targets');
});

test('sprites: entries of the 4 buckets + files present + DEX_MAP', () => {
  for (const bucket of ['front', 'frontShiny']) {
    assert.ok(SPRITES.includes(`"345":"src/assets/images/pokemon/${bucket}/lileep.png"`), bucket + ' 345');
    assert.ok(SPRITES.includes(`"347":"src/assets/images/pokemon/${bucket}/anorith.png"`), bucket + ' 347');
    for (const n of ['lileep', 'anorith']) {
      assert.ok(
        fs.existsSync(new URL(`../src/assets/images/pokemon/${bucket}/${n}.png`, import.meta.url)),
        `${bucket}/${n}.png downloaded (link via download_assets.py)`
      );
    }
  }
  assert.ok(/"lileep":\s*345/.test(SPRITES), 'DEX_MAP lileep');
  assert.ok(/"anorith":\s*347/.test(SPRITES), 'DEX_MAP anorith');
});

test('item descriptions: FR and EN indeed promise Lileep/Anorith', () => {
  const FR_ITEMS = fs.readFileSync(new URL('../src/localization/fr/items.js', import.meta.url), 'utf8');
  const EN_ITEMS = fs.readFileSync(new URL('../src/localization/en/items.js', import.meta.url), 'utf8');
  assert.ok(/root_fossil:[\s\S]{0,120}Lilia/.test(FR_ITEMS), 'FR racine → Lilia');
  assert.ok(/claw_fossil:[\s\S]{0,120}Anorith/.test(FR_ITEMS), 'FR griffe → Anorith');
  assert.ok(/"root_fossil"[\s\S]{0,160}Lileep/.test(EN_ITEMS), 'EN racine → Lileep');
  assert.ok(/"claw_fossil"[\s\S]{0,160}Anorith/.test(EN_ITEMS), 'EN griffe → Anorith');
});

// ── 2. Fossil anti-duplication ────────────────────────────────────────

test('sanitizeHatcheryFossilQueues: 1 copy cannot live in 2 queues', () => {
  const env = makeEnv();
  env.G.inventory = { helix_fossil: 1 };
  env.G.hatcheryQueues = [['fossil:helix_fossil'], ['fossil:helix_fossil']];
  const removed = env.sanitizeHatcheryFossilQueues();
  assert.equal(removed, 1, 'duplicate removed');
  assert.deepEqual([...env.G.hatcheryQueues[0]], ['fossil:helix_fossil'], 'first queue kept (slot order)');
  assert.equal(env.G.hatcheryQueues[1].length, 0, 'second queue purged');
});

test('sanitize: respects the real stock (2 in stock → 2 queues OK, 0 in stock → purge)', () => {
  const env = makeEnv();
  env.G.inventory = { helix_fossil: 2 };
  env.G.hatcheryQueues = [['fossil:helix_fossil'], ['fossil:helix_fossil']];
  assert.equal(env.sanitizeHatcheryFossilQueues(), 0, 'nothing to remove');
  env.G.inventory = {};
  assert.equal(env.sanitizeHatcheryFossilQueues(), 2, 'stock 0 → everything purged');
});

test('getFossilAvailableCount = stock − reservations across all queues', () => {
  const env = makeEnv();
  env.G.inventory = { helix_fossil: 2 };
  env.G.hatcheryQueues = [['fossil:helix_fossil', 'u1'], []];
  assert.equal(env.getFossilAvailableCount('helix_fossil'), 1);
  env.G.hatcheryQueues[1] = ['fossil:helix_fossil'];
  assert.equal(env.getFossilAvailableCount('helix_fossil'), 0);
});

test('fossilQueueCandidates offers nothing when everything is reserved', () => {
  const env = makeEnv();
  env.G.inventory = { helix_fossil: 1 };
  env.G.hatcheryQueues = [[], ['fossil:helix_fossil']];
  assert.deepEqual([...env.fossilQueueCandidates()], []);
});

test('sendFossilToHatchery refuses a fully reserved fossil (anti-duplicate)', () => {
  const env = makeEnv();
  env.G.inventory = { helix_fossil: 1 };
  env.G.hatcheryQueues = [['fossil:helix_fossil'], []];
  env.sendFossilToHatchery('helix_fossil', 0);
  assert.equal(env.G.inventory.helix_fossil, 1, 'stock unchanged');
  assert.equal(env.G.hatchery[0], null, 'slot not filled');
  assert.ok(env.notifs.some(([m]) => m.includes('fossil_all_queued')), 'dedicated notification');
});

test('reviveFossil refuses a fully reserved fossil', () => {
  const env = makeEnv();
  env.G.inventory = { helix_fossil: 1 };
  env.G.hatcheryQueues = [[], ['fossil:helix_fossil']];
  env.reviveFossil('helix_fossil');
  assert.equal(env.G.inventory.helix_fossil, 1, 'stock unchanged');
  assert.ok(env.notifs.some(([m]) => m.includes('fossil_all_queued')));
});

test('processHatcheryQueue repairs a save with a fossil duplicate before filling', () => {
  const env = makeEnv();
  env.G.automation.autoSeedHatchery = true;
  env.G.inventory = { helix_fossil: 1 };
  env.G.hatcheryQueues = [['fossil:helix_fossil'], ['fossil:helix_fossil']];
  env.processHatcheryQueue();
  const total = env.G.hatcheryQueues.flat().filter((e) => e === 'fossil:helix_fossil').length
    + (env.G.hatchery.some((s) => s && s.isFossil && s.fossilKey === 'helix_fossil') ? 1 : 0);
  assert.ok(total <= 1, "never more reserved+used units than the stock");
  assert.equal((env.G.inventory.helix_fossil || 0) + total, 1, 'conservation du stock');
});

test('UI: queues/lab/selector display the net reservation quantities', () => {
  assert.ok(/getHatcheryFossilReservations/.test(HATCHERY_UI), 'fossil lab: reservations read');
  assert.ok(/fossil_all_queued/.test(HATCHERY_UI), 'fossil lab: button disabled');
  assert.ok(/getHatcheryFossilReservations/.test(BOX_SELECTOR), 'selector: reservations read');
  assert.ok(/fossil_all_queued/.test(BOX_SELECTOR), 'selector: button disabled');
});

// ── 3. Save: fossils migrated, generic kept ──────────────────────────────────

test("save: the generic mine fossil is no longer deleted at load", () => {
  const retired = SAVE.match(/RETIRED_ITEMS = \[([^\]]+)\]/) || SAVE.match(/retiredKey of \[([^\]]+)\]/); // pass 27: single shared list
  assert.ok(retired, 'list of removed objects found');
  assert.ok(!retired[1].split(',').some((k) => k.trim() === "'fossil'"), "'fossil' absent from the purge");
  assert.ok(retired[1].includes("'ancient_fossil'"), 'legacy doubletons stay purged');
});

test('save: Johto fossils in incubation migrate to the canonical targets', () => {
  assert.ok(/root_fossil:\s*\[220,\s*345\]/.test(SAVE), 'root migration 220→345');
  assert.ok(/claw_fossil:\s*\[246,\s*347\]/.test(SAVE), 'claw migration 246→347');
});

// ── 4. Training: anti-flicker + auto button ───────────────────────────────────

test("anti-flicker: the live panel is rebuilt only on structural change", () => {
  assert.ok(/trainingBattlePanelSignature\(activeSlots\)/.test(TRAINING), 'signature computed');
  assert.ok(/if\(battleSig === _trainingBattlePanelSig && panel\.classList\.contains\('open'\)\) return/.test(TRAINING), 'rebuild skipped if unchanged');
  assert.ok(/data-training-text="player-move"/.test(TRAINING) && /data-training-text="enemy-move"/.test(TRAINING), 'move names patched in place');
});

test('panel signature: changes with the round/enemy, stable otherwise', () => {
  const block = TRAINING.match(/(?:var|let) _trainingBattlePanelSig[\s\S]*?\n\}\n/);
  assert.ok(block, 'signature block extracted');
  const sandbox = {
    currentLang: () => 'fr',
    findPokemonByTrainingSlot: (slot) => slot._t,
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  sandbox.computeRequiredHatchKos = computeRequiredHatchKos; // hatchery rule port (wave 33)
  vm.createContext(sandbox);
  vm.runInContext(block[0], sandbox);
  const mk = (idx, enemyId, enemyName) => [{
    slot: { battle: { mode: 'ev', enemyIndex: idx, enemies: [{ id: enemyId, name: enemyName }], enemy: { id: enemyId, name: enemyName } }, _t: { uid: 'u1' } },
    i: 0,
  }];
  const s1 = sandbox.trainingBattlePanelSignature(mk(0, 25, 'Coach A'));
  const s1b = sandbox.trainingBattlePanelSignature(mk(0, 25, 'Coach A'));
  const s2 = sandbox.trainingBattlePanelSignature(mk(1, 26, 'Coach B'));
  assert.equal(s1, s1b, 'stable with identical structure');
  assert.notEqual(s1, s2, 'changes on the next round');
});

test('anti-flicker: training window rebuilt only if the structure changed', () => {
  assert.ok(/maybeRenderTrainingWindowTick\(\)/.test(TRAINING), 'conditional tick render used');
  const upd = TRAINING.match(/function updateTrainingSlots\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(upd, 'updateTrainingSlots found');
  assert.ok(!/try\{\s*renderTrainingWindow\(\);\s*\}catch/.test(upd[0]), 'no more renderTrainingWindow per tick');
  assert.ok(!/try\{\s*renderTeamWindow\(\);\s*\}catch/.test(upd[0]), 'no more renderTeamWindow per tick');
});

test('training window auto button: "Auto: on/off" labels', () => {
  const btn = TRAINING.match(/training-slot-auto-btn[\s\S]{0,460}/);
  assert.ok(btn, 'auto button found');
  assert.ok(btn[0].includes("t('training_auto_on')") && btn[0].includes("t('training_auto_off')"), 'explicit keys used');
  const onRule = CSS.match(/\.training-slot-auto-btn\.is-on\s*\{[^}]*\}/g) || [];
  assert.ok(onRule.some((r) => r.includes('var(--green)') && r.includes('box-shadow')), 'bright green reinforced in CSS');
});

// ── 5. i18n keys ────────────────────────────────────────────────────────────

test('i18n: new keys present in FR and EN', () => {
  for (const key of ['fossil_queued_count', 'fossil_all_queued', 'hatchery_mode_ejected']) {
    assert.ok(FR_UI.includes(`"${key}":`), `FR ${key}`);
    assert.ok(EN_UI.includes(`"${key}":`), `EN ${key}`);
  }
});

