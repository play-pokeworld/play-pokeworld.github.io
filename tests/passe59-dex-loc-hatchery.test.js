/**
 * Passe 59 — quest 17 wording, Kanto fossil hatchery, location/dex records.
 *
 *  A. Kanto quest 17 no longer breaks immersion with a "to understand how
 *     it works" aside.
 *  B. Hatchery mode can be switched from the slot itself (empty + occupied)
 *     without Johto / the management menu — quest 25 (place a fossil) is
 *     possible in Kanto.
 *  C. sendFossilToHatchery flips the slot to breed, progresses fossil_revive
 *     and records an incubation visit.
 *  D. Dex / location play records: encounter, capture, defeat, hatchery
 *     incubation, training; shinyHatched follows the incubation DICE
 *     (success +1 even if already shiny; failure never +1).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { DexDetailView } from '../src/ui/views/DexDetailView.js';
import { LocationInfoView } from '../src/ui/views/LocationInfoView.js';
import { machineWindowHTML } from '../src/ui/components/machine-window.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('dex type badges go through getTypeName (FR fallback)', () => {
  const bridge = R('src/engine/runtime/classic-bridge.js');
  assert.ok(bridge.includes('getTypeName'), 'classic typeSpan no longer prints the raw English type');
  const helpers = R('src/data/game-helpers.js');
  assert.ok(helpers.includes("fire:'Feu'"), 'FR fallback table');
});

test('quest 17 FR/EN no longer mentions "pour comprendre son fonctionnement"', () => {
  const fr = R('src/localization/fr/quests.js');
  const en = R('src/localization/en/quests.js');
  assert.ok(!fr.includes('pour comprendre son fonctionnement'), 'FR immersion aside removed');
  assert.ok(!en.toLowerCase().includes('to learn how it works'), 'EN aside removed');
  assert.ok(fr.includes('faites-lui gagner 1 niveau'), 'FR still describes the level goal');
  assert.ok(en.includes('gain 1 level'), 'EN still describes the level goal');
});

test('hatchery window exposes a mode toggle on empty and occupied slots (no Johto lock)', () => {
  const ui = R('src/ui/game/hatchery-ui.js');
  assert.ok(ui.includes('modeToggle:'), 'empty slot carries a modeToggle');
  assert.ok(ui.includes("call: 'toggleHatcherySlotMode'"), 'occupied slot can toggle mode');
  assert.ok(!/const modeBtn = isLocUnlocked\('jroute29'\)/.test(ui), 'management mode button no longer Johto-locked');
  assert.ok(!ui.includes("if (!isLocUnlocked('jroute29'))"), 'occupied slot actions no longer Johto-gated');
  const mw = R('src/ui/components/machine-window.js');
  assert.ok(mw.includes('slot.modeToggle'), 'machine window renders the slot mode toggle');
});

test('machine-window empty hatchery slot renders the mode toggle next to the offer', () => {
  const html = machineWindowHTML({
    slots: [{
      offerClass: 'pw-hatchery-offer',
      offer: { label: 'Placer', call: 'openUnifiedSelectorModal', callArgs: "'hatchery_queue_0'" },
      modeToggle: { label: 'Garderie', call: 'toggleHatcherySlotMode', callArgs: '0', classes: 'hatchery-mode-toggle is-exp' },
    }],
  });
  assert.ok(html.includes('toggleHatcherySlotMode'), 'mode toggle dispatched');
  assert.ok(html.includes('hatchery-mode-toggle is-exp'), 'mode colour class kept');
  assert.ok(html.includes('openUnifiedSelectorModal'), 'place offer still present');
});

test('sendFossilToHatchery flips the slot to breed, progresses the quest and records incubation', () => {
  const sandbox = {
    console,
    G: {
      inventory: { helix_fossil: 1 },
      hatchery: [null],
      hatcheryModes: ['exp', 'exp', 'exp', 'exp'],
      hatcheryMaxSlots: 1,
      hatcheryAutomation: { slots: [{ mode: 'exp', priority: 'pokemon', queue: [] }] },
      pokedex: {},
    },
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    notify: () => {},
    saveGame: () => {},
    renderHatcheryWindow: () => {},
    renderUnifiedGrid: () => {},
    t: (k) => k,
    tr: (k) => k,
    getItemName: (k) => k,
    getFossilReviveId: () => 138,
    getFossilDisplayKey: (k) => k,
    hatcheryStepsForPokemon: () => 25,
    ensureHatcheryAutomation: () => {},
    progressCalls: [],
    progressMainQuestType: (typ, n) => sandbox.progressCalls.push([typ, n]),
    recordCalls: [],
    recordDexStat: (id, key, n) => sandbox.recordCalls.push([id, key, n]),
    FOSSIL_REVIVE_MAP: { helix_fossil: 138 },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const src = R('src/ui/game/box-selector.js');
  const fn = src.match(/function sendFossilToHatchery[\s\S]*?\n\}\n\nfunction selectUnifiedCard/);
  assert.ok(fn, 'sendFossilToHatchery extracted');
  vm.runInContext(fn[0].replace(/\nfunction selectUnifiedCard$/, ''), sandbox);
  sandbox.sendFossilToHatchery('helix_fossil', 0);
  assert.equal(sandbox.G.hatcheryModes[0], 'breed', 'slot flipped to incubation');
  assert.ok(sandbox.G.hatchery[0] && sandbox.G.hatchery[0].isFossil, 'fossil occupies the slot');
  assert.deepEqual(sandbox.progressCalls, [['fossil_revive', 1]], 'quest 25 progresses on place');
  assert.ok(sandbox.recordCalls.some((c) => c[0] === 138 && c[1] === 'hatcheryIncub'), 'incubation visit recorded');
});

test('play records: dex/loc counters store encounters, captures, defeats and shinyHatched', () => {
  const sandbox = {
    console,
    G: { pokedex: {} },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const src = R('src/application/world/collection.js');
  const start = src.indexOf('const DEX_COUNT_KEYS');
  const end = src.indexOf('function locCompletion');
  assert.ok(start >= 0 && end > start, 'record helpers extracted');
  vm.runInContext(src.slice(start, end), sandbox);

  sandbox.recordDexEncounter(25, false);
  sandbox.recordDexEncounter(25, true);
  sandbox.recordDexCapture(25, true);
  sandbox.recordDexDefeat(25, false);
  sandbox.recordDexStat(25, 'hatcheryIncub', 1);
  sandbox.recordDexStat(25, 'training', 2);
  sandbox.recordDexStat(25, 'shinyHatched', 1);
  const rec = sandbox.getDexRecordStats(25);
  assert.equal(rec.encountered, 2);
  assert.equal(rec.shinyEncountered, 1);
  assert.equal(rec.captured, 1);
  assert.equal(rec.shinyCaptured, 1);
  assert.equal(rec.beaten, 1);
  assert.equal(rec.shinyBeaten, 0);
  assert.equal(rec.hatcheryIncub, 1);
  assert.equal(rec.training, 2);
  assert.equal(rec.shinyHatched, 1);

  sandbox.recordLocStat('route1', 'beaten', 3);
  sandbox.recordLocStat('route1', 'encountered', 5);
  sandbox.recordLocStat('route1', 'captured', 1);
  const loc = sandbox.getLocRecordStats('route1');
  assert.equal(loc.beaten, 3);
  assert.equal(loc.encountered, 5);
  assert.equal(loc.captured, 1);

  const already = { shiny: true, shinyActive: true, shinyUnlocked: true };
  assert.equal(sandbox.isPokeIndividualShiny(already), true);
  assert.equal(sandbox.isPokeIndividualShiny({ id: 25 }), false);
});

test('incubation shinyHatched follows the dice, never un-shinies', () => {
  const src = R('src/application/breeding/hatchery.js');
  const start = src.indexOf('function applyHatcheryShinyRoll');
  const end = src.indexOf('function hatchEgg');
  assert.ok(start >= 0 && end > start, 'applyHatcheryShinyRoll extracted');

  function runRoll(poke, roll) {
    const sandbox = {
      console,
      G: { pokedex: {} },
      records: [],
      rollShiny: () => roll,
      unlockShinyForSpecies: () => {},
      recordDexStat: (id, key, n) => sandbox.records.push([id, key, n]),
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(src.slice(start, end), sandbox);
    const ok = sandbox.applyHatcheryShinyRoll(poke);
    return { ok, poke, records: sandbox.records };
  }

  const normalWin = runRoll({ id: 25, shiny: false }, true);
  assert.equal(normalWin.ok, true);
  assert.equal(normalWin.poke.shiny, true);
  assert.deepEqual(normalWin.records, [[25, 'shinyHatched', 1]]);

  const shinyWin = runRoll({ id: 25, shiny: true, shinyActive: true, shinyUnlocked: true }, true);
  assert.equal(shinyWin.ok, true);
  assert.equal(shinyWin.poke.shiny, true, 'already shiny stays shiny');
  assert.deepEqual(shinyWin.records, [[25, 'shinyHatched', 1]], 'successful roll still counts');

  const shinyFail = runRoll({ id: 25, shiny: true, shinyActive: true, shinyUnlocked: true }, false);
  assert.equal(shinyFail.ok, false);
  assert.equal(shinyFail.poke.shiny, true, 'failed roll does not un-shiny');
  assert.deepEqual(shinyFail.records, [], 'failed roll does not increment');

  const normalFail = runRoll({ id: 25, shiny: false }, false);
  assert.equal(normalFail.ok, false);
  assert.equal(!!normalFail.poke.shiny, false);
  assert.deepEqual(normalFail.records, []);
});

test('DexDetailView renders the compact records grid when the model provides them', () => {
  const html = DexDetailView.toHTML({
    id: 138,
    name: 'Amonita',
    shiny: false,
    spriteHtml: '<div class="pw-poke-circle-wrap"></div>',
    typesHtml: '',
    flavor: '',
    stats: [{ label: 'PV', value: 35 }],
    recordsLabel: 'Carnet',
    records: [
      { label: 'Rencontré', value: 4 },
      { label: 'K.O. pour éclore', value: 25 },
    ],
  });
  assert.ok(html.includes('pw-dex-records'), 'records grid present');
  assert.ok(html.includes('Rencontré'), 'encounter label');
  assert.ok(html.includes('K.O. pour éclore'), 'incubation KO cost');
  assert.ok(html.includes('pw-dex-stat-cell'), 'compact base-stat cell');
});

test('location panel and pokedex adapter wire the new stats', () => {
  const loc = R('src/ui/game/location-info.js');
  assert.ok(loc.includes('getLocRecordStats'), 'location panel reads loc records');
  assert.ok(loc.includes('loc_stat_beaten'), 'beaten chip');
  assert.ok(loc.includes('playStats'), 'play stats live in their own box');
  assert.ok(!/overview\.metas[\s\S]{0,400}loc_stat_beaten/.test(loc), 'beaten is not stuffed in overview chips');
  const view = R('src/ui/views/LocationInfoView.js');
  assert.ok(view.includes('m.playStats'), 'LocationInfoView renders the play-stats box');
  const dressing = R('src/ui/components/map-dressing.js');
  assert.ok(dressing.includes('locPlayStatsVNode'), 'play-stats vnode exists');
  assert.ok(!loc.includes('loc_stat_encountered'), 'encountered chip removed from the location panel');
  const dex = R('src/ui/game/pokedex.js');
  assert.ok(dex.includes('getDexRecordStats'), 'dex sheet reads play records');
  assert.ok(dex.includes('hatcheryStepsForPokemon'), 'incubation KO cost on the sheet');
  assert.ok(dex.includes('recordsLabel'), 'records handed to DexDetailView');
  assert.ok(dex.includes('recordsGroups'), 'carnet is grouped');
});

test('Pokémon incubation stays locked until Johto eggs quest 111, fossils stay allowed', () => {
  const hatch = R('src/application/breeding/hatchery.js');
  assert.ok(hatch.includes('JOHTO_EGGS_QUEST_ID = 111'), 'quest 111 is the unlock');
  assert.ok(hatch.includes('function isPokemonIncubationUnlocked'), 'unlock helper exists');
  assert.ok(hatch.includes('isPokemonIncubationUnlocked'), 'deposit path consults the lock');
  assert.ok(/export \{[\s\S]*isPokemonIncubationUnlocked/.test(hatch), 'helper is exported');
  const sel = R('src/ui/game/box-selector.js');
  assert.ok(sel.includes('hatchery_breeding_locked'), 'Pokémon tab shows the lock text');
  assert.ok(sel.includes("_usmSubTab = 'fossil'"), 'selector lands on fossils while locked');
  const fr = R('src/localization/fr/ui.js');
  assert.ok(fr.includes('Il faut en apprendre plus sur la reproduction des Pokémon'), 'FR lock copy');
});

test('mode switch and fossil revival stay locked until Kanto fossil quest 25', () => {
  const hatch = R('src/application/breeding/hatchery.js');
  assert.ok(hatch.includes('KANTO_FOSSIL_QUEST_ID = 25'), 'quest 25 is the fossil unlock');
  assert.ok(hatch.includes('function isFossilReviveUnlocked'), 'fossil unlock helper');
  assert.ok(hatch.includes('function isHatcheryModeSwitchUnlocked'), 'mode-switch helper');
  assert.ok(hatch.includes("nextMode === 'breed' && !isHatcheryModeSwitchUnlocked()"), 'toggle blocks breed before quest 25');
  assert.ok(hatch.includes("if (!isFossilReviveUnlocked()) continue"), 'queued fossils skipped while locked');
  assert.ok(hatch.includes("if (!isFossilReviveUnlocked())"), 'instant reviveFossil blocked');
  const ui = R('src/ui/game/hatchery-ui.js');
  assert.ok(ui.includes('canToggleMode ?'), 'empty slot omits the mode toggle while locked');
  assert.ok(!ui.includes('hatchery_fossil_locked'), 'no fossil lock teaser on the window');
  assert.ok(!ui.includes('Il faut en apprendre plus sur la réanimation des fossiles'), 'no leftover lock sentence');
  const sel = R('src/ui/game/box-selector.js');
  assert.ok(sel.includes('isFossilReviveUnlocked'), 'selector consults the fossil lock');
  assert.ok(sel.includes("if(typeof isFossilReviveUnlocked === 'function' && !isFossilReviveUnlocked())"), 'sendFossilToHatchery refuses early');
  const fr = R('src/localization/fr/ui.js');
  const en = R('src/localization/en/ui.js');
  assert.ok(!fr.includes('Il faut en apprendre plus sur la réanimation des fossiles.'), 'FR fossil lock copy removed');
  assert.ok(!en.includes('You still need to learn more about fossil revival.'), 'EN fossil lock copy removed');

  const src = R('src/application/breeding/hatchery.js');
  const start = src.indexOf('const JOHTO_EGGS_QUEST_ID');
  const end = src.indexOf('function hatcherySlotIsIncubation');
  assert.ok(start >= 0 && end > start, 'unlock helpers extracted');

  function runUnlock({ completed = {}, step = {}, active = [], story = true } = {}) {
    const sandbox = {
      console,
      G: { completedQuests: completed, mainStep: step, activeQuests: active },
    };
    if (story) {
      sandbox.STORY_QUESTS = [
        { id: 24, region: 'kanto' },
        { id: 25, region: 'kanto', type: 'fossil_revive' },
        { id: 26, region: 'kanto' },
        { id: 111, region: 'johto', type: 'egg_hatch' },
      ];
    }
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(src.slice(start, end), sandbox);
    return {
      fossil: sandbox.isFossilReviveUnlocked(),
      mode: sandbox.isHatcheryModeSwitchUnlocked(),
      eggs: sandbox.isPokemonIncubationUnlocked(),
    };
  }

  assert.deepEqual(runUnlock({ step: { kanto: 0, johto: 0 } }), { fossil: false, mode: false, eggs: false }, 'early Kanto: everything locked');
  // chain index of quest 25 is 1 (24, 25, 26)
  assert.deepEqual(runUnlock({ step: { kanto: 1, johto: 0 } }), { fossil: true, mode: true, eggs: false }, 'quest 25 current: fossils + mode');
  assert.deepEqual(runUnlock({ completed: { 25: true }, step: { kanto: 2, johto: 0 } }), { fossil: true, mode: true, eggs: false }, 'quest 25 done: still open');
  assert.deepEqual(runUnlock({ active: [{ cat: 'main', qid: 25 }], step: { kanto: 0, johto: 0 } }), { fossil: true, mode: true, eggs: false }, 'active quest 25 unlocks');
  assert.deepEqual(runUnlock({ completed: { 111: true }, step: { kanto: 2, johto: 2 } }), { fossil: true, mode: true, eggs: true }, 'quest 111 done: eggs too');
  assert.equal(runUnlock({ story: false }).fossil, true, 'isolated tests without STORY_QUESTS stay unlocked');
});

test('DexDetailView renders grouped carnet records and LocationInfoView the play-stats box', () => {
  const html = DexDetailView.toHTML({
    id: 25,
    name: 'Pikachu',
    shiny: false,
    spriteHtml: '',
    typesHtml: '<span class="type-badge type-electric">Électrik</span>',
    flavor: '',
    stats: [{ label: 'PV', value: 35 }],
    recordsLabel: 'Carnet',
    recordsGroups: [
      { title: 'Combat', rows: [{ label: 'Vaincu', value: 3 }] },
      { title: 'Pension & entraînement', rows: [{ label: 'Incubation', value: 1 }] },
      { title: 'Chromatique', rows: [{ label: 'Obtenu à l’incubation', value: 0 }] },
    ],
  });
  assert.ok(html.includes('pw-dex-record-group'), 'grouped carnet');
  assert.ok(html.includes('Combat'), 'combat group');
  assert.ok(html.includes('Incubation'), 'machines group');
  assert.ok(html.includes('Chromatique'), 'shiny group');
  assert.ok(html.includes('type-electric'), 'localized type badge kept');

  const locHtml = LocationInfoView.toHTML({
    overview: { title: 'Route 1', metas: ['Kanto', 'route'] },
    playStats: { title: 'Bilan du lieu', beatenLabel: 'Vaincus', capturedLabel: 'Capturés', beaten: 4, captured: 2 },
    actions: [],
  });
  assert.ok(locHtml.includes('pw-loc-play-stats'), 'separate play-stats box');
  assert.ok(locHtml.includes('Vaincus'), 'beaten label');
  assert.ok(locHtml.includes('Capturés'), 'captured label');
  assert.ok(!locHtml.includes('Rencontres'), 'encountered dropped');
});

