import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';

// ── V7 · P0a · BUG-01 — `startLegendaryEncounter` ──────────────────────────
// Before the fix the function referenced `enemy`, a variable that exists
// nowhere → ReferenceError on EVERY legendary encounter: Kanto main quest #31
// (Snorlax), every `rewardPoke` quest (Kanto 11, Johto 8), Lugia / Ho-Oh,
// Regi puzzles… The Johto dex could never reach 100 % and Hoenn stayed locked.
// These tests pin the repaired contract (ROAD_MAP_V7 §2, BUG-01).

const SANDBOX_FILES = [
  'src/data/moves.js', 'src/data/pd-data.js', 'src/data/items-data.js', 'src/data/items-helpers.js',
  'src/data/poke-talents.js',
  'src/data/locations-data.js', 'src/data/locations-johto.js', 'src/data/game-helpers.js',
  'src/application/world/team.js', 'src/application/pokemon-factory.js',
  'src/data/champions-data.js', 'src/data/official-teams-data.js',
  'src/data/story-quests.js', 'src/data/side-quests-data.js', 'src/data/npc-data.js',
  'src/data/repeatable-quests-data.js',
  'src/data/trainer-sprites-data.js', 'src/application/quests/quest-core.js',
  'src/application/combat/battle-encounter.js',
];

function makeSandbox({ shinyRoll = false } = {}) {
  const logs = [];
  const notifications = [];
  const battle = { active: false };
  const sandbox = {
    console, window: {},
    G: {
      team: [], teamSlotItems: [], collection: {}, hatchery: [], inventory: {}, unlockedTalents: {},
      lang: 'fr', region: 'kanto', badges: [], activeQuests: [], repeatables: [], questTrainerWins: {},
      mainStep: { kanto: 0, johto: 0 }, mainProgress: { kanto: 0, johto: 0 }, wildWinsByLoc: {}, visitedMaps: {},
      completedQuests: {}, money: 0,
    },
    PokeWorldCore: { randomInt: (a) => a, chancePercent: () => false, clamp: (v, a, b) => Math.max(a, Math.min(b, v)) },
    rand: () => 0.5, chance: () => false,
    rollShiny: () => shinyRoll,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    t: (k) => k, tr: (k, p) => `${k}:${JSON.stringify(p || {})}`, getPokeName: (id) => 'P' + id,
    notify: (m) => notifications.push(String(m)), saveGame: () => {}, autoSave: () => {}, setMsg: (m) => notifications.push(String(m)),
    updateHeader: () => {}, addToInventory: () => {}, grantRewardItems: () => {},
    addBattleLog: (m) => logs.push(String(m)),
    battle,
    // Minimal battle bootstrap: what startBattle() guarantees for its callers.
    startBattle: (enemy) => { battle.active = true; battle.enemy = enemy; battle.legendaryQuest = false; battle.questGift = false; }, // V7 · LEG-01
    endBattle: () => { battle.active = false; battle.enemy = null; },
    EventBus: { on: () => {}, emit: () => {} }, EVENTS: { WILD_DEFEATED: 'a', POKEMON_CAUGHT: 'b', MINE_SELL: 'c', BADGE_EARNED: 'd', LEAGUE_WON: 'e' },
    POKE_NAMES_EN: {}, POKE_NAMES_FR: {},
    __logs: logs, __notifications: notifications,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const f of SANDBOX_FILES) {
    vm.runInContext(harnessBundleSource([f]), sandbox, { filename: f });
  }
  // One healthy team member: the encounter refuses an empty team.
  sandbox.G.team.push(sandbox.createPoke(25, 30, false));
  return sandbox;
}

test('BUG-01 — startLegendaryEncounter(144, 65, {shiny:false}) starts the battle (no ReferenceError)', () => {
  const sb = makeSandbox();
  const ok = sb.startLegendaryEncounter(144, 65, { shiny: false });
  assert.equal(ok, true);
  assert.equal(sb.battle.active, true);
  // V7 · LEG-01 (D13) — plus de capture forcée : sans option, ni legendaryQuest ni questGift.
  assert.equal(sb.battle.legendaryCatch, undefined);
  assert.equal(sb.battle.legendaryQuest, false);
  assert.equal(sb.battle.questGift, false);
  assert.equal(sb.battle.chill, false);
  assert.equal(sb.battle.noAutoCatch, false);
  const enemy = sb.battle.enemy;
  assert.equal(enemy.id, 144);
  assert.equal(enemy.level, 65);
  assert.equal(enemy.shiny, false);
  // Legendary HP boost ×2.2, current HP full.
  const ref = sb.createPoke(144, 65, false);
  assert.equal(enemy.maxHP, Math.floor(ref.maxHP * 2.2));
  assert.equal(enemy.currentHP, enemy.maxHP);
  assert.ok(sb.__logs.some((l) => l.startsWith('wild_legendary_appeared')));
});

test('BUG-01 — forced shiny (Red Gyarados contract) flags the created Pokémon, not a phantom `enemy`', () => {
  const sb = makeSandbox();
  assert.equal(sb.startLegendaryEncounter(130, 30, { shiny: true }), true);
  const enemy = sb.battle.enemy;
  assert.equal(enemy.shiny, true);
  assert.equal(enemy.shinyActive, true);
  assert.equal(enemy.shinyUnlocked, true);
});

test('BUG-01 — the random shiny roll targets the species id and applies the three flags', () => {
  const sb = makeSandbox({ shinyRoll: true });
  assert.equal(sb.startLegendaryEncounter(150, 70), true);
  const enemy = sb.battle.enemy;
  assert.equal(enemy.id, 150);
  assert.equal(enemy.shiny, true);
  assert.equal(enemy.shinyActive, true);
  assert.equal(enemy.shinyUnlocked, true);
});

test('BUG-01 — guards: empty team / battle already running return false without throwing', () => {
  const sb = makeSandbox();
  sb.G.team.length = 0;
  assert.equal(sb.startLegendaryEncounter(144, 65), false);
  sb.G.team.push(sb.createPoke(25, 30, false));
  sb.battle.active = true;
  assert.equal(sb.startLegendaryEncounter(144, 65), false);
});

test('BUG-01 — claimQuest(31, "main") (Poké Flute → Snorlax) launches the reward encounter', () => {
  const sb = makeSandbox();
  sb.G.inventory.pokeflute = 1;
  // Position the Kanto main chain on quest #31 (syncActiveMain derives the
  // active main quest from G.mainStep), exactly like a real save would be.
  sb.ensureQuestState(); // runs the save migrations once on the fresh state
  const idx = sb.getRegionChain('kanto').findIndex((q) => q.id === 31);
  assert.ok(idx >= 0, 'quest #31 belongs to the Kanto chain');
  sb.G.mainStep.kanto = idx;
  sb.syncActiveMain();
  assert.ok(sb.G.activeQuests.some((i) => i.cat === 'main' && Number(i.qid) === 31), 'quest #31 is active');
  sb.claimQuest(31, 'main');
  assert.equal(sb.battle.active, true, 'the reward battle must be running');
  assert.equal(sb.battle.enemy.id, 143, 'Snorlax is the reward Pokémon of quest #31');
  assert.equal(sb.battle.enemy.level, 30);
  assert.equal(sb.battle.questRewardQuestId, 31);
  assert.equal(sb.battle.questRewardCat, 'main');
  assert.equal(sb.battle.questRewardRegion, 'kanto');
  // The quest is NOT consumed yet: it is completed when the battle resolves.
  assert.equal(sb.G.completedQuests[31], undefined);
});

test('BUG-01 — every rewardPoke main quest (Kanto + Johto) can start its encounter', () => {
  const sb = makeSandbox();
  const defs = sb.STORY_QUESTS.filter((q) => q.rewardPoke);
  assert.ok(defs.length >= 15, `expected ≥ 15 rewardPoke quests, got ${defs.length}`);
  for (const def of defs) {
    sb.battle.active = false;
    const ok = sb.startLegendaryEncounter(def.rewardPoke, def.rewardLevel || 65, { shiny: !!def.rewardShiny });
    assert.equal(ok, true, `quest #${def.id} (#${def.rewardPoke}) must start`);
    assert.equal(sb.battle.enemy.id, def.rewardPoke);
    if (def.rewardShiny) assert.equal(sb.battle.enemy.shiny, true, `quest #${def.id} must force a shiny`);
  }
});
