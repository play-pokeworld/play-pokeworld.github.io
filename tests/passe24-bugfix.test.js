import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { AtollPanelView } from '../src/ui/views/AtollPanelView.js'; // wave 13: real DS view injected into the vm sandbox
import { harnessBundleSource, harnessIsEsm } from '../tools/harness-bundle.mjs';

// ── Phase 24: fixes for the 8 bugs reported in game ──────────────────────
//  #1 abilities missing from the sheets (camelCase vs lowercase engine)
//  #3 ability/hidden workshop never unlocked ('elite4' badge never recorded)
//  #4 asymmetric training slots + auto "do everything" on locked sessions
//  #5 bag right-click in "equip" mode with no item sheet
//  #6 Factory: no pre-battle screen to reorganize the loaned team
//  #7 team addition not always at the end (residual swap index)
//  #8 i18n: move/ability descs, types, status colors, truncated immunities
const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

function makeSandbox() {
  const notifications = [];
  const sandbox = {
    console, window: {},
    document: { getElementById: () => null, querySelectorAll: () => [] },
    G: {
      team: [], teamSlotItems: [], collection: {}, hatchery: [], inventory: {},
      unlockedTalents: {}, lang: 'fr', badges: [], defeatedChamps: {},
    },
    rand: (a, b) => a, chance: () => false, rollShiny: () => false,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    notify: (msg, color) => notifications.push(String(msg)),
    saveGame: () => {}, setMsg: () => {}, addBattleLog: () => {}, updateHeader: () => {},
    renderTeamWindow: () => {}, renderTrainingBattlePanel: () => {}, renderTrainingWindow: () => {},
    addStaffXp: () => {},
    _notifications: notifications,
  };
  sandbox.window = sandbox;
  sandbox.PokeUI = { views: { AtollPanelView } }; // wave 13 (legitimate move: renderBattleAtoll delegates to the DS view)
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of [
    'src/data/moves.js', 'src/data/pd-data.js',
    'src/data/items-data.js', 'src/data/items-helpers.js',
    'src/data/poke-talents-data.js', 'src/data/talents-full.js',
    'src/data/locations-data.js', 'src/data/locations-johto.js', 'src/data/game-helpers.js',
    'src/application/pokemon-factory.js',
    'src/data/atoll-sets-data.js', 'src/application/world/atoll-core.js',
    'src/localization/fr/types.js', 'src/localization/en/types.js',
    'src/localization/fr/talents.js', 'src/localization/en/talents.js',
    'src/localization/fr/move-descs.js',
    'src/ui/game/badge-helper.js',
    'src/localization/data.js', 'src/localization/i18n.js',
    'src/application/combat/training.js',
    'src/ui/game/team-manage.js',
    'src/ui/game/fullscreen-panel.js',
  ]) {
    // T2-D (vague 37) : classiques évalués en vm directe (parité exacte,
    // const inter-fichiers préservés) ; les converts ESM sont bundlés à la volée.
    const __text = R(f);
    vm.runInContext(harnessIsEsm(__text) ? harnessBundleSource([f]) : __text, sandbox, { filename: f });
  }
  return sandbox;
}
const sb = makeSandbox();
const join = (a) => Array.from(a).join(',');

// ————————————————————————— #1 —————————————————————————
test('phase 24 #1: ability pools 100% lowercase and covered by TALENTS_FULL', () => {
  let bad = 0, pools = 0;
  for (const [id, list] of Object.entries(sb.POKE_TALENTS)) {
    pools++;
    for (const tal of list) {
      if (tal !== tal.toLowerCase() || !sb.TALENTS_FULL[tal]) bad++;
    }
  }
  assert.equal(pools, 251, 'one ability pool per species (Kanto+Johto)');
  assert.equal(bad, 0, 'no camelCase id nor any outside TALENTS_FULL in the pools');
  let badHidden = 0, hiddenCount = 0;
  for (const [id, rec] of Object.entries(sb.POKEMON_TALENTS)) {
    if (!rec || !rec.hiddenAbility) continue;
    hiddenCount++;
    if (rec.hiddenAbility !== rec.hiddenAbility.toLowerCase() || !sb.TALENTS_FULL[rec.hiddenAbility]) badHidden++;
  }
  assert.ok(hiddenCount > 200, 'hidden abilities defined per species');
  assert.equal(badHidden, 0, 'hidden abilities normalized and resolvable');
  // Cured sets: no more pinned camelCase abilities (source)
  assert.ok(!/talent:\s*'[a-z]+[A-Z][A-Za-z]*'/.test(R('src/data/official-teams-data.js')), 'official teams: normalized abilities');
  assert.ok(!/\[\s*'[a-z]+[A-Z][A-Za-z]*',/.test(R('src/data/atoll-sets-data.js')), 'atoll sets: normalized abilities');
});

test('phase 24 #1: case-tolerant resolution (old saves)', () => {
  assert.ok(sb.getTalentRecord('waterAbsorb'), 'getTalentRecord resolves a legacy camelCase id');
  assert.equal(sb.getTalentRecord('waterabsorb'), sb.TALENTS_FULL.waterabsorb);
  assert.equal(sb.getTalentName('waterAbsorb'), sb.getTalentName('waterabsorb'), 'same name regardless of case');
  assert.ok(sb.getTalentDesc('insomnia').includes('sommeil'), 'full FR desc (insomnia → sleep)');
  // FR sandbox: expected value is the game's canonical French ability description
  assert.equal(sb.getTalentDesc('immunity'), 'Immunisé contre le poison.');
  for (const [k, rec] of Object.entries(sb.TALENTS_FULL)) {
    assert.ok(!/immunity to$|on  weather|inflict  |from  /.test(rec.info || ''), `fixed info: ${k}`);
  }
});

test('phase 24 #1: createPoke always assigns a valid ability', () => {
  for (const id of [1, 4, 7, 25, 94, 130, 131, 143, 149, 150, 212, 248]) {
    const p = sb.createPoke(id, 5);
    assert.ok(p && p.talent, `species ${id}: assigned ability`);
    assert.ok(sb.getSpeciesTalents(id).includes(p.talent), `species ${id}: ability from the pool (${p.talent})`);
    assert.ok(sb.getTalentRecord(p.talent), `species ${id}: ability resolvable in TALENTS_FULL (${p.talent})`);
  }
});

// ————————————————————————— #3 —————————————————————————
test('phase 24 #3: the ability/hidden workshop unlocks with the League', () => {
  delete sb.G.championTitle;
  sb.G.regionLeagueWon = {};
  sb.G.badges = [];
  assert.equal(sb.isTrainingModeUnlocked('talent'), false, 'locked before the League');
  assert.equal(sb.isTrainingModeUnlocked('hidden'), false, 'hidden ability locked before the League');
  sb.G.championTitle = true; // what markRegionLeagueWon records on victory
  assert.equal(sb.isTrainingModeUnlocked('talent'), true, 'unlocked after League victory (without elite4 badge)');
  assert.equal(sb.isTrainingModeUnlocked('hidden'), true, 'hidden ability unlocked after the League');
  delete sb.G.championTitle;
  sb.G.regionLeagueWon = { johto: true };
  assert.equal(sb.isTrainingModeUnlocked('talent'), true, 'unlocked via the Johto League too');
  sb.G.regionLeagueWon = {};
});

// ————————————————————————— #4 —————————————————————————
test('phase 24 #4: the auto "do everything" mode skips locked sessions', () => {
  delete sb.G.championTitle;
  sb.G.regionLeagueWon = {};
  sb.G.badges = ['blaine', 'giovanni']; // level + ev unlocked, abilities NOT
  const p = sb.createPoke(7, 5); // Squirtle: trainable abilities + EV + levels
  const autoAll = { mode: 'all', enabled: true, queue: [] };
  const resolved = sb.resolveTrainingAutoMode(p, autoAll);
  assert.ok(resolved !== 'talent' && resolved !== 'hidden', `without the League, "do everything" does not start the workshop (got: ${resolved})`);
  assert.ok(['move', 'ev', 'level'].includes(resolved), 'it moves to the next unlocked training');
  sb.G.championTitle = true;
  if (sb.getTrainableTalents(p).length > 0) {
    assert.equal(sb.resolveTrainingAutoMode(p, autoAll), 'talent', 'with the League, "do everything" starts with abilities');
  }
  // Starting a locked session: clean refusal
  delete sb.G.championTitle;
  sb.G.regionLeagueWon = {}; // NB: the League won during the test persisted state (intended semantics)
  sb.G.trainingSlots = [{ uid: null, loc: null, idStr: null, active: false }];
  sb.setTrainingSlotPokemon(0, 'box', 'sq1', (sb.G.collection.sq1 = p));
  const before = sb._notifications.length;
  assert.equal(sb.startTrainingBattle('talent', 0), false, 'startTrainingBattle locked → refusal');
  assert.ok(sb._notifications.length > before, 'explanatory notification shown');
  assert.equal(sb.startTrainingBattle(null, 0), false, 'null mode = "done" starts nothing');
});

test('phase 24 #4: the manual queue advances when the slot\'s Pokémon is done', () => {
  const a = sb.ensureTrainingAutomation();
  a.slots[0].enabled = false;
  a.slots[0].queue = [];
  const trainee = sb.createPoke(25, 100);
  const next = sb.createPoke(4, 5);
  sb.G.collection.wait1 = next;
  a.slots[0].queue.push(next.uid);
  // "Done" fixture: only the trainee has nothing left to do (the queued
  // Pokémon keeps its real trainings — otherwise it would be filtered out).
  const origAvail = sb.trainingModeAvailability;
  sb.trainingModeAvailability = (p) => (p && p.uid === trainee.uid)
    ? { move: false, talent: false, ev: false, level: false, hidden: false, totalEvs: 36 }
    : origAvail(p);
  sb.G.trainingSlots = [{ uid: null, loc: null, idStr: null, active: false }];
  sb.setTrainingSlotPokemon(0, 'box', 'cur1', (sb.G.collection.cur1 = trainee));
  assert.equal(sb.hasAnyUnlockedTrainingAvailable(trainee), false, 'Pokémon truly done');
  // Integration: a training ends without automation → the slot frees up
  // THEN the next queued Pokémon takes it over (without starting a battle).
  const slot0 = sb.G.trainingSlots[0];
  slot0.active = true;
  slot0.battle = { mode: 'ev', enemy: { name: 'dummy' }, enemies: [{ name: 'dummy' }], enemyIndex: 0 };
  const before = sb._notifications.length;
  const done = sb.completeTrainingSlot(0, true);
  assert.equal(done, true, 'slot completion');
  assert.equal(sb.G.trainingSlots[0].uid, next.uid, 'the next in queue took the slot');
  assert.equal(sb.G.trainingSlots[0].active, false, 'no auto battle without automation');
  assert.equal(a.slots[0].queue.length, 0, 'queue emptied');
  assert.ok(sb._notifications.length > before, 'the player is notified of moving to the next one');
  sb.trainingModeAvailability = origAvail; // restauration
});

// ————————————————————————— #5 —————————————————————————
test('phase 24 #5: right-click reopens the item sheet in the "equip" bag', () => {
  const src = R('src/ui/game/team-ui.js');
  // Phase 25: the handler goes through the openItemInfoFromEquip wrapper, which
  // records the equipment selector as the return source (the sheet's back
  // button reopens the item choice, not the global bag).
  assert.ok(src.includes('data-context-call="openItemInfoFromEquip" data-context-args="\'${key}\', ${teamIdx}"'),
    'equipment selector rows carry the contextual right-click handler');
  assert.ok(src.includes('function openItemInfoFromEquip'), 'dedicated wrapper present in team-ui.js');
});

// ————————————————————————— #6 —————————————————————————
test('phase 24 #6: Factory — pre-battle screen with loaned-team reorganization', () => {
  sb.G.championTitle = true; // atoll accessible
  sb.G.atoll = null;
  sb.prepareAtollFactoryBattle('factory_c');
  const run = sb.getAtollFactoryRun();
  assert.ok(run && Array.isArray(run.team) && run.team.length > 0, 'the Factory streak is created without starting a battle');
  const orderBefore = join(run.team.map((p) => p.id));
  // Phase 25: reordering goes through swaps from the new preparation
  // panel's drag & drop (clone of the Active Team).
  sb.atollFactorySwapPoke(0, 1);
  const orderAfter = join(run.team.map((p) => p.id));
  assert.notEqual(orderAfter, orderBefore, 'swap: Pokémon order modified');
  sb.atollFactorySwapPoke(1, 0);
  assert.equal(join(run.team.map((p) => p.id)), orderBefore, 'reverse swap: back to initial order');
  sb.atollFactorySwapPoke(0, -1); // out of bounds: no-op
  assert.equal(join(run.team.map((p) => p.id)), orderBefore, 'no out-of-bounds swap');
  const p0 = run.team[0];
  if ((p0.moves || []).length >= 2) {
    const movesBefore = join(p0.moves.map((m) => m.id));
    sb.atollFactorySwapMoves(0, 0, 1);
    assert.notEqual(join(p0.moves.map((m) => m.id)), movesBefore, 'swap: move order modified');
    sb.atollFactorySwapMoves(0, 1, 0);
    assert.equal(join(p0.moves.map((m) => m.id)), movesBefore, 'reverse swap: moves back');
  }
  // No streak: null run when leaving a new state
  sb.G.atoll = null;
  assert.equal(sb.getAtollFactoryRun(), null);
});

// ————————————————————————— #7 —————————————————————————
test('phase 24 #7: team addition always happens at the end (swap index purged)', () => {
  sandboxSpyReset();
  sb.window._swapFromTeamIdx = 3; // residue of a click on a team card
  sb.openAddToTeamSelector();
  assert.equal(sb.window._swapFromTeamIdx, null, 'swap index purged on "+" opening');
  assert.equal(sb._usmSpy.length, 1, 'selector opened');
  assert.equal(sb._usmSpy[0], 'team', '"team" mode kept');
  // Both "+" cards (team-ui + team-manage) go through the dedicated entry point
  assert.ok(R('src/ui/game/team-ui.js').includes('data-call="openAddToTeamSelector"'), 'team-ui: + dedicated card');
  assert.ok(R('src/ui/game/team-manage.js').includes('data-call="openAddToTeamSelector"'), 'team-manage: + dedicated card');
});
function sandboxSpyReset() {
  if (!sb._usmSpy) {
    sb._usmSpy = [];
    sb.openUnifiedSelectorModal = (action) => sb._usmSpy.push(action);
  } else sb._usmSpy.length = 0;
}

// ————————————————————————— #8 —————————————————————————
test('phase 24 #8: types localized everywhere via getTypeName', () => {
  sb.G.lang = 'fr';
  assert.equal(sb.getTypeName('Fire'), 'Feu');
  assert.equal(sb.getTypeName('electric'), 'Électrik');
  assert.equal(sb.getTypeName('Dark'), 'Ténèbres');
  // The badges reuse the helper
  assert.ok(R('src/core/game-utils.js').includes('getTypeName(type)'), 'typeSpan localized');
  assert.ok(R('src/application/economy/item-engine.js').includes('getTypeName(typeName)'), 'localized item badges');
  sb.G.lang = 'en';
  assert.equal(sb.getTypeName('Fire'), 'Fire');
  sb.G.lang = 'fr';
});

test('phase 24 #8: move descriptions in French (400/400) and read first', () => {
  const src = R('src/localization/fr/move-descs.js');
  const entries = [...src.matchAll(/^  "(\w+)": "/gm)].map((m) => m[1]);
  // Vague 39 : table canonique unique (615 clés, superset — ex-duplication
  // quests/move-descs réconciliée). L'intention « chaque capacité a sa
  // description FR » est mesurée en couverture, plus par l'ancien compte figé.
  assert.ok(entries.length >= 400, `every move has an FR description (measured coverage: ${entries.length} canonical entries)`);
  sb.G.lang = 'fr';
  assert.ok(sb.t('move_descs.thunderbolt').includes('paralyser'), 't() resolves FR descriptions');
  assert.ok(sb.t('move_descs.tackle').length > 0);
  const modal = R('src/ui/game/poke-modal.js');
  const iLoc = modal.indexOf("t('move_descs.' + moveId)");
  const iEn = modal.indexOf('moveDesc = mv.desc');
  assert.ok(iLoc > 0 && iEn > iLoc, 'openMoveInfo reads the locale BEFORE the English mv.desc text');
});

test('phase 24 #8: statuses colored like weather in descriptions', () => {
  assert.equal(typeof sb.replaceStatusTerms, 'function', 'replaceStatusTerms exposed');
  const out = sb.replaceStatusTerms('10% de chance de brûler. Peut paralyser la cible et l\'empoisonner.');
  const badges = out.match(/move-desc-badge/g) || [];
  assert.ok(badges.length >= 3, `burn + paralysis + poison colored (${badges.length} badges)`);
  assert.ok(out.includes('background'), 'colored badges');
  const w = sb.replaceWeatherTerms('Invoque le soleil.');
  assert.ok(w.includes('move-desc-badge'), 'weather always colored');
  assert.ok(R('src/ui/game/poke-modal.js').includes('replaceStatusTerms(moveDesc)'), 'move descriptions processed');
});

test('phase 24 #8: ability descriptions 100% French and complete', () => {
  const fr = R('src/localization/fr/talents.js');
  assert.ok(!/immunity to|on  weather|inflict  /.test(fr), 'no more truncated descriptions in FR');
  const en = R('src/localization/en/talents.js');
  assert.ok(!/immunity to"|on  weather|inflict  /.test(en), 'no more truncated descriptions in EN');
  sb.G.lang = 'fr';
  for (const id of [1, 25, 130, 149, 248]) {
    for (const tal of sb.getSpeciesTalents(id).slice(0, 6)) {
      const name = sb.getTalentName(tal);
      const desc = sb.getTalentDesc(tal);
      assert.ok(name && name !== `talents.${tal}.name`, `${tal}: localized name`);
      assert.ok(desc && desc !== `talents.${tal}.desc`, `${tal}: localized description`);
    }
  }
  assert.ok(sb.getTalentName('sandveil').includes('Voile Sable'));
  assert.ok(sb.getTalentDesc('waterveil').includes('brûlure'), 'waterveil immunizes against burn');
  assert.ok(sb.getTalentDesc('magmaarmor').includes('gel'), 'magmaarmor immunizes against freeze');
});

