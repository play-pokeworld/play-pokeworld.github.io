import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';
import { ws, wsIncludes, wsMatch } from './helpers/ws.js'; // V7 · DBT-01 — comparaison insensible à la mise en forme

// ── V7 · P1 — LEG-01 (moteur de quêtes légendaires, D13) + LEG-02 (10 chaînes
//    de Hoenn) ────────────────────────────────────────────────────────────────
//  • données déclaratives : lieux, objets, combats, puzzles, i18n FR+EN, PNJ ;
//  • capture de fin de quête : taux × 2 plafonné, JAMAIS garantie (1 000 tirages
//    seedés avec une Poké Ball à 10 % → 170–230 captures) ;
//  • échec → la quête reste réclamable (nouvelle rencontre) ;
//  • Kanto/Johto : les quêtes principales existantes sont enveloppées (mêmes ids).

const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

globalThis.window = globalThis;
globalThis.STORY_QUESTS = globalThis.STORY_QUESTS || [];
const LQ = await import('../src/data/legendary-quests.js');
const { LEGENDARY_QUESTS, LEGENDARY_SIDE_QUESTS, LEGENDARY_KEY_ITEMS, LEGENDARY_STEP_TYPES, legendaryRequirementsMet } = LQ;

const SANDBOX_FILES = [
  'src/data/game-config.js', 'src/data/moves.js', 'src/data/pd-data.js', 'src/data/forms-data.js', 'src/domain/pokemon/species-key.js',
  'src/data/items-data.js', 'src/data/items-helpers.js', 'src/data/poke-talents.js',
  'src/data/locations-data.js', 'src/data/locations-johto.js', 'src/data/locations-hoenn.js', 'src/data/game-helpers.js',
  'src/application/world/team.js', 'src/application/pokemon-factory.js',
  'src/data/champions-data.js', 'src/data/official-teams-data.js', 'src/data/official-teams-hoenn.js',
  'src/data/story-quests.js', 'src/data/story-quests-hoenn.js', 'src/data/side-quests-data.js', 'src/data/legendary-quests.js',
  'src/data/npc-data.js', 'src/data/repeatable-quests-data.js', 'src/data/trainer-sprites-data.js',
  'src/application/world/puzzle-explorations.js',
  'src/application/quests/quest-core.js', 'src/application/combat/battle-encounter.js', 'src/application/combat/catch.js',
  'src/data/atoll-sets-data.js', 'src/application/world/atoll-core.js',
];

// mulberry32 — PRNG déterministe (la fenêtre 170–230 ≈ 2,4 σ serait flaky avec Math.random).
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function makeSandbox({ seed = 7, ballRate = 10 } = {}) {
  const rng = seeded(seed);
  const logs = [], notifications = [];
  const battle = { active: false };
  const sandbox = {
    console, window: {}, setTimeout: (fn) => { try { fn(); } catch (_) {} },
    G: {
      team: [], teamSlotItems: [], collection: {}, hatchery: [], training: [], inventory: {}, unlockedTalents: {}, pokeballs: { pokeball: 100000 },
      lang: 'fr', region: 'hoenn', location: 'littleroot', badges: [], activeQuests: [], repeatables: [], questTrainerWins: {},
      mainStep: { kanto: 0, johto: 0, hoenn: 0 }, mainProgress: { kanto: 0, johto: 0, hoenn: 0 }, wildWinsByLoc: {}, visitedMaps: {},
      completedQuests: {}, money: 0, pokedex: {}, regionLeagueWon: {}, puzzles: {}, _questIdMigrationV7: 7,
    },
    PokeWorldCore: { randomInt: (a) => a, chancePercent: (p) => rng() * 100 < p, clamp: (v, a, b) => Math.max(a, Math.min(b, v)) },
    rand: (a, b) => a + Math.floor(rng() * (b - a + 1)), chance: (p) => rng() * 100 < p,
    rollShiny: () => false, isSpeciesShiny: () => false, unlockShinyForSpecies: () => {},
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    t: (k) => k, tr: (k, p) => `${k}:${JSON.stringify(p || {})}`, getPokeName: (id) => 'P' + id, getLocName: (id) => id,
    getItemName: (k) => k, getTalentByKey: () => null, getTalentName: (k) => k, unlockTalentForSpecies: () => {},
    getUnlockedRegionsForPokedex: () => sandbox.__unlockedRegions || ['kanto', 'johto', 'hoenn'], closeFullscreenPanel: () => {},
    notify: (m) => notifications.push(String(m)), saveGame: () => {}, autoSave: () => {}, setMsg: (m) => notifications.push(String(m)),
    updateHeader: () => {}, addToInventory: (k, n) => { sandbox.G.inventory[k] = (sandbox.G.inventory[k] || 0) + (n || 1); },
    grantRewardItems: (items) => { for (const k in items) sandbox.addToInventory(k, items[k]); },
    gainQuestPoints: () => {}, pqForMoney: (m) => m,
    addBattleLog: (m) => logs.push(String(m)), renderBattleTeamRow: () => {}, recalcPokeStats: () => {},
    ballForEnemy: () => 'pokeball', ballDef: () => ({ rate: ballRate, labelKey: 'ball_pokeball' }), ballEffectiveRate: () => ballRate,
    regionOfLoc: (id) => (sandbox.LOCS_HOENN && sandbox.LOCS_HOENN[id]) ? 'hoenn' : ((sandbox.LOCS_JOHTO && sandbox.LOCS_JOHTO[id]) ? 'johto' : 'kanto'),
    battle,
    startBattle: (enemy) => { battle.active = true; battle.enemy = enemy; battle.legendaryQuest = false; battle.questGift = false; },
    endBattle: () => { battle.active = false; battle.enemy = null; battle.questRewardQuestId = null; battle.legendaryQuest = false; battle.questGift = false; },
    EventBus: { on: () => {}, emit: () => {} }, EVENTS: { WILD_DEFEATED: 'a', POKEMON_CAUGHT: 'b', MINE_SELL: 'c', BADGE_EARNED: 'd', LEAGUE_WON: 'e' },
    POKE_NAMES_EN: {}, POKE_NAMES_FR: {},
    document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] },
    __logs: logs, __notifications: notifications,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of SANDBOX_FILES) vm.runInContext(harnessBundleSource([f]), sandbox, { filename: f });
  sandbox.G.team.push(sandbox.createPoke(25, 60, false));
  sandbox.ensureQuestState();
  return sandbox;
}

const HOENN_CHAINS = LEGENDARY_QUESTS.filter((q) => Array.isArray(q.steps));

// ── LEG-01 · données ─────────────────────────────────────────────────────────

test('LEG-01 — 21 definitions: 11 Kanto/Johto wrappers (same main quest ids) + 10 Hoenn chains', () => {
  assert.equal(LEGENDARY_QUESTS.length, 21);
  const wrappers = LEGENDARY_QUESTS.filter((q) => q.mainQuestId != null);
  assert.equal(wrappers.length, 11);
  assert.equal(HOENN_CHAINS.length, 10);
  assert.deepEqual(HOENN_CHAINS.map((q) => q.poke), [377, 378, 379, 380, 381, 382, 383, 384, 385, 386]);
  for (const q of LEGENDARY_QUESTS) assert.equal(q.rewardPoke, q.poke, `${q.id}: rewardPoke mirrors poke (audit / dex sources)`);
  const ids = new Set(LEGENDARY_QUESTS.map((q) => q.id));
  assert.equal(ids.size, LEGENDARY_QUESTS.length, 'unique ids');
});

test('LEG-01 — Kanto/Johto wrappers point at existing rewardPoke main quests (no content change, no migration)', () => {
  const sb = makeSandbox();
  for (const q of LEGENDARY_QUESTS.filter((x) => x.mainQuestId != null)) {
    const def = sb.STORY_QUESTS.find((d) => d.id === q.mainQuestId);
    assert.ok(def, `${q.id}: main quest #${q.mainQuestId} exists`);
    assert.equal(def.rewardPoke, q.poke, `${q.id}: main quest #${q.mainQuestId} rewards #${q.poke}`);
    assert.equal(def.region, q.region);
    assert.ok(sb.getLocObj(q.encounter.loc), `${q.id}: encounter loc ${q.encounter.loc} exists`);
  }
  // Every legendary rewardPoke of Kanto/Johto is wrapped (144–146, 150, 151, 243–245, 249–251).
  const legendaryIds = [144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251];
  for (const id of legendaryIds) assert.ok(LEGENDARY_QUESTS.some((q) => q.poke === id), `#${id} wrapped`);
});

test('LEG-01/02 — every chain step references existing locations, items, battles, puzzles and step types', () => {
  const sb = makeSandbox();
  const puzzleIds = new Set(sb.PUZZLE_EXPLORATIONS.map((p) => p.id));
  for (const q of HOENN_CHAINS) {
    assert.ok(sb.LOCS_HOENN[q.encounter.loc], `${q.id}: encounter loc ${q.encounter.loc}`);
    assert.ok(q.encounter.level >= 40 && q.encounter.level <= 70, `${q.id}: encounter level 40–70`);
    if (q.keyItem) assert.ok(sb.ITEMS[q.keyItem] && sb.ITEMS[q.keyItem].notForSale, `${q.id}: key item ${q.keyItem} exists & notForSale`);
    for (const st of q.steps) {
      assert.ok(LEGENDARY_STEP_TYPES.includes(st.type), `${q.id}: step type ${st.type}`);
      if (st.loc) assert.ok(sb.LOCS_HOENN[st.loc], `${q.id}: step loc ${st.loc}`);
      if (st.type === 'trainer_battle') assert.ok(sb.OFFICIAL_TEAMS_HOENN[st.battleId], `${q.id}: battle ${st.battleId} (HOE-01)`);
      if (st.type === 'puzzle') assert.ok(puzzleIds.has(st.targetPuzzleId), `${q.id}: puzzle ${st.targetPuzzleId}`);
      if (st.type === 'item') assert.ok(sb.ITEMS[st.requiredItem], `${q.id}: required item ${st.requiredItem}`);
      for (const k of Object.keys(st.rewardItems || {})) assert.ok(sb.ITEMS[k], `${q.id}: reward item ${k}`);
    }
    // A key item is always granted by an earlier step before being required.
    if (q.keyItem) {
      const grant = q.steps.findIndex((st) => st.rewardItems && st.rewardItems[q.keyItem]);
      const need = q.steps.findIndex((st) => st.requiredItem === q.keyItem);
      assert.ok(grant >= 0, `${q.id}: ${q.keyItem} is granted`);
      assert.ok(need < 0 || need > grant, `${q.id}: ${q.keyItem} granted before required`);
    }
  }
  for (const k of LEGENDARY_KEY_ITEMS) assert.ok(sb.ITEMS[k], `key item ${k} exists`);
});

test('LEG-02 — generated side quests: 28 steps, chain links, first step gated, last step legendary', () => {
  const steps = Object.values(LEGENDARY_SIDE_QUESTS);
  assert.equal(steps.length, 28);
  for (const q of HOENN_CHAINS) {
    q.steps.forEach((_, i) => {
      const def = LEGENDARY_SIDE_QUESTS[`${q.id}_${i + 1}`];
      assert.ok(def, `${q.id}_${i + 1} generated`);
      assert.equal(def.legendaryId, q.id);
      assert.equal(def.stepIndex, i + 1);
      assert.equal(def.stepCount, q.steps.length);
      assert.equal(def.prevStep, i > 0 ? `${q.id}_${i}` : null);
      assert.equal(def.nextStep, i < q.steps.length - 1 ? `${q.id}_${i + 2}` : null);
      if (i === q.steps.length - 1) {
        assert.equal(def.legendary, true);
        assert.equal(def.rewardPoke, q.poke);
        assert.equal(def.rewardLevel, q.encounter.level);
        assert.equal(def.encounterLoc, q.encounter.loc);
      } else {
        assert.equal(def.rewardPoke, undefined, 'intermediate steps never grant the legendary');
      }
    });
    const first = LEGENDARY_SIDE_QUESTS[`${q.id}_1`];
    if (q.requires) assert.equal(typeof first.reqCondition, 'function', `${q.id}: first step gated by reqCondition`);
  }
  // Merged into SIDE_QUESTS of the game (sandbox load order: side-quests-data → legendary-quests).
  const sb = makeSandbox();
  for (const id of Object.keys(LEGENDARY_SIDE_QUESTS)) assert.ok(sb.SIDE_QUESTS[id], `${id} merged into SIDE_QUESTS`);
});

test('LEG-02 — FR + EN quest texts for all 28 steps, NPC hooks present with index-matched FR/EN dialogs', async () => {
  const fr = (await import('../src/localization/fr/quests.js')).L_fr_quests;
  const en = (await import('../src/localization/en/quests.js')).L_en_quests;
  for (const id of Object.keys(LEGENDARY_SIDE_QUESTS)) {
    for (const [lang, L] of [['fr', fr], ['en', en]]) {
      const n = L.side[id];
      assert.ok(n && n.title && n.desc && n.rewardDesc, `${lang} text for ${id}`);
    }
  }
  const sb = makeSandbox();
  const frN = (await import('../src/localization/fr/npc.js'));
  const enN = (await import('../src/localization/en/npc.js'));
  const F = frN.L_fr_npc || Object.values(frN)[0];
  const E = enN.L_en_npc || Object.values(enN)[0];
  for (const q of HOENN_CHAINS) {
    const arr = sb.NPCS[q.npc.loc] || [];
    const idx = arr.findIndex((n) => n.quest === `${q.id}_1`);
    assert.ok(idx >= 0, `${q.id}: an NPC at ${q.npc.loc} offers step 1`);
    assert.equal(F[q.npc.loc].length, arr.length, `${q.npc.loc}: FR dialogs index-matched`);
    assert.equal(E[q.npc.loc].length, arr.length, `${q.npc.loc}: EN dialogs index-matched`);
    assert.ok(F[q.npc.loc][idx].name && E[q.npc.loc][idx].name);
  }
  // Birth Island (Deoxys) exists in both languages and is reachable from Fallarbor.
  const locFr = (await import('../src/localization/fr/locations.js'));
  const locEn = (await import('../src/localization/en/locations.js'));
  assert.ok(Object.values(locFr)[0].birth_island && Object.values(locEn)[0].birth_island);
  assert.ok(sb.LOCS_HOENN.birth_island && sb.LOCS_HOENN.fallarbor.conn.includes('birth_island') && sb.LOCS_HOENN.birth_island.conn.includes('fallarbor'));
  assert.ok(sb.LOCS_HOENN.birth_island.wild.length >= 3);
});

test('LEG-02 — Regi puzzles no longer fire a one-shot encounter; the chains take over', () => {
  const src = R('src/application/world/puzzle-explorations.js');
  for (const id of ['regirock_name', 'regice_name', 'registeel_name']) {
    const i = src.indexOf(`id: '${id}'`);
    const block = src.slice(i, src.indexOf('\n  }', i));
    assert.ok(!/legendaryEncounter:/.test(block), `${id}: no legendaryEncounter`);
    assert.ok(/legendaryQuestId: 'leg_/.test(block), `${id}: linked to its chain`);
  }
  assert.ok(/id: 'aurora_triangle'/.test(src), 'Deoxys triangle puzzle exists');
});

// ── LEG-01 · prérequis ───────────────────────────────────────────────────────

test('LEG-01 — requirements: captures, league and chain order gate the first step (NPC offer + acceptance)', () => {
  const sb = makeSandbox();
  const regice1 = sb.SIDE_QUESTS.leg_regice_1;
  assert.equal(sb.isSideQuestAvailable(regice1), false, 'Regice locked until Regirock is caught');
  sb.G.pokedex[377] = { seen: true, caught: true };
  assert.equal(sb.isSideQuestAvailable(regice1), true);
  const latios1 = sb.SIDE_QUESTS.leg_latios_1;
  sb.G.pokedex[380] = { seen: true, caught: true };
  assert.equal(sb.isSideQuestAvailable(latios1), false, 'Latios also needs the Hoenn league');
  sb.G.regionLeagueWon.hoenn = true;
  assert.equal(sb.isSideQuestAvailable(latios1), true);
  // Chain order: step 2 unavailable while step 1 is not completed.
  assert.equal(sb.isSideQuestAvailable(sb.SIDE_QUESTS.leg_kyogre_2), false);
  sb.G.completedQuests.side_leg_kyogre_1 = true;
  assert.equal(sb.isSideQuestAvailable(sb.SIDE_QUESTS.leg_kyogre_2), true);
  // Pure helper (ESM) agrees.
  assert.equal(legendaryRequirementsMet(HOENN_CHAINS.find((q) => q.id === 'leg_rayquaza'), { pokedex: { 382: { caught: true } } }), false);
  assert.equal(legendaryRequirementsMet(HOENN_CHAINS.find((q) => q.id === 'leg_rayquaza'), { pokedex: { 382: { caught: true }, 383: { caught: true } } }), true);
});

test('LEG-01 — world-state step types: region_wins / dex_region / own_species are live values', () => {
  const sb = makeSandbox();
  const inst = { progress: 0 };
  const wins = sb.SIDE_QUESTS.leg_jirachi_1; // region_wins hoenn 1000
  sb.G.wildWinsByLoc = { route101: 600, route110: 500, route1: 5000 };
  assert.equal(sb.questProgressValue(inst, wins), 1100, 'only Hoenn locations count');
  assert.equal(sb.questDone(inst, wins), true);
  const dex = sb.SIDE_QUESTS.leg_jirachi_2; // dex_region hoenn 50
  for (let id = 252; id < 252 + 49; id++) sb.G.pokedex[id] = { seen: true, caught: true };
  assert.equal(sb.questDone(inst, dex), false);
  sb.G.pokedex[351] = { seen: true, forms: { 1: { seen: true, caught: true } } }; // a form counts (D-FORM)
  assert.equal(sb.questProgressValue(inst, dex), 50);
  assert.equal(sb.questDone(inst, dex), true);
  const own = { id: 'x', type: 'own_species', targetSpecies: 369, target: 1 };
  assert.equal(sb.questDone(inst, own), false);
  sb.G.collection.k1 = { id: 369 };
  assert.equal(sb.questDone(inst, own), true);
});

test('LEG-01 — talk side quests progress when the NPC of the target location is opened (fixes s132–s137)', () => {
  const sb = makeSandbox();
  sb.G.activeQuests.push({ qid: 's132', cat: 'side', progress: 0, done: false });
  assert.equal(sb.questDone(sb.G.activeQuests[0], sb.SIDE_QUESTS.s132), false);
  assert.equal(sb.talkNpcSideQuests('lilycove'), false, 'wrong town');
  assert.equal(sb.talkNpcSideQuests('slateport'), true);
  assert.equal(sb.questDone(sb.G.activeQuests[0], sb.SIDE_QUESTS.s132), true);
});

// ── LEG-01 · rencontre de fin de quête (D13) ─────────────────────────────────

function armFinalStep(sb, legId) {
  const q = HOENN_CHAINS.find((x) => x.id === legId);
  const finalId = `${legId}_${q.steps.length}`;
  for (let i = 1; i < q.steps.length; i++) sb.G.completedQuests[`side_${legId}_${i}`] = true;
  const def = sb.SIDE_QUESTS[finalId];
  if (def.requiredItem) sb.G.inventory[def.requiredItem] = 1;
  const inst = { qid: finalId, cat: 'side', progress: def.target || 1, done: false };
  if (def.type === 'defeat_wild') inst.progress = def.target;
  sb.G.activeQuests.push(inst);
  return { q, finalId, def, inst };
}

test('LEG-01 — claiming the final step requires being at the encounter location, then starts a legendaryQuest battle', () => {
  const sb = makeSandbox();
  const { finalId, def } = armFinalStep(sb, 'leg_kyogre'); // item step at cave_of_origin
  assert.equal(sb.questDone(sb.G.activeQuests[0], def), true, 'blue orb in bag → done');
  sb.G.location = 'route128';
  sb.claimQuest(finalId, 'side');
  assert.equal(sb.battle.active, false, 'not at the Cave of Origin → no battle');
  assert.ok(sb.__notifications.some((n) => n.startsWith('leg_go_to_location')));
  assert.ok(sb.G.activeQuests.some((i) => i.qid === finalId), 'quest still active');
  sb.G.location = 'cave_of_origin';
  sb.claimQuest(finalId, 'side');
  assert.equal(sb.battle.active, true);
  assert.equal(sb.battle.enemy.id, 382);
  assert.equal(sb.battle.enemy.level, 70);
  assert.equal(sb.battle.legendaryQuest, true, 'D13 flag (×2 rate)');
  assert.equal(sb.battle.questGift, false);
  assert.equal(sb.battle.legendaryCatch, undefined, 'legendaryCatch (forced success) is gone');
  assert.equal(sb.battle.questRewardQuestId, finalId);
  assert.equal(sb.battle.questRewardCat, 'side');
  assert.equal(sb.G.completedQuests['side_' + finalId], undefined, 'not consumed until the capture succeeds');
  assert.equal(sb.G.inventory.blue_orb, 1, 'key item kept');
});

test('LEG-01 — 1 000 quest-end encounters with a Poké Ball (10 %) → 170–230 captures (×2, never guaranteed)', () => {
  const sb = makeSandbox({ seed: 20261014, ballRate: 10 });
  sb.battle.active = true;
  sb.battle.legendaryQuest = true;
  let caught = 0;
  for (let i = 0; i < 1000; i++) {
    sb.G.collection = {}; sb.G.team = [sb.G.team[0]]; sb.G._firstCatchDone = true;
    const enemy = sb.createPoke(382, 70, false);
    if (sb.attemptAutoCatch(enemy) === true) caught++;
  }
  assert.ok(caught >= 170 && caught <= 230, `expected 170–230 captures at a doubled 10 % rate, got ${caught}`);
  assert.equal(sb.G.pokeballs.pokeball, 100000 - 1000, 'one Ball consumed per attempt, success or failure');
});

test('LEG-01 — the ×2 multiplier is capped at 100 % and does not apply to ordinary wild battles', () => {
  const sbCap = makeSandbox({ seed: 3, ballRate: 60 });
  sbCap.battle.active = true; sbCap.battle.legendaryQuest = true; sbCap.G._firstCatchDone = true;
  let ok = 0;
  for (let i = 0; i < 200; i++) { sbCap.G.collection = {}; sbCap.G.team = [sbCap.G.team[0]]; if (sbCap.attemptAutoCatch(sbCap.createPoke(377, 40, false)) === true) ok++; }
  assert.equal(ok, 200, '60 % × 2 → capped at 100 %');
  const sbWild = makeSandbox({ seed: 20261014, ballRate: 10 });
  sbWild.battle.active = true; sbWild.battle.legendaryQuest = false; sbWild.G._firstCatchDone = true;
  let wild = 0;
  for (let i = 0; i < 1000; i++) { sbWild.G.collection = {}; sbWild.G.team = [sbWild.G.team[0]]; if (sbWild.attemptAutoCatch(sbWild.createPoke(382, 70, false)) === true) wild++; }
  assert.ok(wild >= 70 && wild <= 130, `ordinary 10 % rate stays ~100/1000, got ${wild}`);
});

test('LEG-01 — failed capture: the quest stays claimable; success completes the step and grants rewards', () => {
  const sb = makeSandbox();
  const { finalId, def } = armFinalStep(sb, 'leg_kyogre');
  sb.G.location = 'cave_of_origin';
  sb.claimQuest(finalId, 'side');
  assert.equal(sb.battle.active, true);
  // Battle lost / capture failed → battle-status does NOT call completeQuestRewardBattle.
  sb.endBattle();
  assert.ok(sb.G.activeQuests.some((i) => i.qid === finalId), 'still active');
  assert.equal(sb.questDone(sb.G.activeQuests.find((i) => i.qid === finalId), def), true, 'still claimable');
  sb.claimQuest(finalId, 'side');
  assert.equal(sb.battle.active, true, 'a second encounter starts immediately');
  assert.equal(sb.battle.enemy.id, 382);
  // Capture succeeded → completeQuestRewardBattle(qid, 'side') consumes the step.
  assert.equal(sb.completeQuestRewardBattle(finalId, 'side'), true);
  assert.equal(sb.G.completedQuests['side_' + finalId], true);
  assert.equal(sb.G.activeQuests.some((i) => i.qid === finalId), false);
  // Chain status helper (UI / audit).
  assert.equal(sb.legendaryQuestStatus(HOENN_CHAINS.find((x) => x.id === 'leg_kyogre')), 'done');
});

test('LEG-01 — intermediate step claim marks it done once and auto-accepts the next step (talk step validated on the spot)', () => {
  const sb = makeSandbox();
  sb.G.location = 'mt_pyre';
  sb.G.activeQuests.push({ qid: 'leg_kyogre_1', cat: 'side', progress: 1, done: false });
  sb.claimQuest('leg_kyogre_1', 'side');
  assert.equal(sb.G.completedQuests.side_leg_kyogre_1, true);
  assert.equal(sb.G.inventory.blue_orb, 1, 'Blue Orb granted by the talk step');
  assert.ok(sb.G.activeQuests.some((i) => i.qid === 'leg_kyogre_2' && i.cat === 'side'), 'next step auto-accepted');
  assert.ok(sb.__notifications.some((n) => n.startsWith('leg_next_step')));
  // Puzzle chain steps are one-shot (no replay), unlike plain puzzle side quests.
  assert.equal(sb.isSideQuestAvailable(sb.SIDE_QUESTS.leg_kyogre_3), false, 'step 3 waits for step 2');
  assert.equal(sb.currentChainStepId('leg_kyogre_1'), 'leg_kyogre_2');
});

test('LEG-01 — Kanto/Johto main legendary quests: encounter gated on location, flagged legendaryQuest; gift Pokémon stay guaranteed (questGift)', () => {
  const sb = makeSandbox();
  sb.G.region = 'kanto'; sb.G.location = 'pallet';
  const idx = sb.getRegionChain('kanto').findIndex((q) => q.id === 58); // Articuno (Seafoam)
  sb.G.mainStep.kanto = idx; sb.G.mainProgress.kanto = 0; sb.G.activeQuests = []; sb.syncActiveMain();
  const inst = sb.G.activeQuests.find((i) => i.cat === 'main');
  assert.equal(Number(inst.qid), 58);
  inst.progress = 150; sb.G.wildWinsByLoc.seafoamislands = 150;
  sb.claimQuest(58, 'main');
  assert.equal(sb.battle.active, false, 'must be at Seafoam Islands');
  sb.G.location = 'seafoamislands';
  sb.claimQuest(58, 'main');
  assert.equal(sb.battle.active, true);
  assert.equal(sb.battle.enemy.id, 144);
  assert.equal(sb.battle.legendaryQuest, true);
  assert.equal(sb.battle.questGift, false);
  sb.endBattle();
  // Gift Pokémon (Snorlax #31) — not legendary: no location gate, guaranteed catch flag.
  sb.G.inventory.pokeflute = 1; sb.G.location = 'pallet';
  const i31 = sb.getRegionChain('kanto').findIndex((q) => q.id === 31);
  sb.G.mainStep.kanto = i31; sb.G.activeQuests = []; sb.syncActiveMain();
  sb.claimQuest(31, 'main');
  assert.equal(sb.battle.active, true);
  assert.equal(sb.battle.enemy.id, 143);
  assert.equal(sb.battle.legendaryQuest, false);
  assert.equal(sb.battle.questGift, true);
  // questGift → 100 % even with a 10 % Ball.
  sb.G._firstCatchDone = true;
  assert.equal(sb.attemptAutoCatch(sb.battle.enemy), true);
});

test('LEG-01 — battle-status completes a reward battle only when the capture succeeded (source contract)', () => {
  const src = R('src/application/combat/battle-status.js');
  assert.ok(/caughtNow = \(?attemptAutoCatch\(e\) === true\)?/.test(src)); // V7 · DBT-01
  assert.ok(wsMatch(src, /if\(caughtNow\) completeQuestRewardBattle\(completedQuestId, completedCat\);/)); // V7 · DBT-01
  assert.ok(/legendary_quest_escaped/.test(src));
  assert.ok(!/battle\.legendaryCatch/.test(R('src/application/combat/catch.js')), 'forced success removed from catch.js');
  assert.ok(!/battle\.legendaryCatch/.test(R('src/application/combat/battle-encounter.js')));
  assert.ok(!/battle\.legendaryCatch/.test(R('src/application/combat/battle-flow.js')));
});

// ── ATL-03 · Fragments de Légende (D8) ───────────────────────────────────────

test('ATL-03 — 50 Fragments summon a legendary of an unlocked region; encounter retryable for free until caught', () => {
  const sb = makeSandbox();
  // game-helpers' own getUnlockedRegionsForPokedex is loaded in the sandbox: override it (free identifier, resolved at call time).
  sb.getUnlockedRegionsForPokedex = () => sb.__unlockedRegions || ['kanto', 'johto', 'hoenn'];
  const st = sb.ensureAtollState();
  assert.equal(st.fragments, 0);
  assert.equal(sb.LEGEND_FRAGMENT_COST, 50);
  assert.equal(sb.ATOLL_FRAGMENTS_PER_BOSS, 3);
  for (let i = 0; i < 17; i++) sb.gainLegendFragments(sb.ATOLL_FRAGMENTS_PER_BOSS, 'atoll_boss');
  assert.equal(st.fragments, 51);
  assert.equal(sb.canSummonFragmentLegendary(), true);
  // Region lock: Hoenn legendaries are not offered while Hoenn is locked.
  sb.__unlockedRegions = ['kanto'];
  assert.deepEqual(JSON.parse(JSON.stringify(sb.getFragmentLegendaryChoices())), [144, 145, 146, 150, 151]);
  assert.equal(sb.summonFragmentLegendary(382), false, 'Kyogre not available yet');
  assert.equal(st.fragments, 51, 'nothing spent');
  sb.__unlockedRegions = ['kanto', 'johto', 'hoenn'];
  assert.equal(sb.getFragmentLegendaryChoices().length, 21);
  assert.equal(sb.summonFragmentLegendary(382), true);
  assert.equal(st.fragments, 1, '50 spent at summon time');
  assert.equal(st.pendingFragmentLegendary, 382);
  assert.equal(sb.battle.active, true);
  assert.equal(sb.battle.enemy.id, 382);
  assert.equal(sb.battle.enemy.level, sb.FRAGMENT_LEGENDARY_LEVEL);
  assert.equal(sb.battle.legendaryQuest, true, 'D13 ×2 rate, never guaranteed');
  assert.equal(sb.battle.questRewardQuestId, 'fragment:382');
  assert.equal(sb.battle.questRewardCat, 'fragment');
  // Failure → free retry (no further Fragment spent), no second summon possible meanwhile.
  sb.endBattle();
  assert.equal(sb.canSummonFragmentLegendary(), false);
  assert.equal(sb.startFragmentLegendaryEncounter(), true);
  assert.equal(st.fragments, 1);
  assert.equal(sb.battle.enemy.id, 382);
  // Success → summon consumed.
  assert.equal(sb.completeQuestRewardBattle('fragment:382', 'fragment'), true);
  assert.equal(st.pendingFragmentLegendary, 0);
  assert.ok(sb.__notifications.some((n) => n.startsWith('legend_fragment_caught')));
  // Not enough fragments → refused with the missing count (no reverse conversion anywhere).
  assert.equal(sb.summonFragmentLegendary(144), false);
  assert.ok(sb.__notifications.some((n) => n.startsWith('legend_fragment_missing')));
});

test('ATL-03 — the Atoll boss (Dome final) grants fragments on victory (source contract)', () => {
  const src = R('src/ui/game/fullscreen-panel.js');
  assert.ok(wsMatch(src, /ATOLL_BOSS_MODES\.includes\(modeKey\) && typeof gainLegendFragments === 'function'\) gainLegendFragments\(ATOLL_FRAGMENTS_PER_BOSS/)); // V7 · DBT-01
  assert.ok(/atollFragmentsModel\(st\)/.test(src), 'fragments card on the Atoll home tab');
  const core = R('src/application/world/atoll-core.js');
  assert.ok(/const ATOLL_BOSS_MODES = \['dome_final'\]/.test(core));
});
