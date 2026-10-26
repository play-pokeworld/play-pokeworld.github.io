/**
 * @file Atoll.test.js
 * @brief Comprehensive test suite for Phase 2.2: Battle Atoll mechanics, 12h rotations,
 * legendary bans, curated sets, Factory rental runs, Shop, and UI modals.
 */

import { describe, assert } from './TestRunner.js';
import { installFakeDom } from './FakeDom.js';
import { EventBus } from '../src/core/EventBus.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { BonusSystem } from '../src/systems/BonusSystem.js';
import { BonusTypes } from '../src/config/BonusRules.js';
import { ModalIds } from '../src/config/ModalIds.js';
import { RoamingRotationTickEvent } from '../src/core/events/RoamingRotationTickEvent.js';
import { PokemonDB } from '../src/data/pokemon/PokemonDB.js';
import { MoveDB } from '../src/data/battle/MoveDB.js';
import { TalentDB } from '../src/data/pokemon/TalentDB.js';
import { ItemDB } from '../src/data/items/ItemDB.js';
import { PokemonData } from '../src/data/pokemon/PokemonData.js';
import {
  AtollDB,
  ATOLL_ROTATION_MS,
  ATOLL_TEAMS_PER_CYCLE,
  ATOLL_RANK_SEQUENCE,
  ATOLL_FACTORY_STREAK_BONUS,
  ATOLL_STAT_PROFILES,
  ATOLL_SETS,
  ATOLL_LEGENDARIES,
  ATOLL_BAN_RULES,
  ATOLL_MODES,
  ATOLL_SHOP,
  LEGEND_FRAGMENT_COST,
  ATOLL_FRAGMENTS_PER_BOSS,
  getRotationWindow,
  getRotationTimeLeftMs,
  formatRotationCountdown,
  getAtollCycleInfo,
  getAtollBannedLegendaries,
  getAtollSpeciesList,
  getAtollRotationTeams,
  buildFallbackSetSpec,
  getAtollSetSpec,
  buildAtollPoke,
  buildAtollTeam,
  reorganizeAtollFactoryTeam,
  computeAtollFactoryReward
} from '../src/data/atoll/AtollDB.js';
import { AtollData } from '../src/data/save/AtollData.js';
import { AtollSystem } from '../src/systems/AtollSystem.js';
import { AtollFullscreenPanel } from '../src/panels/fullscreen/AtollFullscreenPanel.js';
import { AtollFactoryPrepModal } from '../src/panels/AtollFactoryPrepModal.js';

const HALF = 12 * 3600 * 1000;
const ALL_MODES = Object.keys(ATOLL_MODES);

describe('Battle Atoll — Rotations, Curated Sets, and Determinism', (test) => {
  test('12 h rotation: windows, remaining time, timer format, cycle info', () => {
    assert.equal(getRotationWindow(0), 0);
    assert.equal(getRotationWindow(HALF - 1), 0);
    assert.equal(getRotationWindow(HALF), 1);
    assert.equal(getRotationWindow(123 * HALF + 7), 123);

    assert.equal(getRotationTimeLeftMs(5 * HALF), HALF);
    assert.equal(getRotationTimeLeftMs(5 * HALF + 3600_000), HALF - 3600_000);

    assert.equal(formatRotationCountdown(HALF), '12:00:00');
    assert.equal(formatRotationCountdown(3 * 3600_000 + 5 * 60_000 + 7000), '03:05:07');

    const c1 = getAtollCycleInfo(0);
    assert.deepEqual([c1.team, c1.day], [1, 1]);
    const c2 = getAtollCycleInfo(5);
    assert.deepEqual([c2.team, c2.day], [6, 3]); // 6th window = day 3
    const c3 = getAtollCycleInfo(6);
    assert.deepEqual([c3.team, c3.day], [1, 1]); // new cycle
  });

  test('determinism: same window yields same team; dated seed re-arms on new cycle', () => {
    for (const mk of ALL_MODES) {
      const a = getAtollSpeciesList(mk, 40, 'enemy').join(',');
      const b = getAtollSpeciesList(mk, 40, 'enemy').join(',');
      assert.equal(a, b, `${mk}: reproducible team at fixed window`);
      assert.ok(a.length > 0, `${mk}: non-empty team`);
    }

    // 6 distinct teams in a cycle
    for (const mk of ['tower_c', 'tower_a', 'tower_s', 'factory_a', 'dome_final']) {
      const cyc = getAtollRotationTeams(mk, 40, 'enemy').map((arr) => arr.join(','));
      assert.equal(cyc.length, 6, `${mk}: 6 teams per cycle`);
      assert.equal(new Set(cyc).size, 6, `${mk}: 6 distinct teams in the cycle`);

      const base = 36;
      assert.equal(getAtollSpeciesList(mk, base + 6, 'enemy').join(','), getAtollSpeciesList(mk, base + 6, 'enemy').join(','));
      assert.notEqual(getAtollSpeciesList(mk, base, 'enemy').join(','), getAtollSpeciesList(mk, base + 6, 'enemy').join(','), `${mk}: dated seed re-armed on new cycle`);
    }
  });

  test('teams: mode size, pool species, no duplicates', () => {
    for (const mk of ALL_MODES) {
      const mode = ATOLL_MODES[mk];
      for (let w = 36; w < 36 + 6; w++) {
        const ids = getAtollSpeciesList(mk, w, 'enemy');
        assert.equal(ids.length, Math.min(mode.size, mode.pool.length), `${mk}@${w}: size matches`);
        assert.equal(new Set(ids).size, ids.length, `${mk}@${w}: no duplicates`);
        for (const id of ids) {
          assert.ok(mode.pool.includes(id), `${mk}@${w}: species ${id} in pool`);
        }
      }
    }
  });

  test('legendary bans: never banned from all modes at once, refuge in tower_free', () => {
    assert.ok(ATOLL_LEGENDARIES.length >= 11, 'at least 11 legendaries defined');
    const seen = new Set();

    for (let w = 36; w < 36 + 48; w++) {
      const ts = getAtollBannedLegendaries('tower_s', w);
      const df = getAtollBannedLegendaries('dome_final', w);
      const tf = getAtollBannedLegendaries('tower_free', w);

      assert.equal(tf.length, 0, 'tower_free: never any bans (haven)');
      assert.equal(ts.length, 4, `tower_s@${w}: exactly 4 bans`);
      assert.equal(df.length, 3, `dome_final@${w}: exactly 3 bans`);

      for (const l of [...ts, ...df]) {
        assert.ok(ATOLL_LEGENDARIES.includes(l), `ban ${l} is in ATOLL_LEGENDARIES`);
      }

      // No legendary banned everywhere at once
      for (const l of ATOLL_LEGENDARIES) {
        const everywhere = ts.includes(l) && df.includes(l) && tf.includes(l);
        assert.ok(!everywhere, `window ${w}: ${l} banned everywhere!`);
      }

      // Opposing team never contains a banned legendary
      const enemyS = getAtollSpeciesList('tower_s', w, 'enemy');
      for (const l of ts) {
        assert.ok(!enemyS.includes(l), `tower_s@${w} opponent does not contain banned ${l}`);
      }

      seen.add(ts.join(','));
    }
    assert.ok(seen.size >= 20, `varied bans across 48 windows (got ${seen.size})`);
  });

  test('curated sets: complete legitimacy (pool coverage, moves, abilities, items, budgets <= 36)', () => {
    const sum = (o) => Object.values(o || {}).reduce((a, b) => a + b, 0);
    const lowOnly = new Set([...ATOLL_MODES.tower_e.pool, ...ATOLL_MODES.tower_d.pool]);
    const allPools = new Set();
    for (const mk of ALL_MODES) {
      for (const id of ATOLL_MODES[mk].pool) allPools.add(id);
    }

    const moveDb = MoveDB.getInstance();
    const talentDb = TalentDB.getInstance();
    const itemDb = ItemDB.getInstance();
    const pokeDb = PokemonDB.getInstance();

    for (const id of allPools) {
      if (lowOnly.has(id)) continue;
      assert.ok(ATOLL_SETS[id], `species dex ${id} (rank C+) must have curated set`);
    }

    for (const [idStr, set] of Object.entries(ATOLL_SETS)) {
      const id = Number(idStr);
      const [talent, item, moves, prof] = set;
      const label = `atoll#${id}`;

      assert.ok(Array.isArray(moves) && moves.length >= 1 && moves.length <= 4, `${label}: 1-4 moves`);
      for (const mv of moves) {
        assert.ok(moveDb.has(mv), `${label}: move ${mv} exists`);
      }

      const species = pokeDb.getByDex(id);
      assert.ok(species, `${label}: species exists`);
      assert.ok(talentDb.has(talent), `${label}: talent ${talent} exists`);
      assert.ok(species.talents.includes(talent) || species.hiddenTalent === talent, `${label}: talent ${talent} legal on species`);

      if (item) {
        assert.ok(itemDb.has(item), `${label}: item ${item} exists`);
      }

      const p = ATOLL_STAT_PROFILES[prof];
      assert.ok(p, `${label}: profile ${prof} exists`);
      assert.ok(sum(p.ivs) <= 36 && sum(p.evs) <= 36, `${label}: budgets <= 36`);
    }
  });

  test('buildAtollTeam: creates compliant and deterministic PokemonData team', () => {
    const team = buildAtollTeam('tower_a', 40);
    assert.equal(team.length, 6);

    for (const p of team) {
      assert.equal(p.level, 100, 'level 100');
      assert.ok(p.moves.length >= 1 && p.moves.length <= 4);
      assert.equal(p.hp, p.getMaxHp(), 'full HP at spawn');
      assert.ok(p.getDisplayName().length > 0);
    }

    const again = buildAtollTeam('tower_a', 40).map((p) => `${p.species}:${p.moves.join(',')}`).join('|');
    const first = team.map((p) => `${p.species}:${p.moves.join(',')}`).join('|');
    assert.equal(first, again, 'deterministic generation');
  });

  test('E/D rank fallback: legal generated sets, deterministic, no item', () => {
    for (const mk of ['tower_e', 'tower_d']) {
      const team = buildAtollTeam(mk, 41);
      assert.ok(team.length >= 4, `${mk}: complete team`);

      for (const p of team) {
        assert.equal(p.level, 100);
        assert.ok(p.moves.length >= 1);
        assert.equal(p.heldItem, null, 'no held item on low rank');
      }

      const a = team.map((p) => p.species).join(',');
      const b = buildAtollTeam(mk, 41).map((p) => p.species).join(',');
      assert.equal(a, b, `${mk}: reproducible fallback generation`);
    }
  });
});

describe('Battle Atoll — Factory Rental Runs and Lifecycle', (test) => {
  test('factory: creation, streak progression, and forfeiture', () => {
    const save = SaveSystem.getInstance().createNewSave('Factory Tester', 'squirtle');
    const atollSys = AtollSystem.getInstance();

    const run = atollSys.createFactoryRun('factory_c', 40, save);
    assert.equal(run.modeKey, 'factory_c');
    assert.equal(run.streak, 0);
    assert.equal(run.team.length, ATOLL_MODES.factory_c.size);

    assert.equal(atollSys.getFactoryRun(save), run);

    atollSys.swapFactoryPokemon(0, 1, save);
    assert.notEqual(run.team[0].species, run.team[1].species);

    atollSys.abandonFactoryRun(save);
    assert.equal(atollSys.getFactoryRun(save), null, 'run is cleared after abandonment');
  });

  test('factory: victory full heal and forced reorganization (order AND moves)', () => {
    const atollSys = AtollSystem.getInstance();
    const team = buildAtollTeam('factory_a', 40, 'rental');
    team[0].hp = 1;

    const beforeSig = JSON.stringify(team.map((p) => [p.species, p.moves]));
    const reorganized = reorganizeAtollFactoryTeam(team, 40, 1);

    assert.equal(reorganized.length, team.length);
    for (const p of reorganized) {
      assert.equal(p.hp, p.getMaxHp(), 'HP fully restored');
    }

    const afterSig = JSON.stringify(reorganized.map((p) => [p.species, p.moves]));
    assert.notEqual(beforeSig, afterSig, 'guaranteed visible reordering');

    // Deterministic given same seed and streak
    const freshTeam = buildAtollTeam('factory_a', 40, 'rental');
    const reorganized2 = reorganizeAtollFactoryTeam(freshTeam, 40, 1);
    assert.equal(
      JSON.stringify(reorganized.map((p) => [p.species, p.moves])),
      JSON.stringify(reorganized2.map((p) => [p.species, p.moves])),
      'reproducible reordering'
    );
  });

  test('factory: tier reward bonus (+25% per tier, rounded)', () => {
    assert.equal(computeAtollFactoryReward(22, 0), 22);
    assert.equal(computeAtollFactoryReward(22, 1), 28); // 27.5 -> 28
    assert.equal(computeAtollFactoryReward(22, 2), 33);
    assert.equal(computeAtollFactoryReward(42, 4), 84); // x2 at tier 4
  });

  test('reorganization: anti-identity guarantee on minimal teams', () => {
    for (let streak = 1; streak <= 40; streak++) {
      const t = [
        new PokemonData({ uid: '1', species: 'alakazam', level: 100, moves: ['psychic', 'calm_mind'], hp: 50 }),
        new PokemonData({ uid: '2', species: 'gengar', level: 100, moves: ['shadow_ball', 'toxic'], hp: 50 })
      ];
      const before = JSON.stringify(t.map((p) => [p.species, p.moves]));
      const out = reorganizeAtollFactoryTeam(t, 7, streak);
      assert.notEqual(JSON.stringify(out.map((p) => [p.species, p.moves])), before, `streak ${streak}: guaranteed change`);
    }
  });
});

describe('Battle Atoll — Save Model, Shop, and Legend Fragments', (test) => {
  test('AtollData model: default state, tokens, records, and serialization', () => {
    const data = new AtollData();
    assert.equal(data.tokens, 0);
    assert.equal(data.streak, 0);
    assert.equal(data.bestStreak, 0);
    assert.deepEqual(data.winsByMode, {});
    assert.equal(data.factoryRun, null);
    assert.equal(data.fragments, 0);

    data.addTokens(100);
    assert.equal(data.tokens, 100);
    assert.ok(data.spendTokens(30));
    assert.equal(data.tokens, 70);
    assert.ok(!data.spendTokens(100), 'cannot spend more than owned');

    data.recordWin('tower_c');
    assert.equal(data.streak, 1);
    assert.equal(data.bestStreak, 1);
    assert.equal(data.winsByMode.tower_c, 1);

    data.recordLoss();
    assert.equal(data.streak, 0);
    assert.equal(data.bestStreak, 1);

    data.addFragments(10);
    assert.equal(data.fragments, 10);
    assert.ok(data.spendFragments(5));
    assert.equal(data.fragments, 5);

    const serialized = data.serialize();
    const restored = new AtollData(serialized);
    assert.equal(restored.tokens, 70);
    assert.equal(restored.bestStreak, 1);
    assert.equal(restored.winsByMode.tower_c, 1);
    assert.equal(restored.fragments, 5);
  });

  test('AtollSystem shop: items, pricing, and purchase validation', () => {
    const save = SaveSystem.getInstance().createNewSave('Shop Tester', 'bulbasaur');
    const atollSys = AtollSystem.getInstance();

    const offers = atollSys.getShopOffers(save);
    assert.equal(offers.length, 4);
    assert.ok(offers.every((o) => !o.affordable), 'initially unaffordable with 0 tokens');

    save.atoll.addTokens(500);
    const updated = atollSys.getShopOffers(save);
    assert.ok(updated.some((o) => o.affordable));

    assert.ok(atollSys.buyItem('rarecandy', save));
    assert.equal(save.inventory.count('rarecandy'), 1);
    assert.equal(save.atoll.tokens, 500 - 25);
    assert.equal(save.achievements.getStat('atoll_tokens_spent'), 25);
  });

  test('Legend fragments: gain, summoning choices, and summoning flow', () => {
    const save = SaveSystem.getInstance().createNewSave('Fragments Tester', 'charmander');
    const atollSys = AtollSystem.getInstance();

    atollSys.gainFragments(50, 'test', save);
    assert.equal(save.atoll.fragments, 50);

    const choices = atollSys.getFragmentLegendaryChoices(save);
    assert.ok(choices.includes(150), 'Mewtwo included in Kanto choices');

    assert.ok(atollSys.canSummon(save));
    // Calling summon deducts 50 and sets pending
    assert.ok(atollSys.summon(150, save));
    assert.equal(save.atoll.fragments, 0);
    assert.equal(save.atoll.pendingFragmentLegendary, 150);

    atollSys.completeFragmentLegendary(150, save);
    assert.equal(save.atoll.pendingFragmentLegendary, 0);
  });
});

describe('Battle Atoll — UI Modals and Access Gates', (test) => {
  test('AtollFullscreenPanel: renders locked state when league not won', () => {
    installFakeDom();
    const save = SaveSystem.getInstance().createNewSave('Locked Tester', 'squirtle');
    SaveSystem.getInstance().setCurrentSave(save);

    const panel = new AtollFullscreenPanel();
    panel.open();

    const text = panel.getDomElement().textContent;
    assert.ok(text.includes('Atoll') || text.includes('Ligue'), 'displays locked explanation');
    assert.equal(panel.getDomElement().querySelector('.pw-badges-tabs'), null, 'tabs hidden when locked');

    panel.close();
    panel.destroy();
  });

  test('AtollFullscreenPanel: unlocked panel renders tabs, hero, and challenge grids', () => {
    installFakeDom();
    const save = SaveSystem.getInstance().createNewSave('Unlocked Tester', 'bulbasaur');
    save.statistics.recordLeague('kanto');
    save.atoll.addTokens(150);
    SaveSystem.getInstance().setCurrentSave(save);

    const panel = new AtollFullscreenPanel();
    panel.open();

    // Has tabs
    const tabBtns = panel.getDomElement().querySelector('.pw-badges-tabs')?.querySelectorAll('.pw-button') || [];
    assert.equal(tabBtns.length, 6, 'all 6 navigation tabs rendered');

    // Home hub cards
    const homeCards = panel.getDomElement().querySelectorAll('.pw-atoll-home-card');
    assert.equal(homeCards.length, 4, '4 discipline hub cards on menu tab');

    // Live countdown update via RoamingRotationTickEvent
    EventBus.getInstance().dispatch(new RoamingRotationTickEvent(Date.now()));

    // Switch to Tower tab
    tabBtns[1].click();
    assert.ok(panel.getDomElement().querySelector('.pw-atoll-timer-chip'), 'rotation timer chip rendered on tower tab');
    assert.ok(panel.getDomElement().querySelectorAll('.pw-atoll-mode-card').length >= 6, 'tower modes rendered');

    // Switch to Shop tab with fresh buttons from re-render
    const freshTabs = panel.getDomElement().querySelector('.pw-badges-tabs')?.querySelectorAll('.pw-button') || [];
    freshTabs[5].click();
    assert.equal(panel.getDomElement().querySelectorAll('.pw-atoll-shop-card').length, 4, '4 shop cards rendered');

    panel.close();
    panel.destroy();
  });

  test('AtollFactoryPrepModal: reorders rental Pokémon and moves', () => {
    installFakeDom();
    const save = SaveSystem.getInstance().createNewSave('Prep Tester', 'charmander');
    save.statistics.recordLeague('kanto');
    SaveSystem.getInstance().setCurrentSave(save);

    const atollSys = AtollSystem.getInstance();
    atollSys.createFactoryRun('factory_c', 40, save);

    const modal = new AtollFactoryPrepModal();
    modal.open();

    const cards = modal.getDomElement().querySelectorAll('.pw-team-modal-card');
    assert.equal(cards.length, ATOLL_MODES.factory_c.size, 'renders rental team cards');

    // Reorder buttons exist
    const btnGroups = modal.getDomElement().querySelectorAll('.pw-btn-group');
    assert.ok(btnGroups.length > 0, 'reorder button groups present');
    const buttons = modal.getDomElement().querySelectorAll('.pw-button');
    assert.ok(buttons.length > 0, 'reorder buttons present');

    modal.close();
    modal.destroy();
  });
});
