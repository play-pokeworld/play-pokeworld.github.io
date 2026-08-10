import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { harnessBundleSource, harnessIsEsm } from '../tools/harness-bundle.mjs';

// ── Phases 18, 20 & 21 — Quest-chain validators (steps 2, 4 & 5) ──
// • Main quests: Kanto 1-60 (Rocket Tower 26; phase 21 densification:
//   Bill, Fan Club, S.S. Anne Captain, Eevee/Porygon, Cycling Road, Gold Teeth
//   badge, Sylph Lapras, Dojo → Tyrogue, Mr. Psy, Ptera lab, Memories of
//   Manoir…) ; Johto 101-140 (passe 20). Ids uniques, badges canoniques.
// • Grouped side quests (Kanto s1-s30, Johto s31-s55), every
//   quest has an NPC giver, every reward item exists in ITEMS.
// • Trainer battles: battleId → OFFICIAL_TEAMS with prize > 0,
//   sprite mapping, i18n dialogues (name/intro/victory) FR+EN present.
// • Full FR+EN quest texts, rewardDesc synchronized with the defs.
// • NPCs: data and locations strictly parallel (phase 19 regression).
// • Migrations V2 (reordering), V3 (Johto → 140) and V4 (Kanto → 60 +
//   sides Johto s14-s38 → s31-s55).

const R = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

function makeSandbox() {
  const sandbox = {
    console, window: {},
    G: { team: [], teamSlotItems: [], collection: {}, hatchery: [], inventory: {}, unlockedTalents: {}, lang: 'fr', region: 'kanto', badges: [], activeQuests: [], repeatables: [], questTrainerWins: {}, mainStep: { kanto: 0, johto: 0 }, mainProgress: { kanto: 0, johto: 0 }, wildWinsByLoc: {}, visitedMaps: {}, completedQuests: {}, money: 0 },
    PokeWorldCore: { randomInt: (a) => a, chancePercent: () => false, clamp: (v, a, b) => Math.max(a, Math.min(b, v)) },
    rand: () => 0.5, chance: () => false, rollShiny: () => false,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    t: (k) => k, tr: (k) => k, getPokeName: (id) => 'P' + id,
    notify: () => {}, saveGame: () => {}, autoSave: () => {}, setMsg: () => {}, updateHeader: () => {},
    addToInventory: () => {}, grantRewardItems: () => {},
    EventBus: { on: () => {}, emit: () => {} }, EVENTS: { WILD_DEFEATED: 'a', POKEMON_CAUGHT: 'b', MINE_SELL: 'c', BADGE_EARNED: 'd', LEAGUE_WON: 'e' },
    POKE_NAMES_EN: {}, POKE_NAMES_FR: {},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of [
    'src/data/moves.js', 'src/data/pd-data.js', 'src/data/items-data.js', 'src/data/items-helpers.js',
    'src/data/poke-talents-data.js',
    'src/data/locations-data.js', 'src/data/locations-johto.js', 'src/data/game-helpers.js',
    'src/application/world/team.js', 'src/application/pokemon-factory.js',
    'src/data/champions-data.js', 'src/data/official-teams-data.js',
    'src/data/story-quests.js', 'src/data/side-quests-data.js', 'src/data/npc-data.js',
    'src/data/repeatable-quests-data.js',
    'src/data/trainer-sprites-data.js', 'src/application/quests/quest-core.js',
  ]) {
    // T2-D: file list kept VERBATIM below in harnessBundleSource — bundled IIFE,
    // vm parity, tolerates ESM converts (fr/quests.js is one since wave 36).
    vm.runInContext(harnessBundleSource([f]), sandbox, { filename: f });
  }
  return sandbox;
}

function loadLocale() {
  const sandbox = { window: {}, console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(harnessBundleSource(['src/localization/fr/quests.js', 'src/localization/en/quests.js', 'src/localization/fr/ui.js', 'src/localization/en/ui.js']), sandbox, { filename: 'locales [iife]' });
  return { fr: { quests: sandbox.window.L_fr_quests, ui: sandbox.window.L_fr_ui }, en: { quests: sandbox.window.L_en_quests, ui: sandbox.window.L_en_ui } };
}

const sb = makeSandbox();
const L = loadLocale();
const STORY = sb.STORY_QUESTS;
const kanto = STORY.filter((q) => q.region === 'kanto');
const johto = STORY.filter((q) => q.region === 'johto');
const TRAINER_QUESTS = STORY.filter((q) => q.type === 'trainer_battle');

test('main chain: unique ids, Kanto 1-60 ordered, Johto 101-140, Rocket Tower at 26', () => {
  assert.equal(STORY.length, 100, '100 main quests (60 Kanto + 40 Johto, steps 4 & 5)');
  const ids = new Set(STORY.map((q) => q.id));
  assert.equal(ids.size, 100, 'no duplicate id (getMainQuestDef does not filter by region!)');
  kanto.forEach((q, i) => assert.equal(q.id, i + 1, `Kanto #${i} → id ${i + 1}`));
  johto.forEach((q, i) => assert.equal(q.id, 101 + i, `Johto #${i} → id ${101 + i}`));
  assert.equal(kanto[25].type, 'trainer_battle', 'position 26 = combat de dresseur');
  assert.equal(kanto[25].battleId, 'kanto_rocket_tower', 'Team Rocket at the Pokémon Tower (shifted to 26 in phase 21)');
  assert.equal(kanto[25].loc, 'pokemontower', 'Rocket Tower located at Lavender Pokémon Tower');
  // Mr. Fuji's flute (id 27) always precedes route-12 Snorlax (id 27=item quest)
  const fluteSource = kanto.find((q) => q.rewardItems && q.rewardItems.pokeflute);
  const snorlax = kanto.find((q) => q.rewardPoke === 143);
  assert.ok(fluteSource && snorlax, 'Pokéflute giver + Snorlax quest present');
  assert.ok(fluteSource.id < snorlax.id, 'the Pokéflute is offered BEFORE the Snorlax quest that requires it');
  assert.equal(snorlax.requiredItem, 'pokeflute', 'Snorlax requires the Pokéflute');
});

test('main chain: badges in canonical order (FRLG / GSC)', () => {
  // Array.from: rehomes vm-created arrays onto node prototypes
  // (strict deepEqual compares Array prototypes).
  const kBadges = Array.from(kanto.filter((q) => q.type === 'badge'), (q) => q.targetBadge);
  assert.deepEqual(kBadges, ['brock', 'misty', 'surge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni', 'elite4'], 'ordre badges Kanto');
  const jBadges = Array.from(johto.filter((q) => q.type === 'badge'), (q) => q.targetBadge);
  assert.deepEqual(jBadges, ['falkner', 'bugsy', 'whitney', 'morty', 'chuck', 'jasmine', 'pryce', 'clair', 'johto_elite4'], 'ordre badges Johto');
  // Kanto Rocket arc: Mt. Moon → Tower → Hideout/Giovanni → Sylph/Giovanni
  // (+ phase 21: the Saffron Dojo, between freed Sylph and Victory Road)
  const kBattles = Array.from(kanto.filter((q) => q.type === 'trainer_battle'), (q) => q.battleId);
  assert.deepEqual(kBattles, ['kanto_rival_route22', 'kanto_rocket_mtmoon', 'kanto_super_nerd_fossil', 'kanto_rival_cerulean', 'kanto_rival_ssanne', 'kanto_rocket_tower', 'kanto_rocket_hideout', 'kanto_giovanni_hideout', 'kanto_rival_silph', 'kanto_giovanni_silph', 'kanto_dojo_master', 'kanto_rival_victory'], 'arc rival + Rocket + Dojo Kanto');
  const jBattles = Array.from(johto.filter((q) => q.type === 'trainer_battle'), (q) => q.battleId);
  // Phase 20: the movie-3 boss (Unown/Entei at the Alpha Ruins) slots
  // between the Oak Woods rival and the Burned Tower one.
  assert.deepEqual(jBattles, ['johto_rival_cherrygrove', 'johto_sprout_elder', 'johto_rocket_slowpoke', 'johto_rival_ilex', 'johto_film3_entei', 'johto_rival_burned', 'johto_rocket_lake', 'johto_rocket_radio', 'johto_rival_victory'], 'arc rival + Rocket + film 3 Johto');
});

test('rewards: existing items, valid reward Pokémon, capped economy (user rule)', () => {
  let moneyK = 0, moneyJ = 0, moneyTrainers = 0;
  for (const q of STORY) {
    if (q.rewardMoney) { if (q.region === 'kanto') moneyK += q.rewardMoney; else moneyJ += q.rewardMoney; }
    for (const k of Object.keys(q.rewardItems || {})) assert.ok(sb.ITEMS[k], `quest ${q.id}: item ${k} exists in ITEMS`);
    if (q.requiredItem) assert.ok(sb.ITEMS[q.requiredItem], `quest ${q.id}: required item ${q.requiredItem} exists`);
    if (q.rewardPoke) assert.ok(sb.PD[q.rewardPoke], `quest ${q.id}: Pokémon ${q.rewardPoke} exists`);
    if (q.type === 'trainer_battle') {
      assert.ok(sb.OFFICIAL_TEAMS[q.battleId], `quest ${q.id}: team ${q.battleId} defined`);
      const tm = sb.OFFICIAL_TEAMS[q.battleId];
      assert.ok(tm.rewardMoney > 0, `${q.battleId}: victory prize > 0`);
      moneyTrainers += tm.rewardMoney;
      // The quest itself does not double the prize (the claim grants nothing).
      assert.ok(!q.rewardMoney, `quest ${q.id}: no double money reward`);
    }
  }
  // Documented caps (pass 18 rebalance; bounds revised passes 20 & 21
  // : Johto 40 quests instead of 26, Kanto 60 instead of 44, +33,800₽ net):
  // no excessive enrichment.
  assert.ok(moneyK >= 255000 && moneyK <= 290000, `Kanto quests ${moneyK}₽ ∈ [255k, 290k] (was 358k before phase 18)`);
  assert.ok(moneyJ >= 230000 && moneyJ <= 275000, `Johto quests ${moneyJ}₽ ∈ [230k, 275k] (was 302k before phase 18)`);
  assert.ok(moneyTrainers >= 80000 && moneyTrainers <= 120000, `trainer prizes ${moneyTrainers}₽ ∈ [80k, 120k]`);
  // The Prine Berry (absent from ITEMS before phase 18) is now real.
  assert.ok(sb.ITEMS.prine_berry && sb.ITEMS.prine_berry.buff, 'prine_berry defined (legacy buff def)');
});

test('side quests: s1-s55, Kanto then Johto, mandatory NPC giver, valid mainTalk', () => {
  const SQ = sb.SIDE_QUESTS;
  const keys = Object.keys(SQ);
  // 137 = 30 Kanto + 25 Johto + 30 Hoenn (s1-s85) + 28 riddles (s86-s113)
  //     + 24 densification Hoenn (s114-s137) — cf. RESTE_A_FAIRE.md.
  assert.equal(keys.length, 137, '137 side quests (s1-s137)');
  for (let i = 1; i <= 30; i++) assert.ok(SQ['s' + i] && SQ['s' + i].region === 'kanto', `s${i} Kanto`);
  for (let i = 31; i <= 55; i++) assert.ok(SQ['s' + i] && SQ['s' + i].region === 'johto', `s${i} Johto`);
  const npcQuests = [];
  for (const [loc, list] of Object.entries(sb.NPCS)) for (const npc of list) if (npc.quest) npcQuests.push(npc.quest);
  for (const sid of keys) assert.ok(npcQuests.includes(sid), `quest ${sid} has an NPC giver`);
  for (const nq of npcQuests) assert.ok(SQ[nq], `NPC gives the existing quest ${nq}`);
  // Talk quests: Prof. NPCs point to existing talk quests.
  // (Hoenn chain loaded separately: story-quests-hoenn.js extends STORY_QUESTS at boot)
  const hoennSb = { window: {}, console };
  hoennSb.window = hoennSb; hoennSb.STORY_QUESTS = [];
  vm.createContext(hoennSb);
  // Vague 40 — hybride individuelle : story-quests-hoenn est désormais ESM
  // (bundle isolé ; STORY_QUESTS pré-posé ci-dessus est relu via le global,
  // STORY_QUESTS_HOENN arrive par le shim gardé + la surface window inchangée).
  {
    const f = 'src/data/story-quests-hoenn.js';
    const src = R(f);
    vm.runInContext(harnessIsEsm(src) ? harnessBundleSource([f]) : src, hoennSb, { filename: f });
  }
  const STORY_ALL = STORY.concat(hoennSb.window.STORY_QUESTS_HOENN || []);
  const talkIds = STORY_ALL.filter((q) => q.type === 'talk').map((q) => q.id);
  for (const [, list] of Object.entries(sb.NPCS)) for (const npc of list) {
    if (npc.mainTalk != null) assert.ok(talkIds.includes(npc.mainTalk), `mainTalk ${npc.mainTalk} → existing talk quest`);
  }
});

test('trainer battles: mapped sprites and FR+EN i18n dialogues (name, intro, victory)', () => {
  for (const q of TRAINER_QUESTS) {
    assert.ok(sb.TRAINER_BATTLE_SPRITES[q.battleId], `${q.battleId}: mapped trainer sprite`);
    for (const lang of ['fr', 'en']) {
      const ui = L[lang].ui;
      assert.ok(ui['trainer_battle_name_' + q.battleId], `${lang} ${q.battleId} : nom`);
      assert.ok(ui['trainer_battle_intro_' + q.battleId], `${lang} ${q.battleId}: scripted intro`);
      assert.ok(ui['trainer_battle_win_' + q.battleId], `${lang} ${q.battleId}: defeat line`);
    }
  }
});

test('quest texts: complete FR+EN, rewardDesc synced with the definitions', () => {
  // Keep only the digits of the label ("Victory: 1,000₽" → "1000")
  const strip = (s) => String(s).replace(/[^0-9]/g, '');
  for (const q of STORY) {
    for (const lang of ['fr', 'en']) {
      const node = L[lang].quests.main[String(q.id)];
      assert.ok(node && node.title && node.desc && node.rewardDesc, `${lang} quest ${q.id}: title+desc+reward`);
      const expectedMoney = q.rewardMoney || (q.battleId ? (sb.OFFICIAL_TEAMS[q.battleId] || {}).rewardMoney : 0);
      if (expectedMoney) assert.ok(strip(node.rewardDesc).startsWith(String(expectedMoney)), `${lang} quest ${q.id}: amount ${expectedMoney} in "${node.rewardDesc}"`);
      if (q.rewardPoke) assert.ok(/\(Nv\.|\(Lv\./.test(node.rewardDesc), `${lang} quest ${q.id}: legendary mentioned (${node.rewardDesc})`);
    }
  }
  for (const [sid, def] of Object.entries(sb.SIDE_QUESTS)) {
    for (const lang of ['fr', 'en']) {
      const node = L[lang].quests.side[sid];
      assert.ok(node && node.title && node.desc && node.rewardDesc, `${lang} quest ${sid}: complete text`);
      if (def.rewardMoney) assert.ok(strip(node.rewardDesc).startsWith(String(def.rewardMoney)), `${lang} quest ${sid}: amount ${def.rewardMoney} in "${node.rewardDesc}"`);
    }
  }
});

test('rival: team generated from the player\'s starter (OFFICIAL_TEAMS variants)', () => {
  sb.G.starterSpecies = { kanto: 4, johto: 152 };
  const silph = sb.createTrainerBattleTeam('kanto_rival_silph');
  assert.equal(silph.length, 5, 'Blue Silph: 5 Pokémon');
  const ace = silph[silph.length - 1];
  assert.ok([7, 8, 9].includes(ace.id), 'vs Charmander → the Squirtle line on Blue');
  assert.equal(ace.heldItem, 'mystic_water', 'type_boost held item (effect active via getHeldBuff)');
  const cherry = sb.createTrainerBattleTeam('johto_rival_cherrygrove');
  assert.equal(cherry.length, 1, 'first Silver duel: starter only');
  assert.equal(cherry[0].id, 155, 'vs Chikorita → Silver has Cyndaquil (stolen)');
  // Robustness: unknown starter → first-variant fallback, never empty.
  delete sb.G.starterSpecies;
  assert.ok(sb.createTrainerBattleTeam('kanto_rival_victory').length === 6, 'starterless fallback → complete team');
});

test('V2 save migration: mainStep shifted, completedQuests/baselines remapped, sides grouped', () => {
  const g = {
    mainStep: { kanto: 25, johto: 20 }, // 25 = former index (Erika badge, id 8)
    completedQuests: { '1001': true, '8': true, '60': true, side_s11: true, side_s30: true },
    questBaselines: { kanto: { '7': 12, '46': 30 }, johto: { '60': 5 } },
    activeQuests: [{ qid: 's11', cat: 'side', progress: 3 }, { qid: 's30', cat: 'side', progress: 2 }],
  };
  sb.G = g;
  sb.migrateQuestSaveV2();
  assert.equal(g.mainStep.kanto, 26, 'Kanto: index ≥ 21 shifted by +1 (Rocket Tower insertion)');
  assert.equal(g.mainStep.johto, 20, 'Johto: index unchanged (same order)');
  assert.equal(g.completedQuests['5'], true, 'old 1001 → new 5 (route 22 rival)');
  assert.equal(g.completedQuests['27'], true, 'old 8 → new 27 (Erika badge)');
  assert.equal(g.completedQuests['120'], true, 'old 60 → new 120 (Burned Tower 60)');
  assert.equal(g.completedQuests.side_s3, true, 'old s11 → new s3 (Viridian Guardian)');
  assert.equal(g.completedQuests.side_s24, true, 'old s30 → new s24 (Team Rocket in Mahogany)');
  assert.equal(g.questBaselines.kanto['21'], 12, 'old 7 → new 21 (Pokémon Tower grind)');
  assert.equal(g.questBaselines.kanto['19'], 30, 'old 46 → new 19 (route 10)');
  assert.equal(g.questBaselines.johto['120'], 5, 'remapped Johto baseline');
  assert.equal(g.activeQuests[0].qid, 's3', 'remapped active side instance');
  assert.equal(g.activeQuests[1].qid, 's24', 'remapped active side instance (Johto)');
  assert.equal(g._questIdMigrationV2, 2, 'marker set');
  // Idempotente
  sb.migrateQuestSaveV2();
  assert.equal(g.mainStep.kanto, 26, 'migration idempotente');
});

test('V2 migration: endgame preserved (all quests done)', () => {
  const g = { mainStep: { kanto: 43, johto: 26 }, completedQuests: {}, questBaselines: {}, activeQuests: [] };
  sb.G = g;
  sb.migrateQuestSaveV2();
  assert.equal(g.mainStep.kanto, 44, 'Kanto 43/43 (old end) → 44 (new complete chain)');
});

test('phase 20 — Johto special rewards: red Gyarados, Dratini, movie-3 boss', () => {
  const byId = {}; for (const q of STORY) byId[q.id] = q;
  assert.equal(byId[124].rewardPoke, 130, 'quest 124: Gyarados offered at the Lake of Rage');
  assert.equal(byId[124].rewardShiny, true, 'quest 124: forced shiny (the red Gyarados!)');
  assert.equal(byId[124].rewardLevel, 30, 'quest 124: Lv.30 (Lake of Rage canon)');
  assert.equal(byId[130].rewardPoke, 147, 'quest 130: Dratini from the dragon trial');
  assert.equal(byId[130].rewardLevel, 15, 'quest 130: Lv.15 (GS Dragon\'s Den canon)');
  assert.equal(byId[114].type, 'trainer_battle', 'quest 114: scripted boss');
  assert.equal(byId[114].battleId, 'johto_film3_entei', 'quest 114: Entei/Unown — Spell of the Unown');
});

test('V3 save migration: Johto 101-126 → 101-140 (phase 20), idempotent', () => {
  const g = {
    mainStep: { kanto: 30, johto: 20 }, // 20 = old index (id 121) → must re-point to the same quest (id 135)
    completedQuests: { '110': true, '121': true, '8': true, side_s3: true },
    questBaselines: { kanto: { '21': 12 }, johto: { '121': 9, '60': 5 } },
    activeQuests: [{ qid: 121, cat: 'main', progress: 3 }, { qid: 's3', cat: 'side', progress: 2 }],
  };
  sb.G = g;
  sb.migrateQuestSaveV3();
  assert.equal(g.mainStep.kanto, 30, 'Kanto: unchanged (V3 only touches Johto)');
  assert.equal(g.mainStep.johto, 34, 'old index 20 (id 121) → index 34 (same quest, id 135)');
  assert.equal(g.completedQuests['116'], true, 'old 110 → new 116');
  assert.equal(g.completedQuests['135'], true, 'old 121 → new 135');
  assert.equal(g.completedQuests['110'], undefined, 'old key removed');
  assert.equal(g.completedQuests['8'], true, 'Kanto key passthrough');
  assert.equal(g.completedQuests.side_s3, true, 'side key passthrough');
  assert.equal(g.questBaselines.johto['135'], 9, 'remapped Johto baseline');
  assert.equal(g.questBaselines.johto['60'], 5, 'key outside 101-126 unchanged');
  assert.equal(g.questBaselines.kanto['21'], 12, 'baselines Kanto intactes');
  assert.equal(g.activeQuests[0].qid, 135, 'remapped active main instance');
  assert.equal(g.activeQuests[1].qid, 's3', 'secondary instance unchanged');
  assert.equal(g._questIdMigrationV3, 3, 'marker set');
  sb.migrateQuestSaveV3();
  assert.equal(g.mainStep.johto, 34, 'migration idempotente');
});

test('V3 migration: Johto endgame preserved (26/26 old → complete chain)', () => {
  const g = { mainStep: { kanto: 44, johto: 26 }, completedQuests: {}, questBaselines: {}, activeQuests: [] };
  sb.G = g;
  sb.migrateQuestSaveV3();
  assert.equal(g.mainStep.johto, 40, '26/26 old quests → 40 (new complete chain)');
});

test('NPC: data and locations strictly parallel (every entry has name + FR/EN lines)', () => {
  // Phase 20 regression: getNpc(loc, idx) returns {name:'', lines:[]} when
  // the index does not exist → a ghost "NPC n" with no dialogue (location-info.js
  // buttons, map-render.js quest node). Latent bug unnoticed in Olivine
  // (phase 19): now locked down by a test.
  const locSb = { window: {}, console };
  locSb.window = locSb;
  vm.createContext(locSb);
  vm.runInContext(harnessBundleSource(['src/localization/fr/npc.js', 'src/localization/en/npc.js']), locSb, { filename: 'npc-locales [iife]' });
  const fr = locSb.window.L_fr_npc, en = locSb.window.L_en_npc;
  assert.ok(fr && en, 'NPC dictionaries FR/EN loaded');
  for (const [loc, list] of Object.entries(sb.NPCS)) {
    assert.ok(fr[loc], `FR: location '${loc}' present in fr/npc.js`);
    assert.ok(en[loc], `EN: location '${loc}' present in en/npc.js`);
    assert.equal(fr[loc].length, list.length, `FR '${loc}': ${list.length} entry(ies) as npc-data`);
    assert.equal(en[loc].length, list.length, `EN '${loc}': ${list.length} entry(ies) as npc-data`);
    list.forEach((npc, i) => {
      assert.ok(fr[loc][i].name && Array.isArray(fr[loc][i].lines) && fr[loc][i].lines.length, `FR '${loc}'[${i}] : nom + lignes`);
      assert.ok(en[loc][i].name && Array.isArray(en[loc][i].lines) && en[loc][i].lines.length, `EN '${loc}'[${i}] : nom + lignes`);
    });
  }
  for (const loc of Object.keys(fr)) assert.ok(sb.NPCS[loc], `FR location '${loc}' exists on the data side`);
  for (const loc of Object.keys(en)) assert.ok(sb.NPCS[loc], `EN location '${loc}' exists on the data side`);
});

test('phase 21 — Kanto special rewards: Eevee, Porygon, Lapras, Tyrogue (Dojo), Aerodactyl', () => {
  const byId = {}; for (const q of kanto) byId[q.id] = q;
  assert.equal(byId[31].rewardPoke, 133, 'quest 31: Eevee from Celadon Mansion');
  assert.equal(byId[31].rewardLevel, 25, 'quest 31: Lv.25 (FRLG canon)');
  assert.equal(byId[32].rewardPoke, 137, 'quest 32: Game Corner Porygon');
  assert.equal(byId[32].rewardLevel, 20, 'quest 32: Lv.20');
  assert.equal(byId[39].rewardPoke, 131, 'quest 39: Silph Lapras');
  assert.equal(byId[39].rewardLevel, 25, 'quest 39: Lv.25 (FRLG canon: Silph employee)');
  assert.equal(byId[40].type, 'trainer_battle', 'quest 40: the Dojo is a scripted battle');
  assert.equal(byId[40].battleId, 'kanto_dojo_master', 'quest 40: Karate King (Koichi, FRLG)');
  assert.equal(byId[40].rewardPoke, 236, 'quest 40: gift = Tyrogue (hitmonlee OR hitmonchan path)');
  assert.equal(byId[40].rewardLevel, 25, 'quest 40: Lv.25 (FRLG gift canon)');
  assert.equal(byId[47].rewardPoke, 142, 'quest 47: Aerodactyl from the Cinnabar lab');
  assert.equal(byId[47].rewardLevel, 30, 'quest 47: Lv.30');
  const dojo = sb.OFFICIAL_TEAMS.kanto_dojo_master;
  assert.ok(dojo, 'kanto_dojo_master team defined');
  assert.equal(dojo.team.length, 2, 'Dojo : 2 Pokémon (canon Koichi)');
  const species = Array.from(dojo.team, (p) => p.id);
  assert.deepEqual(species, [106, 107], 'Kicklee puis Tygnon (canon FRLG)');
  assert.ok(dojo.team.every((p) => p.level === 37), 'niveaux 37 (canon FRLG)');
  assert.ok(dojo.team.every((p) => p.item === 'black_belt'), 'Black Belt held by both (FRLG canon)');
});

test('V4 save migration: Kanto 1-44 → 1-60 + Johto sides s14-s38 → s31-s55, idempotent', () => {
  const g = {
    mainStep: { kanto: 20, johto: 10 }, // index 20 (0-based) = 21st quest (id 21, Pokémon Tower) → id 25, index 24
    completedQuests: { '20': true, '21': true, '44': true, '104': true, side_s3: true, side_s20: true },
    questBaselines: { kanto: { '21': 45, '32': 3 }, johto: { '121': 9 } },
    activeQuests: [{ qid: 21, cat: 'main', progress: 12 }, { qid: 's20', cat: 'side', progress: 4 }, { qid: 's3', cat: 'side', progress: 1 }],
  };
  sb.G = g;
  sb.migrateQuestSaveV4();
  assert.equal(g.mainStep.kanto, 24, 'old index 20 (id 21) → index 24 (same quest, id 25)');
  assert.equal(g.mainStep.johto, 10, 'Johto: unchanged (V4 only touches Kanto)');
  assert.equal(g.completedQuests['23'], true, 'old 20 → new 23 (shifty cave offset)');
  assert.equal(g.completedQuests['25'], true, 'old 21 → new 25 (Pokémon Tower grind)');
  assert.equal(g.completedQuests['60'], true, 'old 44 → new 60 (Mew at the Safari Park)');
  assert.equal(g.completedQuests['104'], true, 'id Johto passthrough');
  assert.equal(g.completedQuests.side_s3, true, 'Kanto side (s1-s13) unchanged');
  assert.equal(g.completedQuests.side_s37, true, 'old side_s20 (Johto) → new side_s37');
  assert.equal(g.completedQuests.side_s20, undefined, 'old Johto side key removed');
  assert.equal(g.questBaselines.kanto['25'], 45, 'remapped Kanto baseline (21 → 25)');
  assert.equal(g.questBaselines.kanto['43'], 3, 'remapped Kanto baseline (32 → 43)');
  assert.equal(g.questBaselines.johto['121'], 9, 'Johto baselines unchanged');
  assert.equal(g.activeQuests[0].qid, 25, 'remapped active Kanto main instance (21 → 25)');
  assert.equal(g.activeQuests[1].qid, 's37', 'remapped active Johto side instance (s20 → s37)');
  assert.equal(g.activeQuests[2].qid, 's3', 'secondary Kanto instance unchanged');
  assert.equal(g._questIdMigrationV4, 4, 'marker set');
  sb.migrateQuestSaveV4();
  assert.equal(g.mainStep.kanto, 24, 'migration idempotente');
  assert.equal(g.completedQuests['60'], true, 'stable completions (no double remap)');
});

test('V4 migration: Kanto endgame preserved (44/44 old → complete chain)', () => {
  const g = { mainStep: { kanto: 44, johto: 40 }, completedQuests: {}, questBaselines: {}, activeQuests: [] };
  sb.G = g;
  sb.migrateQuestSaveV4();
  assert.equal(g.mainStep.kanto, 60, '44/44 old quests → 60 (new complete chain)');
});

test('repeatables: pass 21 adds targeted Kanto ones, region-filtered, FR/EN texts synced', () => {
  const RQ = sb.REPEATABLE_QUESTS;
  const byId = {}; for (const q of RQ) byId[q.id] = q;
  for (let i = 7; i <= 14; i++) assert.ok(byId['r' + i], `repeatable r${i} exists`);
  assert.equal(byId.r7.loc, 'viridianforest', 'r7: Viridian Forest (Kanto)');
  assert.equal(byId.r14.loc, 'victoryroad', 'r14 : Route Victoire (Kanto)');
  assert.equal(byId.r9.type, 'catch', 'r9 : type capture');
  assert.equal(byId.r13.type, 'mine_sell', 'r13: treasure-selling type');
  // Every repeatable has FR/EN texts with the right amount.
  const loc2 = { window: {}, console };
  loc2.window = loc2;
  vm.createContext(loc2);
  vm.runInContext(harnessBundleSource(['src/localization/fr/quests.js', 'src/localization/en/quests.js']), loc2, { filename: 'locales-2 [iife]' });
  const strip = (s) => String(s).replace(/[^0-9]/g, '');
  for (const q of RQ) {
    for (const [lang, dict] of [['fr', loc2.window.L_fr_quests], ['en', loc2.window.L_en_quests]]) {
      const node = dict.repeatable[q.id];
      assert.ok(node && node.title && node.desc && node.rewardDesc, `${lang} repeatable ${q.id}: complete text`);
      assert.ok(strip(node.rewardDesc).startsWith(String(q.rewardMoney)), `${lang} repeatable ${q.id}: amount ${q.rewardMoney} in "${node.rewardDesc}"`);
    }
  }
});

