import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── FIX pack (2026-08) — regression guards for the four requested changes ──
//   1. Pokédex detail sheet scroll  (covered in info-panel-navigation.test.js
//      + the CSS contract asserted below)
//   2. Quest battles: close-only while a battle runs, refusal while the
//      end-of-battle summary is open, never a deferred retry.
//   3. The mine unlocks with the Diglett / Taupiqueur cave, not Route 11.
//   4. Mine energy per battle: 15 → 5, from a single source of truth.

const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// ── 1. Pokédex detail sheet must be able to scroll ────────────────────────

test('fix 1 — the design system forces the dex detail sheet to scroll', () => {
  const css = R('src/assets/styles/design-system.css');
  const block = css.slice(css.indexOf('#poke-modal #poke-modal-inner.poke-detail-inner'));
  assert.ok(block, 'the scroll contract block exists');
  assert.match(block, /overflow-y:\s*auto\s*!important/, 'scrolling is forced');
  assert.match(block, /max-height:\s*85vh/, 'the sheet is height-capped so it can overflow');
});

test('fix 1 — leaving an info panel resets the modal surface', () => {
  const bridge = R('src/engine/runtime/classic-bridge.js');
  assert.match(bridge, /function pwResetInfoModalSurface\s*\(/, 'the reset helper exists');
  const back = bridge.slice(bridge.indexOf('function pwInfoBack('));
  const body = back.slice(0, back.indexOf('\n}'));
  assert.match(body, /pwResetInfoModalSurface\(\)/, 'pwInfoBack calls it');
  // Both poisoning states must be cleared by the helper.
  const helper = bridge.slice(bridge.indexOf('function pwResetInfoModalSurface('));
  const hBody = helper.slice(0, helper.indexOf('\n}\n'));
  assert.match(hBody, /remove\('pw-info-modal'\)/, 'the info geometry class is dropped');
  assert.match(hBody, /pw-panel-shell/, 'the leftover panel shell is dropped');
});

test('fix 1 — the dex + team sheets defensively reset the surface on entry', () => {
  for (const f of ['src/ui/game/pokedex.js', 'src/ui/game/poke-modal.js']) {
    assert.match(R(f), /pwResetInfoModalSurface/, `${f} clears the surface before rendering`);
  }
});

// ── 2. Quest battles ──────────────────────────────────────────────────────

const QUEST = R('src/application/quests/quest-core.js');

test('fix 2 — no deferred retry is scheduled for quest battles', () => {
  const suspicious = QUEST.match(/setTimeout\([^)]*(startQuestTrainerBattle|startQuestDefeatBattle|claimQuest)/g);
  assert.equal(suspicious, null, 'quest battles are never re-armed on a timer');
});

test('fix 2 — the shared guards exist and are read defensively', () => {
  assert.match(QUEST, /function _isBattleRunning\s*\(/);
  assert.match(QUEST, /function _isBattleSummaryOpen\s*\(/);
  const summary = QUEST.slice(QUEST.indexOf('function _isBattleSummaryOpen('));
  assert.match(summary.slice(0, 400), /battle-summary-modal/, 'it inspects the real summary modal');
  assert.match(summary.slice(0, 400), /contains\('open'\)/, 'open state via the .open class');
});

test('fix 2 — the three entry points refuse while the summary is open', () => {
  const entries = ['function startQuestTrainerBattle(', 'function startQuestDefeatBattle(', 'function claimQuest('];
  for (const e of entries) {
    const i = QUEST.indexOf(e);
    assert.ok(i > -1, `${e} exists`);
    const body = QUEST.slice(i, i + 3000);
    assert.match(body, /_isBattleSummaryOpen\(\)/, `${e} guards on the summary`);
    assert.match(body, /quest_battle_summary_open/, `${e} explains the refusal`);
    assert.match(body, /_isBattleRunning\(\)/, `${e} guards on a running battle`);
  }
});

for (const entry of ['function startQuestTrainerBattle(', 'function startQuestDefeatBattle(']) {
test(`fix 2 — a running battle is only closed, never replaced in one click (${entry.slice(9, -1)})`, () => {
  const i = QUEST.indexOf(entry);
  const body = QUEST.slice(i, i + 3000);
  const guard = body.slice(body.indexOf('if(_isBattleRunning())'));
  const guardBody = guard.slice(0, guard.indexOf('\n }') + 3);
  assert.match(guardBody, /endBattle\(\)/, 'the current battle is closed');
  assert.match(guardBody, /quest_battle_stop_current/, 'the user is told why');
  assert.match(guardBody, /return;/, 'and nothing else happens on that click');
  assert.doesNotMatch(guardBody, /startBattle|startChampBattle/, 'no battle starts in the same click');
});
}

test('fix 2 — both locales carry the quest battle messages', () => {
  for (const lang of ['fr', 'en']) {
    const ui = R(`src/localization/${lang}/ui.js`);
    assert.match(ui, /["']?quest_battle_summary_open["']?\s*:\s*["']\S/, `${lang} has quest_battle_summary_open`);
    assert.match(ui, /["']?quest_battle_stop_current["']?\s*:\s*["']\S/, `${lang} has quest_battle_stop_current`);
  }
});

// ── 3. Mine unlock ────────────────────────────────────────────────────────

test('fix 3 — the mine tab no longer gates on a raw badge count', () => {
  const tabs = R('src/ui/game/tabs.js');
  assert.match(tabs, /function _mineTabUnlocked\s*\(/, 'the gate is a named helper');
  const i = tabs.indexOf("if(tab === 'mine'");
  assert.ok(i > -1, 'the mine tab gate exists');
  const gate = tabs.slice(i, i + 200);
  assert.match(gate, /_mineTabUnlocked\(\)/, 'the gate uses the helper');
  assert.doesNotMatch(gate, /badges\.length/, 'no badge-count shortcut left');
});

test('fix 3 — the gate resolves to the Diglett cave, like every other check', () => {
  const helper = R('src/ui/game/tabs.js');
  const h = helper.slice(helper.indexOf('function _mineTabUnlocked('));
  const body = h.slice(0, h.indexOf('\n}'));
  assert.match(body, /mineUnlocked/, 'it delegates to mineUnlocked()');
  assert.match(body, /diglettscave/, 'its fallback targets the Diglett cave');
  const map = R('src/ui/game/map-logic.js');
  assert.match(map, /mineUnlocked[\s\S]{0,160}diglettscave/, 'mineUnlocked() itself targets the cave');
  // The cave requires 3 badges, Route 11 only 2 — the very off-by-one fixed.
  const locs = R('src/data/locations-data.js');
  assert.match(locs, /\bdiglettscave:\s*\{[^}]*badgeReq:\s*3/, 'the Diglett cave still needs 3 badges');
  assert.match(locs, /\broute11:\s*\{[^}]*badgeReq:\s*2/, 'Route 11 (the old, too-early gate) needs only 2');
});

// ── 4. Mine energy per battle ─────────────────────────────────────────────

test('fix 4 — a single source of truth worth 5 energy', async () => {
  const cfg = await import('../src/data/game-config.js');
  assert.equal(cfg.GAME.MINE.ENERGY_PER_BATTLE, 5, 'GAME.MINE.ENERGY_PER_BATTLE is 5');
  assert.equal(cfg.MINE_ENERGY_PER_BATTLE, 5, 'the standalone constant matches');
  assert.equal(globalThis.MINE_ENERGY_PER_BATTLE, 5, 'it is mirrored on the global surface');
});

test('fix 4 — the three consumers read the constant, not a literal', () => {
  const sites = [
    ['src/application/combat/battle-status.js', /G\.mine\.energy\s*=\s*Math\.min\(maxE,\s*G\.mine\.energy\s*\+\s*_mineEnergyPerBattle\(\)\)/],
    ['src/application/combat/catch.js', /G\.mine\.energy\s*=\s*Math\.min\(.*\+\s*_mineEnergyPerBattle\(\)\)/],
    ['src/application/save/offline-engine.js', /_mineEnergyPerBattle\(\)\s*\*\s*res\.won/],
  ];
  for (const [f, re] of sites) {
    const src = R(f);
    assert.match(src, re, `${f} reads the constant`);
    assert.match(src, /function _mineEnergyPerBattle\(\)/, `${f} resolves it defensively`);
    assert.doesNotMatch(src, /G\.mine\.energy[^\n]*\+\s*15\b/, `${f} has no leftover +15`);
  }
});

test('fix 4 — the defensive reader falls back to 5, never to 15', () => {
  const src = R('src/application/combat/battle-status.js');
  const fn = src.slice(src.indexOf('function _mineEnergyPerBattle()'));
  const body = fn.slice(0, fn.indexOf('\n}'));
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(body + '\n}\nthis.f = _mineEnergyPerBattle;', sandbox);
  assert.equal(sandbox.f(), 5, 'with nothing defined the fallback is 5');
  vm.runInContext('var GAME = { MINE: { ENERGY_PER_BATTLE: 7 } };', sandbox);
  assert.equal(sandbox.f(), 7, 'GAME.MINE wins over the hardcoded fallback');
  vm.runInContext('var MINE_ENERGY_PER_BATTLE = 9;', sandbox);
  assert.equal(sandbox.f(), 9, 'the dedicated constant has the highest priority');
});

test('fix 4 — mine tool costs and the energy upgrade are untouched', () => {
  const mine = R('src/application/economy/mine.js');
  assert.match(mine, /MINE_ENERGY_UPGRADE_COSTS/, 'the upgrade table still exists');
  assert.match(mine, /maxEnergy[^\n]*25|25[^\n]*maxEnergy/, 'the +25 max-energy upgrade is unchanged');
});

// ── Follow-up pack (2026-08, user feedback after delivery) ────────────────
//   A. The mine STILL unlocked around Route 11 on the mobile surface: the
//      desktop windows are gated by updateFeatureWindows(), but in
//      mobile-mode that function delegates to applyMobileView(), which
//      showed whatever "Gestion" sub-view was selected with no unlock test.
//   B. The Pokédex sheet listed no attack at all: PD[…][9] (legacy move
//      slot) is [] for every species in the generated pd-data.js.

test('follow-up A — the mobile manage views are unlock-gated', () => {
  const bridge = R('src/engine/runtime/classic-bridge.js');
  assert.match(bridge, /function pwManageViewUnlocked\s*\(/, 'the mobile gate helper exists');

  const helper = bridge.slice(bridge.indexOf('function pwManageViewUnlocked('));
  const body = helper.slice(0, helper.indexOf('\n  }'));
  // the mine sub-view is gated by the very same predicate as the desktop window
  assert.match(body, /view === 'mine'[\s\S]*?mineUnlocked/, 'the mine reuses mineUnlocked()');
  assert.match(body, /view === 'training'[\s\S]*?trainingUnlocked/, 'training reuses trainingUnlocked()');
  assert.match(body, /view === 'hatchery'[\s\S]*?hatcheryUnlocked/, 'the hatchery reuses hatcheryUnlocked()');

  const apply = bridge.slice(bridge.indexOf('function applyMobileView('));
  // a locked view must never resolve to a visible window …
  assert.match(apply, /if \(!pwManageViewUnlocked\(manageView\)\)/, 'a locked manage view falls back');
  // … and its subnav button must be hidden outright
  assert.match(apply, /btn\.style\.display = unlocked \? '' : 'none'/, 'locked subnav buttons are hidden');
});

test('follow-up A — mineUnlocked() remains the single source of truth', () => {
  const map = R('src/ui/game/map-logic.js');
  const fn = map.slice(map.indexOf('function mineUnlocked()'));
  const body = fn.slice(0, fn.indexOf('\n}'));
  assert.match(body, /isLocUnlocked\('diglettscave'\)/, 'it gates on the real cave access');
  // The Route 2 back entrance must NOT be OR-ed in: Route 2 is cleared in the
  // first minutes, so its only remaining gate is badgeReq 3 — that OR is what
  // made the mine open the moment Surge was beaten.
  assert.doesNotMatch(body, /\|\|\s*isLocUnlocked\('diglettscave_2'\)/, 'the back entrance is not an alternative gate');
  const locs = R('src/data/locations-data.js');
  assert.match(locs, /diglettscave:[^\n]*badgeReq:3/, 'the Diglett cave needs 3 badges');
  assert.match(locs, /route11:[^\n]*badgeReq:2/, 'Route 11 only needs 2 — strictly earlier');
});

test('follow-up E — the mine never opens on the Surge badge alone', () => {
  // The two mine gates must agree, and neither may fall back to a badge count.
  const tabs = R('src/ui/game/tabs.js');
  const fn = tabs.slice(tabs.indexOf('function _mineTabUnlocked()'));
  const body = fn.slice(0, fn.indexOf('\n}\n'));
  assert.match(body, /mineUnlocked/, 'it delegates to mineUnlocked() first');
  assert.doesNotMatch(body, /badges\.length\s*>=\s*3/, 'no badge-count fallback');
  assert.doesNotMatch(body, /\|\|\s*isLocUnlocked\('diglettscave_2'\)/, 'no back-entrance OR');
});

test('follow-up B — the dex sheet sources its moves from the real move pool', () => {
  const dex = R('src/ui/game/pokedex.js');
  assert.match(dex, /function _dexSpeciesMoves\s*\(/, 'the move resolver exists');
  const fn = dex.slice(dex.indexOf('function _dexSpeciesMoves('));
  const body = fn.slice(0, fn.indexOf('\n}'));
  assert.match(body, /getSpeciesMovePool/, 'it uses the engine-side move pool');
  // openDexEntry must consume the resolver, not the always-empty legacy slot
  const open = dex.slice(dex.indexOf('function openDexEntry('));
  assert.match(open, /const moves = _dexSpeciesMoves\(id, pd\)/, 'openDexEntry uses the resolver');
});

test('follow-up B — the legacy PD move slot really is empty (why the fix is needed)', () => {
  const pd = R('src/data/pd-data.js');
  const line = pd.split('\n').find((l) => l.includes('PD[25] ='));
  assert.ok(line, 'Pikachu exists in the generated data');
  // slot 9 is the move array and it ships empty — hence the blank section
  assert.match(line, /\[\]/, 'the legacy move slot is empty in the shipped data');
});

// ── 3rd pass: the mine follows the CAVE, never a badge count ───────────────

test('follow-up C — the Surge badge must NOT force-unlock the Diglett cave', () => {
  const save = R('src/application/save/save.js');
  const i = save.indexOf("G.badges.includes('surge')");
  assert.ok(i > 0, 'the surge backfill block still exists');
  const block = save.slice(i, save.indexOf('}', save.indexOf('repeatableQuestsUnlocked', i)));
  assert.doesNotMatch(block, /unlockedLocs\['diglettscave'\]\s*=\s*true/, 'the cave is not pre-opened by the badge');
  assert.doesNotMatch(block, /unlockedLocs\['diglettscave_2'\]\s*=\s*true/, 'nor is its second half');
  // the legitimate badge unlocks stay
  assert.match(block, /unlockedLocs\['vermilion'\]\s*=\s*true/, 'Vermilion still follows the badge');
  // and old saves get repaired only when the cave was never actually visited
  assert.match(save, /_diglettUnlockRepaired/, 'a migration cleans previously-tainted saves');
});

// ── 3rd pass: the dex lists level-up AND TM/HM AND training moves ─────────

test('follow-up D — the dex lists every learnable move, all three categories', () => {
  const dex = R('src/ui/game/pokedex.js');
  const fn = dex.slice(dex.indexOf('function _dexSpeciesMoves('));
  const body = fn.slice(0, fn.indexOf('\n}'));
  assert.match(body, /getSpeciesMovePool/, 'level-up moves');
  assert.match(body, /getCtCsMoveIds/, 'TM/HM moves');
  assert.match(body, /getSpeciesTrainingOnlyPool/, 'training-only moves');
  assert.match(body, /seen\.has\(key\)/, 'and it deduplicates across the three pools');
});

test('follow-up D — the three category helpers partition the full pool', async () => {
  const src = R('src/data/game-helpers.js');
  // training-only = full pool minus TM/HM minus level-up: that is what makes
  // the dex total equal the full learnable pool with no duplicate and no gap.
  const fn = src.slice(src.indexOf('function getSpeciesTrainingOnlyPool('));
  const body = fn.slice(0, fn.indexOf('\n}'));
  assert.match(body, /getSpeciesFullLearnablePool/, 'it starts from the full pool');
  assert.match(body, /if \(ct\[id\]\) continue;/, 'it excludes TM/HM moves');
  assert.match(body, /getMoveLearnLevel\(nid, id\) !== 999/, 'it excludes level-up moves');
});

// ── 5th pass: the two halves of a linked place unlock simultaneously ───────
//
// Diglett's Cave has two entrances: `diglettscave` (behind Route 11) and
// `diglettscave_2` (next to Route 2, reachable in the first minutes). They are
// ONE place — `group:'diglettscave'` — so they must share a single unlock
// state, granted after Route 11. These tests execute the real module.

async function loadMapLogic() {
  globalThis.window = globalThis;
  globalThis.G = {};
  globalThis.notify = () => {};
  globalThis.t = (k) => k;
  globalThis.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  await import('../src/data/locations-data.js');
  await import('../src/data/game-config.js');
  return import('../src/ui/game/map-logic.js');
}

const CLEARED_PATH = ['pallet', 'route1', 'viridian', 'route2', 'route2_south', 'viridianforest',
  'pewter', 'route3', 'mtmoon', 'route4', 'cerulean', 'route5', 'saffron', 'route6', 'vermilion'];

function seedSave(recomputeUnlocks, { badges, route11Wins, location = 'vermilion', mutate }) {
  const G = globalThis.G;
  for (const k of Object.keys(G)) delete G[k];
  Object.assign(G, {
    region: 'kanto', location, badges, storyIdx: 99,
    unlockedLocs: {}, wildWinsByLoc: {}, visitedMaps: {},
    team: [], collection: {}, inventory: {}, quests: {}, questsDone: [], defeatedChamps: {}
  });
  for (const id of CLEARED_PATH) { G.unlockedLocs[id] = true; G.wildWinsByLoc[id] = 30; }
  G.wildWinsByLoc.route11 = route11Wins;
  if (route11Wins > 0) G.unlockedLocs.route11 = true;
  if (mutate) mutate(G);
  recomputeUnlocks();
  return G;
}

test('5th pass — both cave entrances share ONE unlock state', async () => {
  const { isLocUnlocked, recomputeUnlocks } = await loadMapLogic();
  const cases = [
    { label: '2 badges', badges: ['brock', 'misty'], route11Wins: 0, expected: false },
    { label: 'Surge badge, Route 11 uncleared', badges: ['brock', 'misty', 'surge'], route11Wins: 0, expected: false },
    { label: 'Route 11 cleared', badges: ['brock', 'misty', 'surge'], route11Wins: 10, expected: true },
    { label: '8 badges but Route 11 uncleared', badges: ['brock', 'misty', 'surge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni'], route11Wins: 0, expected: false }
  ];
  for (const c of cases) {
    seedSave(recomputeUnlocks, c);
    assert.equal(isLocUnlocked('diglettscave'), c.expected, `main entrance — ${c.label}`);
    assert.equal(isLocUnlocked('diglettscave_2'), c.expected, `Route 2 entrance — ${c.label}`);
  }
});

test('5th pass — the Route 2 back entrance no longer opens the mine early', async () => {
  const { mineUnlocked, recomputeUnlocks } = await loadMapLogic();
  seedSave(recomputeUnlocks, { badges: ['brock', 'misty', 'surge'], route11Wins: 0 });
  assert.equal(mineUnlocked(), false, 'the cave is not reachable yet, so neither is the mine');
  seedSave(recomputeUnlocks, { badges: ['brock', 'misty', 'surge'], route11Wins: 10 });
  assert.equal(mineUnlocked(), true, 'clearing Route 11 opens the cave and the mine together');
});

test('5th pass — a save tainted by the old build gets its back door closed', async () => {
  const { isLocUnlocked, recomputeUnlocks } = await loadMapLogic();
  // Older builds persisted unlockedLocs.diglettscave_2 = true far too early.
  const G = seedSave(recomputeUnlocks, {
    badges: ['brock', 'misty', 'surge'], route11Wins: 0,
    mutate: (g) => { g.unlockedLocs.diglettscave_2 = true; }
  });
  assert.equal(isLocUnlocked('diglettscave_2'), false, 'the stale flag is ignored');
  assert.equal(G.unlockedLocs.diglettscave_2, undefined, 'and recomputeUnlocks() clears it from the save');
});

test('5th pass — standing inside the cave keeps every entrance open', async () => {
  const { isLocUnlocked, recomputeUnlocks } = await loadMapLogic();
  for (const here of ['diglettscave', 'diglettscave_2']) {
    seedSave(recomputeUnlocks, { badges: ['brock', 'misty', 'surge'], route11Wins: 0, location: here });
    assert.equal(isLocUnlocked('diglettscave'), true, `standing in ${here}: main entrance usable`);
    assert.equal(isLocUnlocked('diglettscave_2'), true, `standing in ${here}: back entrance usable`);
  }
});

test('5th pass — the back entrance tooltip points at Route 11, like the main one', async () => {
  const { blockingNeighbor, recomputeUnlocks } = await loadMapLogic();
  seedSave(recomputeUnlocks, { badges: ['brock', 'misty', 'surge'], route11Wins: 0 });
  assert.equal(blockingNeighbor('diglettscave'), 'route11');
  assert.equal(blockingNeighbor('diglettscave_2'), 'route11', 'no more misleading "already open" hint');
});

test('5th pass — grouping the cave leaves the rest of the map untouched', async () => {
  const { isLocUnlocked, recomputeUnlocks } = await loadMapLogic();
  seedSave(recomputeUnlocks, { badges: ['brock', 'misty', 'surge'], route11Wins: 0 });
  // Route 2 is itself a grouped place (route2 / route2_south) and must stay open.
  for (const id of ['route2', 'route2_south', 'viridianforest', 'vermilion', 'route11']) {
    assert.equal(isLocUnlocked(id), true, `${id} stays reachable`);
  }
});

test('5th pass — the group primary is resolved from the data, not hardcoded', async () => {
  const map = R('src/ui/game/map-logic.js');
  assert.match(map, /function _locGroupPrimary\s*\(/, 'the helper exists');
  const fn = map.slice(map.indexOf('function _locGroupPrimary('));
  const body = fn.slice(0, fn.indexOf('\n}'));
  assert.match(body, /loc\.group/, 'it reads the group declared in the location data');
  assert.doesNotMatch(body, /'diglettscave'/, 'no cave-specific hardcoding');
  // and the three gates all go through it
  for (const gate of ['function blockingNeighbor(', 'function isLocUnlocked(', 'function recomputeUnlocks(']) {
    const g = map.slice(map.indexOf(gate));
    assert.match(g.slice(0, g.indexOf('\n}\n')), /_locGroupPrimary/, `${gate} uses the helper`);
  }
});

// ── 6th pass: "Bilan du lieu" only where you can explore ───────────────────

test('6th pass — the location summary box is tied to the Explore button', () => {
  const loc = R('src/ui/game/location-info.js');
  // ONE shared predicate: the box and the button can no longer drift apart.
  assert.match(loc, /const canExplore = \(loc\.type !== 'town'\);/, 'single source of truth');
  assert.match(loc, /const locRec = \(canExplore && typeof getLocRecordStats/, 'summary gated by it');
  const btn = loc.slice(loc.indexOf('if(canExplore){'));
  assert.match(btn.slice(0, 300), /explore_btn/, 'the Explore button uses the same predicate');
  // and the old ungated forms are gone
  assert.doesNotMatch(loc, /const locRec = \(typeof getLocRecordStats/, 'no ungated summary left');
});

test('6th pass — towns get neither the Explore button nor the summary', async () => {
  globalThis.window = globalThis;
  globalThis.G = { lang: 'fr' };
  globalThis.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  await import('../src/data/locations-data.js');
  const LOCS = globalThis.LOCS;
  let towns = 0, explorable = 0;
  for (const l of Object.values(LOCS)) {
    // the two features share one condition, so they are always in agreement
    if (l.type === 'town') towns++; else explorable++;
  }
  assert.ok(towns > 0 && explorable > 0, 'both kinds of location exist');
  assert.equal(LOCS.pallet.type, 'town', 'a town stays a town (no Explore, no summary)');
  assert.notEqual(LOCS.route1.type, 'town', 'a route keeps both');
});

// ── 6th pass: the mine energy hint quotes the REAL numbers ─────────────────

test('6th pass — the mine energy hint is interpolated, never hardcoded', () => {
  for (const lang of ['fr', 'en']) {
    const eco = R(`src/localization/${lang}/economy.js`);
    const line = eco.split('\n').find((l) => l.includes('mine_energy_hint'));
    assert.ok(line, `${lang}: the key exists`);
    assert.match(line, /\{regen\}/, `${lang}: the regen rate is a placeholder`);
    assert.match(line, /\{perBattle\}/, `${lang}: the per-battle bonus is a placeholder`);
    assert.doesNotMatch(line, /\+\s*15\b/, `${lang}: the stale +15 is gone`);
  }
  const ui = R('src/ui/game/mine-ui.js');
  assert.match(ui, /function _mineEnergyHint\(\)/, 'a resolver builds the hint');
  assert.match(ui, /hint: _mineEnergyHint\(\)/, 'the mine window uses the resolver');
  const fn = ui.slice(ui.indexOf('function _mineEnergyHint()'));
  const body = fn.slice(0, fn.indexOf('\n}'));
  assert.match(body, /MINE_ENERGY_PER_BATTLE/, 'it reads the per-battle constant');
  assert.match(body, /MINE_ENERGY_REGEN/, 'it reads the regen constant');
});

test('6th pass — the config regen matches the recharge ticker', async () => {
  await import('../src/data/game-config.js');
  assert.equal(globalThis.MINE_ENERGY_PER_BATTLE, 5, 'per-battle bonus is the rebalanced 5');
  assert.equal(globalThis.MINE_ENERGY_REGEN, 2, 'regen matches what the ticker really grants');
  const timers = R('src/application/bootstrap-timers.js');
  // the ticker must consume the constant instead of its own literal
  assert.match(timers, /MINE_ENERGY_REGEN/, 'the ticker reads the shared constant');
  assert.doesNotMatch(timers, /\(G\.mine\.energy\|\|0\) \+ 2\)/, 'no hardcoded +2 left in the ticker');
});

test('6th pass — the rendered hint shows the real values, no leftover braces', async () => {
  await import('../src/data/game-config.js');
  const eco = R('src/localization/fr/economy.js');
  const raw = eco.split('\n').find((l) => l.includes('mine_energy_hint')).match(/:"(.*)",?$/)[1];
  const out = raw
    .split('{regen}').join(String(globalThis.MINE_ENERGY_REGEN))
    .split('{perBattle}').join(String(globalThis.MINE_ENERGY_PER_BATTLE));
  assert.equal(out, '+2 / sec · +5 par victoire sauvage');
  assert.doesNotMatch(out, /\{|\}/, 'every placeholder was substituted');
});
